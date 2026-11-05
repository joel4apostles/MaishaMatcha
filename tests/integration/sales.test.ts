import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";
import {
  advanceOrder,
  closeShift,
  createOrder,
  kitchenQueue,
  openShift,
  payOrder,
  type Actor,
} from "@/lib/pos/sales";
import { fingerprint } from "@/lib/pos/verifactu";
import { boot, staff } from "./harness";

/**
 * The counter's money path against Postgres: shifts, server pricing,
 * idempotent orders, cash, gap-free invoice numbers with an unbroken hash
 * chain under concurrency, the Z report and the kitchen queue.
 */
let payload: Payload;
let actor: Actor;
let ujiId: number;

const usucha = () => ({ menuItemId: ujiId, quantity: 1, modifierKeys: ["prep.usucha"] });

beforeAll(async () => {
  payload = await boot();
  await staff(payload, "owner@test.local", "owner", "Owner");
  const barista = await staff(payload, "sales-barista@test.local", "barista", "Lucía");
  const device = await payload.create({
    collection: "pos-devices",
    overrideAccess: true,
    data: { name: "Barra ventas", tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "0"), active: true },
  });
  actor = { staffId: barista.id, deviceId: device.id };
  ujiId = (await payload.find({ collection: "menu-items", where: { name: { equals: "Uji" } } })).docs[0].id;
  await payload.updateGlobal({ slug: "business", data: { nif: "B12345678", invoiceSeries: "T" } });
});

describe("shifts", () => {
  it("refuses to sell before a shift is open", async () => {
    const r = await createOrder(payload, actor, { lines: [usucha()], service: "here", idempotencyKey: randomUUID() });
    expect(r).toMatchObject({ ok: false, error: "no-shift" });
  });

  it("opens once per tablet", async () => {
    expect(await openShift(payload, actor, 10000)).toMatchObject({ ok: true });
    expect(await openShift(payload, actor, 10000)).toMatchObject({ ok: false, error: "shift-open" });
  });
});

describe("orders and payment", () => {
  it("prices on the server and returns the same order for a retried key", async () => {
    const key = randomUUID();
    const first = await createOrder(payload, actor, {
      lines: [{ menuItemId: ujiId, quantity: 2, modifierKeys: ["prep.latte", "leche.avena"], grams: 2.5 }],
      service: "takeaway",
      idempotencyKey: key,
    });
    expect(first).toMatchObject({ ok: true, totalCents: 2 * (880 + 140), duplicate: false });
    const again = await createOrder(payload, actor, { lines: [usucha()], service: "here", idempotencyKey: key });
    expect(again).toMatchObject({ ok: true, duplicate: true });
    if (first.ok && again.ok) expect(again.orderId).toBe(first.orderId);
  });

  it("refuses an order the carta does not allow", async () => {
    const r = await createOrder(payload, actor, {
      lines: [{ menuItemId: ujiId, quantity: 1, modifierKeys: [] }],
      service: "here",
      idempotencyKey: randomUUID(),
    });
    expect(r).toMatchObject({ ok: false, error: "missing-required" });
  });

  it("takes cash with change, issues an invoice, and never charges twice", async () => {
    const order = await createOrder(payload, actor, { lines: [usucha()], service: "here", idempotencyKey: randomUUID() });
    if (!order.ok) throw new Error(order.error);
    expect(await payOrder(payload, actor, { orderId: order.orderId, method: "cash", tenderedCents: 500 })).toMatchObject({
      ok: false,
      error: "short-cash",
    });
    const paid = await payOrder(payload, actor, { orderId: order.orderId, method: "cash", tenderedCents: 1000 });
    expect(paid).toMatchObject({ ok: true, changeCents: 120 });
    expect(await payOrder(payload, actor, { orderId: order.orderId, method: "card_terminal" })).toMatchObject({
      ok: false,
      error: "already-paid",
    });
  });

  it("keeps invoice numbers gap-free and the hash chain intact under parallel sales", async () => {
    const orders = await Promise.all(
      Array.from({ length: 10 }, () =>
        createOrder(payload, actor, { lines: [usucha()], service: "here", idempotencyKey: randomUUID() }),
      ),
    );
    const results = await Promise.all(
      orders.map((o) => (o.ok ? payOrder(payload, actor, { orderId: o.orderId, method: "card_terminal" }) : o)),
    );
    expect(results.every((r) => r.ok)).toBe(true);

    const { docs } = await payload.find({ collection: "invoices", sort: "number", limit: 100, depth: 0 });
    const numbers = docs.map((d) => d.number);
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
    for (let i = 0; i < docs.length; i++) {
      const prev = i === 0 ? null : docs[i - 1].hash;
      expect(docs[i].previousHash ?? null).toBe(prev);
      expect(docs[i].hash).toBe(
        fingerprint({
          issuerNif: docs[i].issuerNif!,
          fullNumber: docs[i].fullNumber,
          issuedAt: new Date(docs[i].issuedAt),
          type: docs[i].type,
          taxCents: docs[i].taxCents,
          totalCents: docs[i].totalCents,
          previousHash: prev,
          generatedAt: new Date(docs[i].issuedAt),
        }),
      );
    }
  });
});

describe("kitchen", () => {
  it("moves orders through the queue", async () => {
    const order = await createOrder(payload, actor, { lines: [usucha()], service: "here", idempotencyKey: randomUUID() });
    if (!order.ok) throw new Error(order.error);
    expect((await kitchenQueue(payload)).some((o) => o.id === order.orderId && o.status === "received")).toBe(true);
    await advanceOrder(payload, actor, order.orderId, "preparing");
    await advanceOrder(payload, actor, order.orderId, "ready");
    expect((await kitchenQueue(payload)).find((o) => o.id === order.orderId)?.status).toBe("ready");
    await advanceOrder(payload, actor, order.orderId, "collected");
    expect((await kitchenQueue(payload)).some((o) => o.id === order.orderId)).toBe(false);
  });
});

describe("closing", () => {
  it("expects float plus cash and audits any difference", async () => {
    const r = await closeShift(payload, actor, 10000 + 880 - 100);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.report.expectedCashCents).toBe(10000 + 880);
    expect(r.report.differenceCents).toBe(-100);
    expect(r.report.byMethod.card_terminal).toBe(10 * 880);
    const audit = await payload.find({ collection: "audit-log", where: { action: { equals: "shift.cash-difference" } } });
    expect(audit.totalDocs).toBe(1);
  });
});

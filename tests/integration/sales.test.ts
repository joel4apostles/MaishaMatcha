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

    // This file's series only: other test files share the database.
    const { docs } = await payload.find({ collection: "invoices", sort: "number", limit: 100, depth: 0, where: { series: { equals: "T" } } });
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

describe("refunds and voids", () => {
  let manager: { id: number };
  beforeAll(async () => {
    manager = await staff(payload, "sales-manager@test.local", "manager", "Marta", "6048");
    await payload.update({ collection: "users", id: actor.staffId, overrideAccess: true, data: { refundLimitCents: 300 } });
    await openShift(payload, actor, 5000);
  });

  async function paidOrder() {
    const o = await createOrder(payload, actor, { lines: [usucha()], service: "here", idempotencyKey: randomUUID() });
    if (!o.ok) throw new Error(o.error);
    const p = await payOrder(payload, actor, { orderId: o.orderId, method: "cash", tenderedCents: 1000 });
    if (!p.ok) throw new Error(p.error);
    return o.orderId;
  }

  it("voids only unpaid orders, with a reason", async () => {
    const o = await createOrder(payload, actor, { lines: [usucha()], service: "here", idempotencyKey: randomUUID() });
    if (!o.ok) throw new Error(o.error);
    const { voidOrder } = await import("@/lib/pos/sales");
    expect(await voidOrder(payload, actor, o.orderId, "  ")).toMatchObject({ ok: false, error: "reason-required" });
    expect(await voidOrder(payload, actor, o.orderId, "Cliente se fue")).toMatchObject({ ok: true });
    const paid = await paidOrder();
    expect(await voidOrder(payload, actor, paid, "x")).toMatchObject({ ok: false, error: "paid" });
  });

  it("lets a barista refund up to the limit, and needs a manager PIN above it", async () => {
    const { refundOrder } = await import("@/lib/pos/sales");
    const orderId = await paidOrder();
    const small = await refundOrder(payload, actor, { orderId, amountCents: 250, reason: "Bebida fría" });
    expect(small).toMatchObject({ ok: true, refundedCents: 250 });
    expect(await refundOrder(payload, actor, { orderId, amountCents: 630, reason: "Resto" })).toMatchObject({
      ok: false,
      error: "over-limit",
    });
    expect(
      await refundOrder(payload, actor, { orderId, amountCents: 630, reason: "Resto", approver: { staffId: manager.id, pin: "1111" } }),
    ).toMatchObject({ ok: false, error: "approval-failed" });
    const big = await refundOrder(payload, actor, {
      orderId,
      amountCents: 630,
      reason: "Resto",
      approver: { staffId: manager.id, pin: "6048" },
    });
    expect(big).toMatchObject({ ok: true });
    expect(await refundOrder(payload, actor, { orderId, amountCents: 1, reason: "más" })).toMatchObject({ ok: false, error: "bad-amount" });
    const order = await payload.findByID({ collection: "orders", id: orderId });
    expect(order.paymentStatus).toBe("refunded");
    const refunds = await payload.find({ collection: "refunds", where: { order: { equals: orderId } }, depth: 0 });
    expect(refunds.docs.find((r) => r.amountCents === 630)?.approvedBy).toBe(manager.id);
  });

  it("chains corrective invoices and subtracts cash refunds from the Z report", async () => {
    const { docs } = await payload.find({ collection: "invoices", sort: "number", limit: 200, depth: 0, where: { series: { equals: "T" } } });
    const r5 = docs.filter((d) => d.type === "R5");
    expect(r5.length).toBe(2);
    expect(r5.every((d) => d.totalCents < 0 && d.rectifies)).toBe(true);
    for (let i = 1; i < docs.length; i++) expect(docs[i].previousHash).toBe(docs[i - 1].hash);
    const closed = await closeShift(payload, actor, 0);
    if (!closed.ok) throw new Error(closed.error);
    expect(closed.report.refundsByMethod.cash).toBe(880);
    expect(closed.report.expectedCashCents).toBe(5000 + 2 * 880 - 880);
  });
});

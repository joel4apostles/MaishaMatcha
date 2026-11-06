import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";
import { createOrder, issueFullInvoice, openShift, payOrder, zReport, type Actor } from "@/lib/pos/sales";
import { boot, staff } from "./harness";

/**
 * Split payment (card + cash, change from cash only) and full invoices on
 * request (F3 in their own series, replacing the simplified ticket once).
 */
let payload: Payload;
let actor: Actor;
let ujiId: number;
let shiftId: number;

const sale = async () => {
  const o = await createOrder(payload, actor, { lines: [{ menuItemId: ujiId, quantity: 2, modifierKeys: ["prep.usucha"] }], service: "here", idempotencyKey: randomUUID() });
  if (!o.ok) throw new Error(o.error);
  return o; // 2 x 8,80 = 17,60
};

beforeAll(async () => {
  payload = await boot();
  const barista = await staff(payload, "extras-barista@test.local", "barista", "Pau");
  const device = await payload.create({
    collection: "pos-devices",
    overrideAccess: true,
    data: { name: "Barra extras", tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "1"), active: true },
  });
  actor = { staffId: barista.id, deviceId: device.id };
  ujiId = (await payload.find({ collection: "menu-items", where: { name: { equals: "Uji" } } })).docs[0].id;
  await payload.updateGlobal({ slug: "business", data: { nif: "B12345674", invoiceSeries: "X", fullInvoiceSeries: "FX" } });
  const s = await openShift(payload, actor, 5000);
  if (!s.ok) throw new Error(s.error);
  shiftId = s.shiftId;
});

describe("split payment", () => {
  it("records card and cash parts, change only from the cash part", async () => {
    const o = await sale();
    expect(await payOrder(payload, actor, { orderId: o.orderId, method: "split", cardCents: 1000, tenderedCents: 500 })).toMatchObject({ ok: false, error: "short-cash" });
    expect(await payOrder(payload, actor, { orderId: o.orderId, method: "split", cardCents: 1760, tenderedCents: 0 })).toMatchObject({ ok: false, error: "bad-split" });
    const r = await payOrder(payload, actor, { orderId: o.orderId, method: "split", cardCents: 1000, tenderedCents: 1000 });
    expect(r).toMatchObject({ ok: true, changeCents: 240 });
    const pays = (await payload.find({ collection: "payments", overrideAccess: true, where: { order: { equals: o.orderId } } })).docs;
    expect(pays.map((p) => [p.method, p.amountCents]).sort()).toEqual([["card_terminal", 1000], ["cash", 760]]);
    const z = await zReport(payload, shiftId, 5000);
    expect(z.expectedCashCents).toBe(5000 + 760);
  });
});

describe("full invoice on request", () => {
  it("issues one F3 in its own series, naming the customer and replacing the ticket", async () => {
    const o = await sale();
    expect(await issueFullInvoice(payload, actor, o.orderId, { name: "Ana", taxId: "12345678Z", address: "Calle Mayor 1, Murcia" })).toMatchObject({ ok: false, error: "not-paid" });
    await payOrder(payload, actor, { orderId: o.orderId, method: "card_terminal" });
    expect(await issueFullInvoice(payload, actor, o.orderId, { name: "Ana", taxId: "12345678A", address: "x" })).toMatchObject({ ok: false, error: "bad-tax-id" });
    const r = await issueFullInvoice(payload, actor, o.orderId, { name: "Estudio Ana SL", taxId: "B-1234567-4", address: "Calle Mayor 1, Murcia" });
    if (!r.ok) throw new Error(r.error);
    expect(r.fullNumber).toMatch(/^FX\d{4}-\d{6}$/);
    const inv = await payload.findByID({ collection: "invoices", id: r.invoiceId, overrideAccess: true, depth: 0 });
    expect(inv).toMatchObject({ type: "F3", series: "FX", totalCents: 1760, customer: { name: "Estudio Ana SL", taxId: "B12345674" } });
    const f2 = (await payload.find({ collection: "invoices", overrideAccess: true, where: { and: [{ order: { equals: o.orderId } }, { type: { equals: "F2" } }] } })).docs[0];
    expect(inv.replaces).toBe(f2.id);
    // Once per ticket, even if asked twice at once.
    const again = await Promise.all([
      issueFullInvoice(payload, actor, o.orderId, { name: "Otra", taxId: "12345678Z", address: "x" }),
      issueFullInvoice(payload, actor, o.orderId, { name: "Otra", taxId: "12345678Z", address: "x" }),
    ]);
    expect(again.every((a) => !a.ok && a.error === "already-full")).toBe(true);
  });
});

describe("refunds after split payment and full invoices (security review)", () => {
  it("returns cash first, then card, one refund row per method", async () => {
    const o = await sale(); // 17,60
    await payOrder(payload, actor, { orderId: o.orderId, method: "split", cardCents: 1000, tenderedCents: 760 });
    const { refundOrder } = await import("@/lib/pos/sales");
    const owner = await staff(payload, "extras-owner@test.local", "owner", "Olga");
    const ownerActor = { staffId: owner.id, deviceId: actor.deviceId };
    const r = await refundOrder(payload, ownerActor, { orderId: o.orderId, amountCents: 1200, reason: "Bebida equivocada" });
    expect(r.ok).toBe(true);
    const rows = (await payload.find({ collection: "refunds", overrideAccess: true, where: { order: { equals: o.orderId } } })).docs;
    expect(rows.map((x) => [x.method, x.amountCents]).sort()).toEqual([["card_terminal", 440], ["cash", 760]]);
    // What is left can only come back on the card.
    expect(await refundOrder(payload, ownerActor, { orderId: o.orderId, amountCents: 600, reason: "x" })).toMatchObject({ ok: false, error: "bad-amount" });
    expect((await refundOrder(payload, ownerActor, { orderId: o.orderId, amountCents: 560, reason: "x" })).ok).toBe(true);
  });

  it("refuses a till refund on a ticket that has a full invoice", async () => {
    const o = await sale();
    await payOrder(payload, actor, { orderId: o.orderId, method: "card_terminal" });
    const f = await issueFullInvoice(payload, actor, o.orderId, { name: "Ana", taxId: "12345678Z", address: "Calle Mayor 1" });
    expect(f.ok).toBe(true);
    const { refundOrder } = await import("@/lib/pos/sales");
    const owner = (await payload.find({ collection: "users", overrideAccess: true, where: { email: { equals: "extras-owner@test.local" } } })).docs[0];
    expect(await refundOrder(payload, { staffId: owner.id, deviceId: actor.deviceId }, { orderId: o.orderId, amountCents: 100, reason: "x" })).toMatchObject({
      ok: false,
      error: "already-full",
    });
  });
});

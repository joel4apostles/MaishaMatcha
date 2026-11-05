import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";
import { inventoryAlerts, margins } from "@/lib/inventory";
import { createOrder, openShift, payOrder, type Actor } from "@/lib/pos/sales";
import { asUser, boot, staff, type Staff } from "./harness";

/**
 * The inventory loop against Postgres: a paid sale deducts the measured
 * grams, crossing the reorder point drafts ONE purchase-order line,
 * approval marks it sent, receiving adds stock and updates the cost, and a
 * count adjusts to reality.
 */
let payload: Payload;
let actor: Actor;
let manager: Staff;
let nishioId: number;
let matchaId: number;

async function sellNishioLatte(grams: number) {
  const o = await createOrder(payload, actor, {
    lines: [{ menuItemId: nishioId, quantity: 2, modifierKeys: ["prep.latte", "leche.avena"], grams }],
    service: "here",
    idempotencyKey: randomUUID(),
  });
  if (!o.ok) throw new Error(o.error);
  const p = await payOrder(payload, actor, { orderId: o.orderId, method: "card_terminal" });
  if (!p.ok) throw new Error(p.error);
}

const stockOf = async (id: number) => (await payload.findByID({ collection: "inventory-items", id })).stock ?? 0;

beforeAll(async () => {
  payload = await boot();
  await staff(payload, "owner@test.local", "owner", "Owner");
  manager = await staff(payload, "inv-manager@test.local", "manager", "Marta");
  const barista = await staff(payload, "inv-barista@test.local", "barista", "Ana");
  const device = await payload.create({
    collection: "pos-devices",
    overrideAccess: true,
    data: { name: "Barra inventario", tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "1"), active: true },
  });
  actor = { staffId: barista.id, deviceId: device.id };
  await openShift(payload, actor, 0);

  nishioId = (await payload.find({ collection: "menu-items", where: { name: { equals: "Nishio" } } })).docs[0].id;
  await payload.update({ collection: "menu-items", id: nishioId, data: { defaultGrams: 2 } });
  matchaId = (await payload.find({ collection: "inventory-items", where: { name: { equals: "Matcha Nishio" } } })).docs[0].id;

  const supplier = await payload.create({
    collection: "suppliers",
    data: { name: "Uji Direct NL", email: "orders@example.com", leadTimeDays: 5 },
    ...asUser(manager),
  });
  await payload.create({
    collection: "supplier-products",
    data: { supplier: supplier.id, ingredient: matchaId, packSize: 100, priceCents: 3000 },
    ...asUser(manager),
  });
  await payload.update({
    collection: "inventory-items",
    id: matchaId,
    data: { supplier: supplier.id, lowStockAt: 996, reorderQuantity: 200 },
    ...asUser(manager),
  });
  await payload.create({
    collection: "stock-movements",
    data: { item: matchaId, delta: 1000, reason: "purchase" },
    ...asUser(manager),
  });
});

describe("sales deduct stock", () => {
  it("takes the barista's measured grams, not the recipe default", async () => {
    await sellNishioLatte(2.5);
    expect(await stockOf(matchaId)).toBe(1000 - 5);
  });
});

describe("reordering", () => {
  it("drafts one purchase-order line when the reorder point is crossed", async () => {
    const pos = await payload.find({ collection: "purchase-orders", where: { status: { equals: "draft" } }, depth: 0 });
    expect(pos.totalDocs).toBe(1);
    expect(pos.docs[0].lines).toHaveLength(1);
    expect(pos.docs[0].lines?.[0]).toMatchObject({ packs: 2, packSize: 100, unitPriceCents: 3000 });
    expect(pos.docs[0].totalCents).toBe(6000);
  });

  it("does not add the same ingredient again on the next sale", async () => {
    await sellNishioLatte(2);
    const pos = await payload.find({ collection: "purchase-orders", where: { status: { equals: "draft" } }, depth: 0 });
    expect(pos.totalDocs).toBe(1);
    expect(pos.docs[0].lines).toHaveLength(1);
  });

  it("sends on approval and receives stock at the supplier's price", async () => {
    const po = (await payload.find({ collection: "purchase-orders", where: { status: { equals: "draft" } }, depth: 0 })).docs[0];
    await payload.update({ collection: "purchase-orders", id: po.id, data: { status: "sent" }, ...asUser(manager) });
    const sent = await payload.findByID({ collection: "purchase-orders", id: po.id, depth: 0 });
    expect(sent.sentAt).toBeTruthy();
    expect(sent.emailStatus).toMatch(/RESEND_API_KEY|Enviado/);

    const before = await stockOf(matchaId);
    await payload.update({
      collection: "purchase-orders",
      id: po.id,
      data: { lines: (sent.lines ?? []).map((l) => ({ ...l, receivedPacks: 1 })) },
      ...asUser(manager),
    });
    expect(await stockOf(matchaId)).toBe(before + 100);
    const received = await payload.findByID({ collection: "purchase-orders", id: po.id, depth: 0 });
    expect(received.status).toBe("partially_received");
    const item = await payload.findByID({ collection: "inventory-items", id: matchaId });
    expect(item.costCentsPer1000).toBe(30000);
  });
});

describe("counts, margins and alerts", () => {
  it("turns a count into an adjustment", async () => {
    await payload.create({ collection: "stock-counts", data: { ingredient: matchaId, countedQuantity: 1050 }, ...asUser(manager) });
    expect(await stockOf(matchaId)).toBe(1050);
  });

  it("computes cost and margin per drink", async () => {
    const m = (await margins(payload)).find((x) => x.name === "Nishio");
    // 2 g at 300 €/kg = 0,60 €; price 7,40 € incl. 10 % IVA = 6,727 € net.
    expect(m).toMatchObject({ costCents: 60, complete: true });
    expect(m?.marginPercent).toBe(91);
  });

  it("lists low stock and drafts as alerts", async () => {
    await payload.update({ collection: "inventory-items", id: matchaId, data: { lowStockAt: 5000 }, ...asUser(manager) });
    const alerts = await inventoryAlerts(payload);
    expect(alerts.lowStock.some((a) => a.id === matchaId)).toBe(true);
  });
});

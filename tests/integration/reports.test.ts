import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";
import { createOrder, openShift, payOrder, type Actor } from "@/lib/pos/sales";
import { invoicesCsv, ivaSummary, madridDay, today } from "@/lib/reports";
import { boot, staff } from "./harness";

let payload: Payload;
let actor: Actor;
let ujiId: number;

beforeAll(async () => {
  payload = await boot();
  await staff(payload, "owner@test.local", "owner", "Owner");
  const barista = await staff(payload, "rep-barista@test.local", "barista", "Rosa");
  const device = await payload.create({
    collection: "pos-devices",
    overrideAccess: true,
    data: { name: "Barra informes", tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "2"), active: true },
  });
  actor = { staffId: barista.id, deviceId: device.id };
  await openShift(payload, actor, 0);
  ujiId = (await payload.find({ collection: "menu-items", where: { name: { equals: "Uji" } } })).docs[0].id;
});

describe("reports", () => {
  it("knows the local day", () => {
    const d = madridDay(new Date("2026-11-07T23:30:00Z"));
    expect(d.label).toBe("2026-11-08");
    expect(d.from).toBe("2026-11-07T23:00:00.000Z");
    expect(d.to).toBe("2026-11-08T23:00:00.000Z");
  });

  it("moves today's numbers by exactly one sale", async () => {
    const before = await today(payload);
    const o = await createOrder(payload, actor, {
      lines: [{ menuItemId: ujiId, quantity: 1, modifierKeys: ["prep.usucha"] }],
      service: "here",
      idempotencyKey: randomUUID(),
    });
    if (!o.ok) throw new Error(o.error);
    await payOrder(payload, actor, { orderId: o.orderId, method: "cash", tenderedCents: 1000 });
    const after = await today(payload);
    expect(after.salesCents - before.salesCents).toBe(880);
    expect(after.orders - before.orders).toBe(1);
    expect(after.onShift.some((s) => s.name === "Rosa")).toBe(true);
    expect(after.topItems.find((i) => i.name === "Uji")?.quantity).toBeGreaterThanOrEqual(1);
  });

  it("summarises IVA and exports invoices that add up", async () => {
    const { from, to } = madridDay();
    const iva = await ivaSummary(payload, from, to);
    const r10 = iva.find((r) => r.rateBasisPoints === 1000)!;
    const { docs } = await payload.find({
      collection: "invoices",
      limit: 10000,
      depth: 0,
      where: { and: [{ issuedAt: { greater_than_equal: from } }, { issuedAt: { less_than: to } }] },
    });
    expect(r10.baseCents + r10.taxCents).toBe(docs.reduce((s, d) => s + d.totalCents, 0));
    const csv = await invoicesCsv(payload, from, to);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain('"Número"');
    expect(lines.length).toBe(docs.length + 1);
  });
});

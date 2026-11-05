import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";
import { availableSlots, markOnlinePaid, orderByToken, placeOnlineOrder, type PlaceInput } from "@/lib/online";
import { kitchenQueue } from "@/lib/pos/sales";
import { boot } from "./harness";

/**
 * Web orders against Postgres: closed switch, server pricing, slot capacity
 * under concurrency, idempotent retries, the Stripe "paid" path (payment,
 * invoice, once only) and the private status token.
 */
let payload: Payload;
let ujiId: number;
// Tuesday 2 March 2027, 10:00 in Madrid (UTC+1).
const NOW = new Date("2027-03-02T09:00:00.000Z");
const ELEVEN = "2027-03-02T10:00:00.000Z";

const input = (over: Partial<PlaceInput> = {}): PlaceInput => ({
  lines: [{ menuItemId: ujiId, quantity: 1, modifierKeys: ["prep.latte", "leche.avena"] }],
  pickupAt: ELEVEN,
  name: "Ana López",
  email: "ana@example.com",
  payOnline: false,
  idempotencyKey: randomUUID(),
  ...over,
});

beforeAll(async () => {
  payload = await boot();
  ujiId = (await payload.find({ collection: "menu-items", where: { name: { equals: "Uji" } } })).docs[0].id;
  await payload.updateGlobal({ slug: "business", data: { nif: "B12345678", invoiceSeries: "W", onlineOrdering: false } });
});

describe("web orders", () => {
  it("refuses orders while the switch is off", async () => {
    expect(await placeOnlineOrder(payload, input(), NOW)).toEqual({ ok: false, error: "closed" });
    expect((await availableSlots(payload, NOW)).slots).toHaveLength(0);
  });

  it("prices on the server and returns the same order for a retried key", async () => {
    await payload.updateGlobal({
      slug: "business",
      data: { onlineOrdering: true, slotCapacity: 3, openDays: ["tue", "wed", "thu", "fri", "sat", "sun"] },
    });
    const key = randomUUID();
    const first = await placeOnlineOrder(payload, input({ idempotencyKey: key }), NOW);
    expect(first).toMatchObject({ ok: true, totalCents: 880 + 140 });
    const again = await placeOnlineOrder(payload, input({ idempotencyKey: key }), NOW);
    if (!first.ok || !again.ok) throw new Error("not placed");
    expect(again.orderId).toBe(first.orderId);
    expect(first.label).toMatch(/^W-\d{4}$/);
  });

  it("never books a slot past its capacity, even in a race", async () => {
    // One place already taken above; capacity 3 leaves two. Five race for them.
    const results = await Promise.all(Array.from({ length: 5 }, () => placeOnlineOrder(payload, input(), NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok && r.error === "slot-full")).toHaveLength(3);
    const slot = (await availableSlots(payload, NOW)).slots.find((s) => s.start === ELEVEN);
    expect(slot).toMatchObject({ available: false, remaining: 0 });
  });

  it("refuses times outside the opening hours or too soon", async () => {
    expect(await placeOnlineOrder(payload, input({ pickupAt: "2027-03-02T09:05:00.000Z" }), NOW)).toMatchObject({ error: "slot-full" });
    expect(await placeOnlineOrder(payload, input({ pickupAt: "2027-03-02T20:00:00.000Z" }), NOW)).toMatchObject({ error: "slot-full" });
  });

  it("keeps unpaid card orders out of the kitchen until Stripe confirms, once", async () => {
    const placed = await placeOnlineOrder(payload, input({ payOnline: true, pickupAt: "2027-03-02T10:30:00.000Z" }), NOW);
    if (!placed.ok) throw new Error(placed.error);
    const inKitchen = async () => (await kitchenQueue(payload)).some((o) => o.id === placed.orderId);
    expect(await inKitchen()).toBe(false);

    const [a, b] = await Promise.all([markOnlinePaid(payload, placed.orderId, "pi_1"), markOnlinePaid(payload, placed.orderId, "pi_1")]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await inKitchen()).toBe(true);

    const payments = await payload.find({ collection: "payments", where: { order: { equals: placed.orderId } } });
    expect(payments.docs).toHaveLength(1);
    expect(payments.docs[0]).toMatchObject({ method: "online", amountCents: placed.totalCents });
    const invoices = await payload.find({ collection: "invoices", where: { order: { equals: placed.orderId } } });
    expect(invoices.docs).toHaveLength(1);
  });

  it("shows the status page only for a real token, and only what it needs", async () => {
    const placed = await placeOnlineOrder(payload, input({ pickupAt: "2027-03-02T11:00:00.000Z" }), NOW);
    if (!placed.ok) throw new Error(placed.error);
    const view = await orderByToken(payload, placed.token);
    expect(view).toMatchObject({ label: placed.label, status: "received", firstName: "Ana", paymentStatus: "unpaid" });
    expect(JSON.stringify(view)).not.toContain("ana@example.com");
    expect(await orderByToken(payload, "x".repeat(32))).toBeNull();
    expect(await orderByToken(payload, "bad token")).toBeNull();
  });
});

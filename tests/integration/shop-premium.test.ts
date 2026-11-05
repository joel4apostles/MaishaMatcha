import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";
import { consumeSignIn, signInToken } from "@/lib/members";
import { cancelUnpaidOnline, markOnlinePaid, placeOnlineOrder } from "@/lib/online";
import { loadCatalog } from "@/lib/pos/sales";
import { monthlyPriceFor, onPremiumCheckout, onPremiumInvoicePaid, onPremiumSubscription, premiumSettings, startPremium } from "@/lib/premium";
import { boot, staff } from "./harness";

/**
 * The shop (whole units, never oversold, returned on cancel, web price) and
 * the premium subscription (Stripe mocked: checkout, monthly invoices
 * invoiced once each, status mirrored from Stripe, founding price).
 */
let payload: Payload;
let tinId: number;
// Its own day (Wednesday 3 March 2027), away from the other files' slots.
const NOW = new Date("2027-03-03T09:00:00.000Z");
const fetchMock = vi.fn();

beforeAll(async () => {
  payload = await boot();
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ id: "cs_sub", url: "https://checkout.stripe.com/c/cs_sub" })));
  const rate = await payload.create({ collection: "tax-rates", overrideAccess: true, data: { name: "IVA 21 shop test", rateBasisPoints: 2100 } as never });
  const cat = await payload.create({ collection: "menu-categories", overrideAccess: true, data: { slug: "tienda-test", title: "Tienda", order: 99, shop: true } });
  const tin = await payload.create({
    collection: "menu-items",
    overrideAccess: true,
    data: { name: "Lata Uji 30 g", category: cat.id, priceCents: 2400, onlinePriceCents: 2200, taxRate: rate.id, description: "Ceremonial.", stock: 2, color: "#5E7A2E" } as never,
  });
  tinId = tin.id;
  await payload.updateGlobal({
    slug: "business",
    data: { nif: "B12345678", onlineOrdering: true, slotCapacity: 50, openDays: ["tue", "wed", "thu", "fri", "sat", "sun"], premiumOpen: true, premiumMonthlyCents: 1500, premiumFoundingMonthlyCents: 1200, premiumTaxRate: rate.id },
  });
});

afterAll(async () => {
  // Leave the shared settings as the other test files expect them.
  await payload.updateGlobal({ slug: "business", data: { slotCapacity: 6, premiumOpen: false } });
  vi.unstubAllGlobals();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

const buy = (email: string, quantity = 1) =>
  placeOnlineOrder(
    payload,
    { lines: [{ menuItemId: tinId, quantity, modifierKeys: [] }], pickupAt: "2027-03-03T10:00:00.000Z", name: "Ana", email, payOnline: true, idempotencyKey: randomUUID() },
    NOW,
  );

describe("shop", () => {
  it("lists products apart from the carta, at the web price", async () => {
    const online = await loadCatalog(payload, "es", "online");
    const tin = online.find((i) => i.id === tinId)!;
    expect(tin).toMatchObject({ shop: true, priceCents: 2200, stock: 2, available: true });
    expect((await loadCatalog(payload, "es", "counter")).find((i) => i.id === tinId)?.priceCents).toBe(2400);
  });

  it("never sells more units than there are, even in a race, and gives them back on cancel", async () => {
    const results = await Promise.all(["a", "b", "c", "d"].map((x) => buy(`${x}@shop.test`)));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok && r.error === "unavailable-item")).toHaveLength(2);
    const after = await payload.findByID({ collection: "menu-items", id: tinId, overrideAccess: true });
    expect(after.stock).toBe(0);
    expect((await loadCatalog(payload, "es", "online")).find((i) => i.id === tinId)?.available).toBe(false);

    const placed = results.find((r) => r.ok)!;
    if (!placed.ok) throw new Error();
    expect(await cancelUnpaidOnline(payload, placed.orderId)).toBe(true);
    expect((await payload.findByID({ collection: "menu-items", id: tinId, overrideAccess: true })).stock).toBe(1);
  });
});

describe("premium subscription", () => {
  const member = async (email: string) => (await consumeSignIn(payload, signInToken(email, "es")))!.member;

  it("charges founders the founding price", async () => {
    const s = await premiumSettings(payload);
    expect(s.open).toBe(true);
    expect(monthlyPriceFor({ tier: "founding" }, s)).toBe(1200);
    expect(monthlyPriceFor({ tier: "customer" }, s)).toBe(1500);
    const m = await member("sub@premium.test");
    fetchMock.mockClear();
    expect(await startPremium(payload, m, "es", "http://x")).toMatchObject({ ok: true });
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(body.get("mode")).toBe("subscription");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("1500");
    expect(body.get("subscription_data[metadata][memberId]")).toBe(String(m.id));
  });

  it("invoices each paid month once and mirrors Stripe's status", async () => {
    const m = await member("sub@premium.test");
    const meta = { kind: "premium", memberId: String(m.id), taxBp: "2100" };
    // Stripe may send invoice.paid before checkout.session.completed, and twice.
    const invoice = { id: "in_1", amount_paid: 1500, customer: "cus_1", subscription: "sub_1", payment_intent: "pi_1", subscription_details: { metadata: meta }, lines: { data: [{ period: { end: 1806000000 } }] } };
    await Promise.all([onPremiumInvoicePaid(payload, invoice), onPremiumInvoicePaid(payload, invoice)]);
    await onPremiumCheckout(payload, { metadata: meta, customer: "cus_1", subscription: "sub_1" });
    let after = await payload.findByID({ collection: "members", id: m.id, overrideAccess: true });
    expect(after.subscriptionStatus).toBe("none"); // checkout alone proves no payment
    await onPremiumSubscription(payload, { id: "sub_1", status: "active", metadata: meta }, false, 100);
    after = await payload.findByID({ collection: "members", id: m.id, overrideAccess: true });
    expect(after.subscriptionStatus).toBe("active");
    const orders = await payload.find({ collection: "orders", overrideAccess: true, where: { and: [{ member: { equals: m.id } }, { kind: { equals: "subscription" } }] } });
    expect(orders.docs).toHaveLength(1);
    expect(orders.docs[0]).toMatchObject({ paymentStatus: "paid", totalCents: 1500 });
    expect((await payload.find({ collection: "invoices", overrideAccess: true, where: { order: { equals: orders.docs[0].id } } })).docs).toHaveLength(1);

    // Next month: a second invoice, found by subscription id alone (new API shape).
    await onPremiumInvoicePaid(payload, { id: "in_2", amount_paid: 1500, customer: "cus_1", payment_intent: "pi_2", parent: { subscription_details: { subscription: "sub_1", metadata: meta } } });
    expect((await payload.count({ collection: "orders", overrideAccess: true, where: { and: [{ member: { equals: m.id } }, { kind: { equals: "subscription" } }] } })).totalDocs).toBe(2);

    await onPremiumSubscription(payload, { id: "sub_1", status: "active", cancel_at_period_end: true, metadata: meta, items: { data: [{ current_period_end: 1808000000 }] } }, false, 200);
    after = await payload.findByID({ collection: "members", id: m.id, overrideAccess: true });
    expect(after.cancelAtPeriodEnd).toBe(true);
    await onPremiumSubscription(payload, { id: "sub_1", status: "canceled", metadata: meta }, true, 300);
    expect((await payload.findByID({ collection: "members", id: m.id, overrideAccess: true })).subscriptionStatus).toBe("cancelled");
    // A delayed older event (and a late invoice) cannot bring it back.
    await onPremiumSubscription(payload, { id: "sub_1", status: "active", metadata: meta }, false, 250);
    await onPremiumInvoicePaid(payload, { id: "in_late", amount_paid: 1500, customer: "cus_1", subscription: "sub_1", subscription_details: { metadata: meta } });
    expect((await payload.findByID({ collection: "members", id: m.id, overrideAccess: true })).subscriptionStatus).toBe("cancelled");
    // Events without our kind (a manual dashboard invoice) are ignored.
    expect(await onPremiumInvoicePaid(payload, { id: "in_manual", amount_paid: 900, customer: "cus_1" })).toBe(false);
    expect(await onPremiumSubscription(payload, { id: "sub_other", status: "active", customer: "cus_1" }, false, 400)).toBe(false);
  });

  it("hides Stripe ids from the API", async () => {
    const m = await member("sub@premium.test");
    const owner = await staff(payload, "owner-sp@test.local", "owner", "Owner");
    const seen = await payload.findByID({ collection: "members", id: m.id, user: owner, overrideAccess: false });
    expect(JSON.stringify(seen)).not.toContain("cus_1");
  });
});

describe("security review fixes (shop)", () => {
  it("caps units per product, requires online payment for products, and returns units exactly once", async () => {
    await payload.update({ collection: "menu-items", id: tinId, overrideAccess: true, data: { stock: 10 } as never });
    const order = (over: Partial<{ quantity: number; payOnline: boolean }>) =>
      placeOnlineOrder(
        payload,
        { lines: [{ menuItemId: tinId, quantity: over.quantity ?? 1, modifierKeys: [] }], pickupAt: "2027-03-03T11:00:00.000Z", name: "Eva", email: `eva-${randomUUID().slice(0, 6)}@shop.test`, payOnline: over.payOnline ?? true, idempotencyKey: randomUUID() },
        NOW,
      );
    expect(await order({ quantity: 6 })).toEqual({ ok: false, error: "too-many-units" });
    expect(await order({ payOnline: false })).toEqual({ ok: false, error: "pay-online" });
    const placed = await order({ quantity: 3 });
    if (!placed.ok) throw new Error(placed.error);
    expect((await payload.findByID({ collection: "menu-items", id: tinId, overrideAccess: true })).stock).toBe(7);
    // Stripe expiry and a staff void at the same instant: units return once.
    await Promise.all([cancelUnpaidOnline(payload, placed.orderId), cancelUnpaidOnline(payload, placed.orderId)]);
    expect((await payload.findByID({ collection: "menu-items", id: tinId, overrideAccess: true })).stock).toBe(10);
    // A late payment never revives a cancelled order.
    expect(await markOnlinePaid(payload, placed.orderId, "pi_late", placed.totalCents)).toBe(false);
  });
});

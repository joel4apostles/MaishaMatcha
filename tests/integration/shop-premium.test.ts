import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";
import { consumeSignIn, signInToken } from "@/lib/members";
import { cancelUnpaidOnline, markOnlinePaid, placeOnlineOrder } from "@/lib/online";
import { loadCatalog } from "@/lib/pos/sales";
import { markBoxCollected, markBoxShipped, monthlyPriceFor, premiumWelcomeEmail, onPremiumCheckout, onPremiumInvoicePaid, onPremiumSubscription, pendingBoxes, premiumSettings, startPremium } from "@/lib/premium";
import { rsvp } from "@/lib/events";
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
    data: { nif: "B12345678", invoiceSeries: "P", onlineOrdering: true, slotCapacity: 50, openDays: ["tue", "wed", "thu", "fri", "sat", "sun"], premiumOpen: true, premiumMonthlyCents: 1500, premiumFoundingMonthlyCents: 1200, premiumTaxRate: rate.id },
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

  it("welcomes a new subscriber once per subscription, in their language, from the owner's own settings", async () => {
    process.env.RESEND_API_KEY = "re_test";
    try {
      await payload.updateGlobal({ slug: "business", data: { premiumPerks: "Una lata al mes\nPrecio de socio en la barra" } as never });
      const m = await consumeSignIn(payload, signInToken("welcome@premium.test", "es")).then((r) => r!.member);
      const meta = { kind: "premium", memberId: String(m.id), taxBp: "2100" };
      const welcomes = () => fetchMock.mock.calls.filter(([url]) => String(url).includes("api.resend.com"));
      fetchMock.mockClear();
      // Stripe repeats and races its events: still one welcome.
      await Promise.all([
        onPremiumSubscription(payload, { id: "sub_w", status: "active", metadata: meta }, false, 10),
        onPremiumSubscription(payload, { id: "sub_w", status: "active", metadata: meta }, false, 11),
      ]);
      await onPremiumSubscription(payload, { id: "sub_w", status: "active", cancel_at_period_end: true, metadata: meta }, false, 12);
      expect(welcomes()).toHaveLength(1);
      const sent = JSON.parse(welcomes()[0][1].body);
      expect(sent.to).toBe("welcome@premium.test");
      expect(sent.subject).toContain("Te damos la bienvenida");
      expect(sent.html).toContain("Una lata al mes");
      expect(sent.html).toContain("/es/cuenta");
      // A cancellation sends nothing; a NEW subscription later is welcomed again.
      await onPremiumSubscription(payload, { id: "sub_w", status: "canceled", metadata: meta }, true, 20);
      expect(welcomes()).toHaveLength(1);
      await onPremiumSubscription(payload, { id: "sub_w2", status: "active", metadata: meta }, false, 30);
      expect(welcomes()).toHaveLength(2);
      // Not yet paid (incomplete): no welcome.
      const n = await consumeSignIn(payload, signInToken("unpaid@premium.test", "es")).then((r) => r!.member);
      await onPremiumSubscription(payload, { id: "sub_u", status: "incomplete", metadata: { ...meta, memberId: String(n.id) } }, false, 40);
      expect(welcomes()).toHaveLength(2);
    } finally {
      delete process.env.RESEND_API_KEY;
    }
  });

  it("writes the welcome in the house voice and escapes what people typed", () => {
    for (const locale of ["es", "en"] as const) {
      for (const delivery of ["pickup", "shipping"] as const) {
        const { subject, html } = premiumWelcomeEmail({ locale, name: "<Ana>", product: "Lata Uji 30 g", delivery, city: "Cartagena", perks: ["Una lata al mes"], shippingCents: delivery === "shipping" ? 495 : null });
        const text = subject + html.replace(/<[^>]+>/g, " ");
        expect(text).not.toMatch(/[!\u2013\u2014]/);
        expect(text.toLowerCase()).not.toContain("premium");
        expect(html).not.toContain("<Ana>");
        expect(html).toContain("&lt;Ana&gt;");
        expect(html).toContain("Lata Uji 30 g");
        if (delivery === "shipping") expect(html).toContain("Cartagena");
      }
    }
  });

  it("hides Stripe ids from the API", async () => {
    const m = await member("sub@premium.test");
    const owner = await staff(payload, "owner-sp@test.local", "owner", "Owner");
    const seen = await payload.findByID({ collection: "members", id: m.id, user: owner, overrideAccess: false });
    expect(JSON.stringify(seen)).not.toContain("cus_1");
  });
});

describe("monthly box (pickup or post) and subscriber events", () => {
  const member = async (email: string) => (await consumeSignIn(payload, signInToken(email, "es")))!.member;
  let boxId: number;
  let owner: Awaited<ReturnType<typeof staff>>;

  beforeAll(async () => {
    owner = await staff(payload, "owner-box@test.local", "owner", "Owner");
    const cat = (await payload.find({ collection: "menu-categories", overrideAccess: true, where: { slug: { equals: "tienda-test" } } })).docs[0];
    const rate = (await payload.find({ collection: "tax-rates", overrideAccess: true, where: { name: { equals: "IVA 21 shop test" } } })).docs[0];
    const box = await payload.create({
      collection: "menu-items",
      overrideAccess: true,
      data: { name: "Lata Nishio 30 g", category: cat.id, priceCents: 2000, taxRate: rate.id, description: "Para cada día.", stock: 2, color: "#7A8F3A" } as never,
    });
    boxId = box.id;
    await payload.updateGlobal({ slug: "business", data: { premiumProduct: boxId, premiumShippingCents: 490 } });
  });
  afterAll(async () => {
    await payload.updateGlobal({ slug: "business", data: { premiumProduct: null, premiumShippingCents: null } });
  });

  it("offers home delivery only when a shipping price is set, and asks Stripe for an address in Spain", async () => {
    const m = await member("post@box.test");
    fetchMock.mockClear();
    expect(await startPremium(payload, m, "es", "http://x", "shipping")).toMatchObject({ ok: true });
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(body.get("line_items[1][price_data][unit_amount]")).toBe("490");
    expect(body.get("line_items[1][price_data][recurring][interval]")).toBe("month");
    expect(body.get("shipping_address_collection[allowed_countries][0]")).toBe("ES");
    expect(body.get("subscription_data[metadata][delivery]")).toBe("shipping");
    expect(body.get("subscription_data[metadata][shipCents]")).toBe("490");

    fetchMock.mockClear();
    await startPremium(payload, await member("pick@box.test"), "es", "http://x", "pickup");
    const pickup = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(pickup.get("line_items[1][price_data][unit_amount]")).toBeNull();
    expect(pickup.get("shipping_address_collection[allowed_countries][0]")).toBeNull();

    await payload.updateGlobal({ slug: "business", data: { premiumShippingCents: null } });
    expect(await startPremium(payload, await member("late@box.test"), "es", "http://x", "shipping")).toMatchObject({ ok: false, error: "closed" });
    await payload.updateGlobal({ slug: "business", data: { premiumShippingCents: 490 } });
  });

  it("puts a pickup box at the bar: the tin as the line, one unit taken, handed over once", async () => {
    const m = await member("pick@box.test");
    const meta = { kind: "premium", memberId: String(m.id), taxBp: "2100", delivery: "pickup" };
    const inv = { id: "in_box_p1", amount_paid: 1500, customer: "cus_p", subscription: "sub_p", payment_intent: "pi_p1", subscription_details: { metadata: meta } };
    await Promise.all([onPremiumInvoicePaid(payload, inv), onPremiumInvoicePaid(payload, inv)]);
    const orders = await payload.find({ collection: "orders", overrideAccess: true, where: { and: [{ member: { equals: m.id } }, { kind: { equals: "subscription" } }] } });
    expect(orders.docs).toHaveLength(1);
    const o = orders.docs[0];
    expect(o).toMatchObject({ status: "ready", fulfilment: "pickup", paymentStatus: "paid", totalCents: 1500 });
    expect(o.lines?.[0]?.name).toBe("Caja mensual: Lata Nishio 30 g");
    expect((await payload.findByID({ collection: "menu-items", id: boxId, overrideAccess: true })).stock).toBe(1);
    expect((await pendingBoxes(payload)).pickup.map((b) => b.id)).toContain(o.id);

    expect(await markBoxCollected(payload, o.id, owner.id)).toBe(true);
    expect(await markBoxCollected(payload, o.id, owner.id)).toBe(false);
    expect((await pendingBoxes(payload)).pickup.map((b) => b.id)).not.toContain(o.id);
  });

  it("posts a box to the address Stripe collected, with shipping as its own line, marked shipped once", async () => {
    const m = await member("post@box.test");
    const meta = { kind: "premium", memberId: String(m.id), taxBp: "2100", delivery: "shipping", shipCents: "490" };
    await onPremiumCheckout(payload, {
      metadata: meta,
      customer: "cus_s",
      subscription: "sub_s",
      collected_information: { shipping_details: { name: "Lucía Pérez", address: { line1: "Calle Mayor, 5", line2: "2º B", postal_code: "28013", city: "Madrid", state: "Madrid", country: "ES" } } },
      customer_details: { phone: "+34600000000" },
    });
    const saved = await payload.findByID({ collection: "members", id: m.id, overrideAccess: true });
    expect(saved.boxDelivery).toBe("shipping");
    expect(saved.shipTo).toMatchObject({ name: "Lucía Pérez", line1: "Calle Mayor, 5", postalCode: "28013", city: "Madrid", phone: "+34600000000" });

    await onPremiumInvoicePaid(payload, { id: "in_box_s1", amount_paid: 1990, customer: "cus_s", subscription: "sub_s", payment_intent: "pi_s1", subscription_details: { metadata: meta } });
    const o = (await payload.find({ collection: "orders", overrideAccess: true, where: { and: [{ member: { equals: m.id } }, { kind: { equals: "subscription" } }] } })).docs[0];
    expect(o).toMatchObject({ status: "ready", fulfilment: "shipping", totalCents: 1990 });
    expect(o.lines?.map((l) => [l.name, l.unitCents])).toEqual([["Caja mensual: Lata Nishio 30 g", 1500], ["Envío a casa", 490]]);
    expect(o.shipTo).toMatchObject({ city: "Madrid", line1: "Calle Mayor, 5" });
    expect((await pendingBoxes(payload)).shipping.map((b) => b.id)).toContain(o.id);

    expect(await markBoxShipped(payload, o.id, owner.id)).toBe(true);
    expect(await markBoxShipped(payload, o.id, owner.id)).toBe(false);
    const after = await payload.findByID({ collection: "orders", id: o.id, overrideAccess: true });
    expect(after.status).toBe("collected");
    expect(after.shippedAt).toBeTruthy();
    expect((await payload.count({ collection: "audit-log", overrideAccess: true, where: { and: [{ action: { equals: "box.shipped" } }, { entityId: { equals: String(o.id) } }] } })).totalDocs).toBe(1);
  });

  it("still owes the box when the tins ran out, and says so on the order", async () => {
    await payload.update({ collection: "menu-items", id: boxId, overrideAccess: true, data: { stock: 0 } });
    const m = await member("empty@box.test");
    const meta = { kind: "premium", memberId: String(m.id), taxBp: "2100", delivery: "pickup" };
    await onPremiumInvoicePaid(payload, { id: "in_box_e1", amount_paid: 1500, customer: "cus_e", subscription: "sub_e", payment_intent: "pi_e1", subscription_details: { metadata: meta } });
    const o = (await payload.find({ collection: "orders", overrideAccess: true, where: { member: { equals: m.id } } })).docs[0];
    expect(o.status).toBe("ready");
    expect(o.note).toContain("SIN EXISTENCIAS");
    expect((await payload.findByID({ collection: "menu-items", id: boxId, overrideAccess: true })).stock).toBe(0);
  });

  it("opens members-only events to founders and paid-up subscribers, not to everyone", async () => {
    const event = await payload.create({
      collection: "events",
      overrideAccess: true,
      data: { title: "Cupping de Uji", when: "Sábado", description: "Tres cosechas.", startsAt: "2031-05-10T17:00:00.000Z", capacity: 10, membersOnly: true, kind: "cupping" } as never,
    });
    const sub = await member("sub-event@box.test");
    const guest = await member("guest-event@box.test");
    await payload.update({ collection: "members", id: sub.id, overrideAccess: true, data: { subscriptionStatus: "active" } as never });
    expect(await rsvp(payload, { ...sub, subscriptionStatus: "active" }, event.id, 1)).toMatchObject({ ok: true });
    expect(await rsvp(payload, guest, event.id, 1)).toMatchObject({ ok: false, error: "members-only" });
    expect(await rsvp(payload, { ...guest, subscriptionStatus: "past_due" }, event.id, 1)).toMatchObject({ ok: false, error: "members-only" });
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

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";
import { sendCampaign, campaignRecipients } from "@/lib/campaigns";
import { listEvents, rsvp } from "@/lib/events";
import { completeFounding, foundingSettings, startFounding } from "@/lib/founding";
import {
  consumeSignIn,
  eraseMember,
  memberFromSession,
  revokeSessions,
  safeNext,
  sessionToken,
  signInToken,
  unsubscribe,
  unsubscribeToken,
} from "@/lib/members";
import { boot, staff } from "./harness";

/**
 * Accounts (passwordless), founding membership (Stripe mocked), event
 * seats under concurrency, and email letters to opted-in members only.
 */
let payload: Payload;
const fetchMock = vi.fn();

beforeAll(async () => {
  payload = await boot();
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  process.env.RESEND_API_KEY = "re_test";
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (url: string, init: { body?: string }) => {
    if (String(url).includes("stripe.com")) return new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" }));
    if (String(url).includes("resend.com/emails/batch")) return new Response(JSON.stringify({ data: JSON.parse(init.body ?? "[]") }));
    return new Response("{}");
  });
  await staff(payload, "owner-m@test.local", "owner", "Owner");
  await payload.updateGlobal({ slug: "business", data: { nif: "B12345678", invoiceSeries: "M" } });
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.RESEND_API_KEY;
});

async function member(email: string, name = "Ana López") {
  const r = await consumeSignIn(payload, signInToken(email, "es", name));
  if (!r) throw new Error("no sign-in");
  return r.member;
}

describe("accounts", () => {
  it("creates the account on the first link, reuses it after, normalising the email", async () => {
    const a = await member("Ana@Example.com");
    const b = await member("ana@example.com", "Otro nombre");
    expect(a.id).toBe(b.id);
    expect(a).toMatchObject({ email: "ana@example.com", tier: "customer", name: "Ana López", emailOptIn: false });
  });

  it("rejects expired and forged links", async () => {
    const old = signInToken("x@example.com", "es", undefined, undefined, Math.floor(Date.now() / 1000) - 3600);
    expect(await consumeSignIn(payload, old)).toBeNull();
    expect(await consumeSignIn(payload, signInToken("y@example.com", "es") + "x")).toBeNull();
  });

  it("only keeps same-site return paths", () => {
    expect(safeNext("/es/eventos")).toBe("/es/eventos");
    expect(safeNext("//evil.com")).toBeUndefined();
    expect(safeNext("https://evil.com")).toBeUndefined();
    expect(safeNext("/\\evil.com")).toBeUndefined();
  });

  it("signs out everywhere by bumping the session version", async () => {
    const m = await member("sess@example.com");
    const token = sessionToken(m);
    expect((await memberFromSession(payload, token))?.id).toBe(m.id);
    await revokeSessions(payload, m.id);
    expect(await memberFromSession(payload, token)).toBeNull();
  });

  it("erases the member but keeps the order without contact details", async () => {
    const m = await member("erase@example.com", "Eva Ruiz");
    const order = await payload.create({
      collection: "orders",
      overrideAccess: true,
      data: { channel: "online", service: "takeaway", status: "collected", paymentStatus: "paid", lines: [], totalCents: 0, member: m.id, customerName: "Eva Ruiz", customerEmail: m.email, customerPhone: "600000000", idempotencyKey: crypto.randomUUID() } as never,
    });
    await eraseMember(payload, m.id);
    const kept = await payload.findByID({ collection: "orders", id: order.id, overrideAccess: true, depth: 0 });
    expect(kept).toMatchObject({ customerName: "Eva", customerEmail: null, customerPhone: null, member: null });
    expect((await payload.find({ collection: "members", where: { email: { equals: "erase@example.com" } }, overrideAccess: true })).docs).toHaveLength(0);
  });

  it("erases delivery addresses too, and the owner's delete in the admin does the same", async () => {
    const m = await member("erase-box@example.com", "Iris Gil");
    const order = await payload.create({
      collection: "orders",
      overrideAccess: true,
      data: { channel: "online", service: "takeaway", status: "ready", paymentStatus: "paid", lines: [], totalCents: 0, kind: "subscription", fulfilment: "shipping", member: m.id, customerName: "Iris Gil", customerEmail: m.email, shipTo: { name: "Iris Gil", phone: "600111222", line1: "Calle Real, 1", postalCode: "30001", city: "Murcia", province: "Murcia" }, idempotencyKey: crypto.randomUUID() } as never,
    });
    // The owner deletes the member from the admin (not the member's own page).
    await payload.delete({ collection: "members", id: m.id, overrideAccess: true });
    const kept = await payload.findByID({ collection: "orders", id: order.id, overrideAccess: true, depth: 0 });
    expect(kept).toMatchObject({ customerEmail: null, member: null });
    expect(kept.shipTo).toMatchObject({ name: null, phone: null, line1: null, postalCode: null, city: null });
  });

  it("refuses to erase a member whose subscription Stripe may still charge", async () => {
    const m = await member("erase-sub@example.com");
    await payload.update({ collection: "members", id: m.id, overrideAccess: true, data: { subscriptionStatus: "active" } as never });
    await expect(eraseMember(payload, m.id)).rejects.toThrow();
    expect((await payload.findByID({ collection: "members", id: m.id, overrideAccess: true })).id).toBe(m.id);
  });

  it("does not let a manager create a founding member", async () => {
    const manager = await staff(payload, "mgr-create@test.local", "manager", "Manager");
    const created = await payload.create({ collection: "members", data: { name: "Fake", email: "fake-founder@example.com", tier: "founding" } as never, user: manager, overrideAccess: false });
    expect(created.tier).toBe("customer");
  });
});

describe("founding membership", () => {
  it("stays closed until price, IVA and the switch are set", async () => {
    expect((await foundingSettings(payload)).open).toBe(false);
    const m = await member("f0@example.com");
    expect(await startFounding(payload, m, "es", "http://x")).toEqual({ ok: false, error: "closed" });
  });

  it("charges through Stripe, invoices once, and numbers founders in order", async () => {
    const rate = await payload.create({ collection: "tax-rates", overrideAccess: true, data: { name: "IVA general test", rateBasisPoints: 2100 } as never });
    await payload.updateGlobal({ slug: "business", data: { foundingOpen: true, foundingPriceCents: 9000, foundingCap: 2, foundingTaxRate: rate.id } });
    const a = await member("f1@example.com");
    const b = await member("f2@example.com");
    const start = async (m: typeof a) => {
      const r = await startFounding(payload, m, "es", "http://x");
      if (!r.ok) throw new Error(r.error);
      const body = new URLSearchParams(fetchMock.mock.calls.at(-1)![1].body);
      return Number(body.get("metadata[orderId]"));
    };
    const oa = await start(a);
    const ob = await start(b);
    // Stripe retries the webhook: still one payment, one invoice, one number.
    await Promise.all([completeFounding(payload, oa, "pi_a", 9000), completeFounding(payload, oa, "pi_a", 9000)]);
    await completeFounding(payload, ob, "pi_b", 9000);
    const ma = await payload.findByID({ collection: "members", id: a.id, overrideAccess: true });
    const mb = await payload.findByID({ collection: "members", id: b.id, overrideAccess: true });
    expect([ma.tier, ma.foundingNumber, mb.foundingNumber]).toEqual(["founding", 1, 2]);
    expect((await payload.find({ collection: "invoices", where: { order: { equals: oa } }, overrideAccess: true })).docs).toHaveLength(1);
    expect((await payload.find({ collection: "payments", where: { order: { equals: oa } }, overrideAccess: true })).docs).toHaveLength(1);
    // A wrong amount never grants membership.
    const c = await member("f3@example.com");
    await payload.updateGlobal({ slug: "business", data: { foundingCap: 5 } });
    const oc = await start(c);
    await completeFounding(payload, oc, "pi_c", 1);
    expect((await payload.findByID({ collection: "members", id: c.id, overrideAccess: true })).tier).toBe("customer");
    // Full: the offer closes.
    await payload.updateGlobal({ slug: "business", data: { foundingCap: 2 } });
    expect((await foundingSettings(payload)).open).toBe(false);
  });
});

describe("events", () => {
  it("never sells more seats than the room has, even in a race", async () => {
    const ev = await payload.create({
      collection: "events",
      overrideAccess: true,
      data: { title: "Cata", when: "Sábado", description: "Prueba", membersOnly: false, startsAt: new Date(Date.now() + 7 * 86400000).toISOString(), capacity: 3 },
    });
    const people = await Promise.all(["e1", "e2", "e3", "e4", "e5"].map((n) => member(`${n}@example.com`)));
    const results = await Promise.all(people.map((p) => rsvp(payload, p, ev.id, 1)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok && r.error === "full")).toHaveLength(2);
    const listed = (await listEvents(payload, "es")).find((e) => e.id === ev.id);
    expect(listed).toMatchObject({ bookable: true, remaining: 0 });
    // Cancelling frees the seat.
    const going = people[results.findIndex((r) => r.ok)];
    expect(await rsvp(payload, going, ev.id, 0)).toMatchObject({ ok: true });
    expect((await listEvents(payload, "es")).find((e) => e.id === ev.id)?.remaining).toBe(1);
  });

  it("keeps members-only events for founding members", async () => {
    const ev = await payload.create({
      collection: "events",
      overrideAccess: true,
      data: { title: "Ceremonia", when: "Domingo", description: "Prueba", membersOnly: true, startsAt: new Date(Date.now() + 86400000).toISOString(), capacity: 10 },
    });
    expect(await rsvp(payload, await member("plain@example.com"), ev.id, 1)).toEqual({ ok: false, error: "members-only" });
    const founder = (await payload.find({ collection: "members", where: { email: { equals: "f1@example.com" } }, overrideAccess: true })).docs[0];
    expect(await rsvp(payload, founder, ev.id, 2)).toEqual({ ok: true, seats: 2 });
  });
});

describe("email letters", () => {
  it("goes only to opted-in members in the letter's language, once, with unsubscribe", async () => {
    const yes = await member("yes@example.com");
    const en = await member("yes-en@example.com");
    await payload.update({ collection: "members", id: yes.id, overrideAccess: true, data: { emailOptIn: true } });
    await payload.update({ collection: "members", id: en.id, overrideAccess: true, data: { emailOptIn: true, locale: "en" } });
    const c = await payload.create({ collection: "campaigns", overrideAccess: true, data: { subject: "Otoño", title: "Otoño", body: "Hola.\n\nAdiós.", audience: "all", locale: "es", status: "draft" } });
    const recipients = await campaignRecipients(payload, c);
    expect(recipients.map((m) => m.email)).toEqual(["yes@example.com"]);
    fetchMock.mockClear();
    expect(await sendCampaign(payload, c)).toBe(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent[0].headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent[0].html).toContain("<p>Hola.</p><p>Adiós.</p>");
    expect((await payload.findByID({ collection: "campaigns", id: c.id, overrideAccess: true })).status).toBe("sent");
    await expect(payload.update({ collection: "campaigns", id: c.id, overrideAccess: true, data: { subject: "otra vez" } })).rejects.toThrow();

    expect(await unsubscribe(payload, unsubscribeToken(yes.id))).toBe(true);
    expect((await campaignRecipients(payload, c)).length).toBe(0);
    expect(await unsubscribe(payload, "forged")).toBe(false);
  });
});

describe("security review fixes", () => {
  it("flags a second founding payment for refund instead of granting twice", async () => {
    const founder = (await payload.find({ collection: "members", where: { email: { equals: "f1@example.com" } }, overrideAccess: true })).docs[0];
    const order = await payload.create({
      collection: "orders",
      overrideAccess: true,
      data: {
        kind: "membership", channel: "online", service: "takeaway", status: "collected", paymentStatus: "unpaid", payOnline: true,
        lines: [{ name: "Socio fundador", quantity: 1, unitCents: 9000, taxRateBasisPoints: 2100, modifiers: [] }],
        totalCents: 9000, taxBreakdown: [{ rateBasisPoints: 2100, grossCents: 9000, baseCents: 7438, taxCents: 1562 }],
        member: founder.id, customerEmail: founder.email, idempotencyKey: crypto.randomUUID(),
      } as never,
    });
    await completeFounding(payload, order.id, "pi_twice", 9000);
    const o = await payload.findByID({ collection: "orders", id: order.id, overrideAccess: true });
    expect(o.note).toMatch(/^DEVOLVER/);
    expect((await payload.findByID({ collection: "members", id: founder.id, overrideAccess: true })).foundingNumber).toBe(1);
  });

  it("refuses a second checkout while one is pending", async () => {
    await payload.updateGlobal({ slug: "business", data: { foundingCap: 50 } });
    const m = await member("twotabs@example.com");
    expect((await startFounding(payload, m, "es", "http://x")).ok).toBe(true);
    expect(await startFounding(payload, m, "es", "http://x")).toEqual({ ok: false, error: "pending" });
  });

  it("does not let staff forge consent or founding status", async () => {
    const manager = await staff(payload, "mgr-m@test.local", "manager", "Marta");
    const m = await member("consent@example.com");
    await payload.update({ collection: "members", id: m.id, user: manager, overrideAccess: false, data: { emailOptIn: true, tier: "founding", foundingNumber: 99 } });
    const after = await payload.findByID({ collection: "members", id: m.id, overrideAccess: true });
    expect(after).toMatchObject({ emailOptIn: false, tier: "customer" });
    expect(after.foundingNumber ?? null).toBeNull();
  });

  it("sends test letters only to the person saving", async () => {
    const owner = (await payload.find({ collection: "users", where: { email: { equals: "owner-m@test.local" } }, overrideAccess: true })).docs[0];
    const c = await payload.create({ collection: "campaigns", overrideAccess: true, data: { subject: "x", title: "x", body: "x", audience: "all", locale: "es", status: "draft" } });
    await expect(
      payload.update({ collection: "campaigns", id: c.id, user: owner, overrideAccess: false, data: { sendTestTo: "someone@else.com" } }),
    ).rejects.toThrow();
  });

  it("stores order emails in one spelling so erasure finds them", async () => {
    const o = await payload.create({
      collection: "orders",
      overrideAccess: true,
      data: { channel: "online", service: "takeaway", status: "collected", paymentStatus: "paid", lines: [], totalCents: 0, customerEmail: " Mixed@Example.COM ", idempotencyKey: crypto.randomUUID() } as never,
    });
    expect(o.customerEmail).toBe("mixed@example.com");
  });
});

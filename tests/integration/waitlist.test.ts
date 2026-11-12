import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";
import { joinWaitlist } from "@/lib/waitlist";
import { campaignRecipients } from "@/lib/campaigns";
import { POST } from "@/app/api/waitlist/route";
import { boot } from "./harness";

/**
 * The founding waiting list is kept in our own database (2026-11-12: with no
 * email service the sign-ups were thanked and dropped).
 */
let payload: Payload;
let n = 0;
const unique = () => `wl${Date.now()}${n++}@example.com`;
const find = async (email: string) =>
  (await payload.find({ collection: "members", overrideAccess: true, depth: 0, where: { email: { equals: email } } })).docs;

beforeAll(async () => {
  payload = await boot();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_AUDIENCE_ID;
});

const post = (body: unknown, ip = `10.9.${n}.${n++ % 250}`) =>
  POST(new Request("http://localhost/api/waitlist", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body) }));

describe("waiting list", () => {
  it("stores a sign-up as a waiting-list member with the email consent, once", async () => {
    const email = unique();
    expect(await joinWaitlist(payload, { name: "Ana", email: email.toUpperCase(), locale: "es" })).toBe("created");
    expect(await joinWaitlist(payload, { name: "Ana", email, locale: "es" })).toBe("exists");
    const docs = await find(email);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ tier: "waitlist", status: "active", emailOptIn: true, locale: "es", name: "Ana" });
    // The owner can write to them later through the email letters.
    const to = await campaignRecipients(payload, { audience: "all", locale: "es" } as never);
    expect(to.some((m) => m.email === email)).toBe(true);
  });

  it("never touches an existing member: anyone can type an address, so no letters switched back on", async () => {
    const email = unique();
    await payload.create({ collection: "members", overrideAccess: true, data: { name: "Founder", email, tier: "founding", status: "active", locale: "en", emailOptIn: false } });
    expect(await joinWaitlist(payload, { name: "Other", email, locale: "es" })).toBe("exists");
    expect((await find(email))[0]).toMatchObject({ tier: "founding", name: "Founder", locale: "en", emailOptIn: false });
  });

  it("never re-subscribes a member who left", async () => {
    const email = unique();
    await payload.create({ collection: "members", overrideAccess: true, data: { name: "Gone", email, tier: "customer", status: "cancelled", emailOptIn: false } });
    expect(await joinWaitlist(payload, { name: "Gone", email, locale: "es" })).toBe("exists");
    expect((await find(email))[0].emailOptIn).toBe(false);
  });

  it("two sign-ups at once for one address make one record", async () => {
    const email = unique();
    await Promise.all([1, 2, 3].map(() => joinWaitlist(payload, { name: "Ana", email, locale: "es" })));
    expect(await find(email)).toHaveLength(1);
  });

  it("the form keeps the sign-up with no email service configured", async () => {
    const email = unique();
    const res = await post({ name: "Lucía", email, locale: "es" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, degraded: true });
    expect((await find(email))[0]).toMatchObject({ tier: "waitlist", emailOptIn: true });
  });

  it("an email service failure does not lose a stored sign-up", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    const email = unique();
    const res = await post({ name: "Eva", email, locale: "en" });
    expect(res.status).toBe(200);
    expect(await find(email)).toHaveLength(1);
  });

  it("bad input stores nothing", async () => {
    const res = await post({ name: "", email: "not-an-email", locale: "es" });
    expect(res.status).toBe(400);
  });
});

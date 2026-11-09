import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";
import { query, sql } from "@/cms/db";
import { LIMITS, allowed, humanCheck } from "@/lib/limits";
import { boot } from "./harness";

/**
 * Shared rate limits (one locked-down SECURITY DEFINER function in Postgres)
 * and the Turnstile check (security audit 2026-11-09).
 */
let payload: Payload;
beforeAll(async () => {
  payload = await boot();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
});

describe("shared rate limits", () => {
  it("counts in the database: the limit holds, keys are independent", async () => {
    const rule = { key: `test:${Date.now()}`, limit: 2, windowSeconds: 60 };
    expect(await allowed(payload, [rule])).toBe(true);
    expect(await allowed(payload, [rule])).toBe(true);
    expect(await allowed(payload, [rule])).toBe(false);
    expect(await allowed(payload, [{ ...rule, key: `${rule.key}:other` }])).toBe(true);
  });

  it("stops a burst of sign-in links per address and per email", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200)}`;
    const results = [];
    for (let i = 0; i < 7; i++) results.push(await allowed(payload, LIMITS.signIn(ip, `burst${i}@example.com`)));
    expect(results.filter(Boolean)).toHaveLength(5); // 5 a minute per IP
    const one = `198.51.100.250`;
    const sameEmail = [];
    for (let i = 0; i < 6; i++) sameEmail.push(await allowed(payload, LIMITS.signIn(`${one}${i}`, "same@example.com")));
    expect(sameEmail.filter(Boolean)).toHaveLength(5); // 5 an hour per email, whatever the IP
  });

  it("is a locked-down SECURITY DEFINER function nobody else may call", async () => {
    const rows = await query(
      payload,
      sql`select p.prosecdef as definer, p.proconfig as config, has_function_privilege('public', 'payload.rate_limit_hit(text,integer,integer)', 'execute') as public_exec
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'payload' and p.proname = 'rate_limit_hit'`,
    );
    expect(rows[0]).toMatchObject({ definer: true, public_exec: false });
    expect(String(rows[0].config)).toContain("search_path=pg_catalog, pg_temp");
    const bad = await query(payload, sql`select payload.rate_limit_hit(${""}, 60, 5) as ok`);
    expect(bad[0].ok).toBe(false);
  });
});

describe("Turnstile", () => {
  it("is off without keys, and once on needs a valid token (fails closed)", async () => {
    expect(await humanCheck(undefined)).toBe(true);
    process.env.TURNSTILE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
    expect(await humanCheck(undefined)).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true }))));
    expect(await humanCheck("a-valid-looking-token", "203.0.113.1")).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false }))));
    expect(await humanCheck("a-valid-looking-token")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await humanCheck("a-valid-looking-token")).toBe(false);
  });
});

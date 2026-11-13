import type { Payload } from "payload";
import { query, sql } from "@/cms/db";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Shared rate limits (security audit 2026-11-09). Counted in Postgres by the
 * locked-down function payload.rate_limit_hit (see the rate_limits
 * migration), so the limit holds across every server instance and redeploy,
 * unlike lib/rateLimit.ts. If the database cannot be reached, the
 * per-instance limiter answers instead (never fully open).
 */
export type Rule = { key: string; limit: number; windowSeconds: number };

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

async function hit(payload: Payload, r: Rule) {
  try {
    const rows = await query(payload, sql`select payload.rate_limit_hit(${r.key}, ${r.windowSeconds}, ${r.limit}) as ok`);
    return rows[0]?.ok === true;
  } catch {
    return rateLimit(`fallback:${r.key}:${r.windowSeconds}`, Math.max(1, Math.ceil((r.limit * MIN) / r.windowSeconds)));
  }
}

/** Every rule must pass (all are counted, so a burst cannot dodge one of them). */
export async function allowed(payload: Payload, rules: Rule[]) {
  const results = await Promise.all(rules.map((r) => hit(payload, r)));
  return results.every(Boolean);
}

const norm = (email?: string | null) => (email ?? "").trim().toLowerCase().slice(0, 254);

/**
 * The public actions that send an email (each draws on Resend's daily
 * quota) or can lock someone out. Per address AND per email address, per
 * minute and per day.
 */
export const LIMITS = {
  waitlist: (ip: string, email?: string) => [
    { key: `waitlist:ip:${ip}`, limit: 5, windowSeconds: MIN },
    { key: `waitlist:ipday:${ip}`, limit: 20, windowSeconds: DAY },
    ...(email ? [{ key: `waitlist:email:${norm(email)}`, limit: 3, windowSeconds: DAY }] : []),
  ],
  signIn: (ip: string, email?: string) => [
    { key: `signin:ip:${ip}`, limit: 5, windowSeconds: MIN },
    { key: `signin:ipday:${ip}`, limit: 30, windowSeconds: DAY },
    ...(email ? [{ key: `signin:email:${norm(email)}`, limit: 5, windowSeconds: HOUR }] : []),
  ],
  order: (ip: string, email?: string) => [
    { key: `order:ip:${ip}`, limit: 6, windowSeconds: MIN },
    { key: `order:ipday:${ip}`, limit: 30, windowSeconds: DAY },
    ...(email ? [{ key: `order:email:${norm(email)}`, limit: 10, windowSeconds: DAY }] : []),
  ],
  forgotPassword: (ip: string, email?: string) => [
    { key: `forgot:ip:${ip}`, limit: 2, windowSeconds: MIN },
    { key: `forgot:ipday:${ip}`, limit: 10, windowSeconds: DAY },
    ...(email ? [{ key: `forgot:email:${norm(email)}`, limit: 3, windowSeconds: HOUR }] : []),
  ],
  login: (ip: string, email?: string) => [
    { key: `login:ip:${ip}`, limit: 10, windowSeconds: MIN },
    { key: `login:ipday:${ip}`, limit: 100, windowSeconds: DAY },
    ...(email ? [{ key: `login:email:${norm(email)}`, limit: 20, windowSeconds: HOUR }] : []),
  ],
} satisfies Record<string, (ip: string, email?: string) => Rule[]>;

/** The client's address as the platform reports it (Vercel's header cannot be forged). */
export function clientIp(h: Pick<Headers, "get"> | null | undefined) {
  return (h?.get("x-vercel-forwarded-for") ?? h?.get("x-real-ip") ?? h?.get("x-forwarded-for") ?? "").split(",")[0].trim();
}

/**
 * Cloudflare Turnstile, server side. Off (always passes) until both keys are
 * set; once on, a missing or bad token fails. Fails closed if Cloudflare
 * cannot be reached, so a bot cannot get through by timing out the check.
 */
const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export async function humanCheck(token: unknown, ip?: string) {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, ...(ip ? { remoteip: ip } : {}) });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

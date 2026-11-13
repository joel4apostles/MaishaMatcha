"use server";

import { headers } from "next/headers";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { rsvp } from "@/lib/events";
import { startFounding } from "@/lib/founding";
import { premiumPortal, startPremium, subscriptionLive } from "@/lib/premium";
import { eraseMember, revokeSessions, safeNext, sendSignInLink } from "@/lib/members";
import { clearMemberSession, currentMember } from "@/lib/members-server";
import { rateLimit } from "@/lib/rateLimit";
import { LIMITS, allowed, humanCheck } from "@/lib/limits";

/**
 * Member actions. Every one re-reads the session cookie; ids from the
 * client are never trusted for who the member is.
 */
const ip = async () => {
  const h = await headers();
  return (h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
};

const signInSchema = z.object({
  email: z.email().max(254),
  name: z.string().trim().max(80).optional(),
  locale: z.enum(["es", "en"]),
  next: z.string().max(200).optional(),
  turnstile: z.string().max(2048).optional(),
});

/** Always answers the same way, so it cannot tell who has an account. */
export async function requestSignInAction(input: z.infer<typeof signInSchema>): Promise<{ ok: boolean; error?: string }> {
  const p = signInSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const addr = await ip();
  if (!rateLimit(`signin:${addr}`) || !rateLimit(`signin:${p.data.email.toLowerCase()}`, 3)) return { ok: false, error: "rate-limited" };
  // Shared across instances, per minute and per day (each link is an email).
  if (!(await allowed(await getPayload({ config }), LIMITS.signIn(addr, p.data.email)))) return { ok: false, error: "rate-limited" };
  if (!(await humanCheck(p.data.turnstile, addr))) return { ok: false, error: "challenge" };
  await sendSignInLink(p.data.email, p.data.locale, p.data.name, safeNext(p.data.next)).catch(() => undefined);
  return { ok: true };
}

export async function signOutAction() {
  await clearMemberSession();
  return { ok: true };
}

export async function signOutEverywhereAction() {
  const m = await currentMember();
  if (m) await revokeSessions(await getPayload({ config }), m.id);
  await clearMemberSession();
  return { ok: true };
}

const prefsSchema = z.object({ name: z.string().trim().min(1).max(80), emailOptIn: z.boolean(), locale: z.enum(["es", "en"]) });

export async function updatePrefsAction(input: z.infer<typeof prefsSchema>) {
  const m = await currentMember();
  if (!m) return { ok: false, error: "signed-out" };
  const p = prefsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  // Consent time recorded when letters are switched on, cleared when off.
  const consentAt = p.data.emailOptIn ? (m.emailOptIn ? undefined : new Date().toISOString()) : null;
  await (await getPayload({ config })).update({ collection: "members", id: m.id, overrideAccess: true, data: { ...p.data, ...(consentAt !== undefined ? { emailOptInAt: consentAt } : {}) } });
  return { ok: true };
}

export async function deleteAccountAction(confirmEmail: string) {
  const m = await currentMember();
  if (!m) return { ok: false, error: "signed-out" };
  if (String(confirmEmail).trim().toLowerCase() !== m.email) return { ok: false, error: "confirm" };
  const payload = await getPayload({ config });
  // A live subscription would keep charging with nobody left to credit:
  // cancel it in the portal first (security review 2026-11-09).
  if (await subscriptionLive(payload, m.id)) return { ok: false, error: "subscribed" };
  await eraseMember(payload, m.id);
  await clearMemberSession();
  return { ok: true };
}

export async function startFoundingAction(locale: "es" | "en") {
  const m = await currentMember();
  if (!m) return { ok: false as const, error: "signed-out" };
  if (!rateLimit(`founding:${m.id}`, 5)) return { ok: false as const, error: "rate-limited" };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? null : `http://${(await headers()).get("host")}`);
  if (!base) return { ok: false as const, error: "closed" };
  return startFounding(await getPayload({ config }), m, locale === "en" ? "en" : "es", base);
}

export async function rsvpAction(eventId: number, seats: number) {
  const m = await currentMember();
  if (!m) return { ok: false as const, error: "signed-out" };
  if (!rateLimit(`rsvp:${m.id}`, 10)) return { ok: false as const, error: "rate-limited" };
  if (!Number.isInteger(eventId) || eventId <= 0) return { ok: false as const, error: "invalid" };
  return rsvp(await getPayload({ config }), m, eventId, seats);
}

async function siteBase() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? null : `http://${(await headers()).get("host")}`);
}

export async function startPremiumAction(locale: "es" | "en", delivery: "pickup" | "shipping" = "pickup") {
  const m = await currentMember();
  if (!m) return { ok: false as const, error: "signed-out" };
  if (!rateLimit(`premium:${m.id}`, 5)) return { ok: false as const, error: "rate-limited" };
  const base = await siteBase();
  if (!base) return { ok: false as const, error: "closed" };
  return startPremium(await getPayload({ config }), m, locale === "en" ? "en" : "es", base, delivery === "shipping" ? "shipping" : "pickup");
}

export async function premiumPortalAction(locale: "es" | "en") {
  const m = await currentMember();
  if (!m) return { ok: false as const, error: "signed-out" };
  if (!rateLimit(`portal:${m.id}`, 5)) return { ok: false as const, error: "rate-limited" };
  const base = await siteBase();
  if (!base) return { ok: false as const, error: "closed" };
  return premiumPortal(m, `${base}/${locale === "en" ? "en/account" : "es/cuenta"}`);
}

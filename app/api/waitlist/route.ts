import { createElement } from "react";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { getPayload } from "payload";
import config from "@payload-config";
import { rateLimit } from "@/lib/rateLimit";
import { LIMITS, allowed, humanCheck } from "@/lib/limits";
import { joinWaitlist } from "@/lib/waitlist";
import { confirmUrl } from "@/lib/members";
import { WaitlistConfirmation } from "@/emails/waitlist-confirmation";

export const runtime = "nodejs";

// Reject control characters (CRLF, NUL, DEL, etc.) in the name.
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((s) => !CONTROL_CHARS.test(s), "invalid characters"),
  email: z.email().max(254),
  locale: z.enum(["es", "en"]),
  // The "Acepto recibir noticias" box, on every path (review 2026-11-13).
  consent: z.literal(true),
});

const FROM = process.env.RESEND_FROM ?? "maisha matcha <hola@maishamatcha.es>";

const subjects = {
  es: "Tu plaza en la lista de maisha matcha",
  en: "Your place on the maisha matcha list",
} as const;

// Prefer proxy-trusted client IP. On Vercel, x-vercel-forwarded-for is set by
// the platform and cannot be spoofed by the client (unlike x-forwarded-for),
// so the rate limiter can't be trivially bypassed by rotating a fake header.
function clientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

export async function POST(request: Request) {
  // No-JavaScript fallback: the form POSTs form-encoded data and the visitor
  // is sent back to the founding section (303) instead of seeing JSON.
  const isForm = /application\/x-www-form-urlencoded|multipart\/form-data/.test(
    request.headers.get("content-type") ?? "",
  );
  let formLocale: "es" | "en" = "es";
  const reply = (body: Record<string, unknown>, status = 200) => {
    if (!isForm) return NextResponse.json(body, { status });
    const outcome = status < 300 ? "ok" : "error";
    return NextResponse.redirect(new URL(`/${formLocale}?waitlist=${outcome}#socios`, request.url), 303);
  };

  if (!rateLimit(clientIp(request))) {
    return reply({ error: "rate_limited" }, 429);
  }

  let json: unknown;
  let token: unknown;
  try {
    if (isForm) {
      const form = await request.formData();
      formLocale = form.get("locale") === "en" ? "en" : "es";
      if (form.get("consent") !== "on") return reply({ error: "consent_required" }, 400);
      json = { name: form.get("name"), email: form.get("email"), locale: formLocale, consent: true };
      token = form.get("cf-turnstile-response");
    } else {
      json = await request.json();
      token = (json as { turnstile?: unknown } | null)?.turnstile;
    }
  } catch {
    return reply({ error: "invalid_body" }, 400);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return reply({ error: "invalid_input" }, 400);
  }
  const { name, email, locale } = parsed.data;

  // Shared limits (every instance) and, once its keys are set, Turnstile.
  const payload = await getPayload({ config }).catch(() => null);
  if (payload && !(await allowed(payload, LIMITS.waitlist(clientIp(request), email)))) return reply({ error: "rate_limited" }, 429);
  if (!(await humanCheck(token, clientIp(request)))) return reply({ error: "challenge_failed" }, 400);

  // Our own record first: the sign-up is kept even with no email service.
  let stored = false;
  let memberId: number | null = null;
  if (payload) {
    try {
      memberId = (await joinWaitlist(payload, { name, email, locale })).id;
      stored = true;
    } catch (error) {
      console.error("[waitlist] could not store the sign-up:", error instanceof Error ? error.message : "unknown");
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  // No email service: fine when the sign-up is stored; never claim success
  // for a sign-up kept nowhere.
  if (!apiKey || !audienceId) {
    if (!stored) return reply({ error: "send_failed" }, 503);
    console.info("[waitlist] stored; no Resend env, no confirmation email", { locale });
    return reply({ ok: true, degraded: true });
  }

  try {
    const resend = new Resend(apiKey);

    await resend.contacts.create({
      audienceId,
      email,
      firstName: name,
      unsubscribed: false,
    });

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: subjects[locale],
      react: createElement(WaitlistConfirmation, { locale, name, confirmUrl: memberId ? confirmUrl(memberId) : undefined }),
    });

    // A confirm link went out: the form asks them to open it.
    return reply({ ok: true, confirm: Boolean(memberId) });
  } catch (error) {
    console.error("[waitlist] Resend error:", error);
    // Stored with us: the place is kept even if the email did not go out.
    return stored ? reply({ ok: true, degraded: true }) : reply({ error: "send_failed" }, 502);
  }
}

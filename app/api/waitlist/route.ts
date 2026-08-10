import { createElement } from "react";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rateLimit";
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
});

const FROM = process.env.RESEND_FROM ?? "maisha matcha <hola@maishamatcha.es>";

const subjects = {
  es: "Bienvenido a maisha",
  en: "Welcome to maisha",
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
  if (!rateLimit(clientIp(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { name, email, locale } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  // Graceful degradation: without env, log (no PII in production) and succeed.
  if (!apiKey || !audienceId) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[waitlist] no Resend env; payload:", { name, email, locale });
    } else {
      console.info("[waitlist] no Resend env; skipped send", { locale });
    }
    return NextResponse.json({ ok: true, degraded: true });
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
      react: createElement(WaitlistConfirmation, { locale, name }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[waitlist] Resend error:", error);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { escapeHtml } from "@/lib/email";
import { consumeSignIn, readSignInToken, sessionToken } from "@/lib/members";
import { MEMBER_COOKIE, memberCookieOptions } from "@/lib/members-server";

/**
 * The emailed sign-in link. GET only shows "Entrar como x@…" with a button:
 * link scanners that prefetch create nothing, and nobody can be signed in
 * to someone else's account just by opening a link (login CSRF). The POST
 * from that button consumes the link and sets the session.
 */
const site = (request: Request) => process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

const page = (lang: string, body: string) =>
  new NextResponse(
    `<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>maisha matcha</title>
<body style="background:#F5F1E8;color:#1C1B18;font-family:Helvetica,Arial,sans-serif;max-width:32rem;margin:0 auto;padding:4rem 1.5rem;line-height:1.6">
<p style="font-family:Georgia,serif;letter-spacing:.08em">maisha matcha</p>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );

export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  const p = readSignInToken(t);
  if (!p) return NextResponse.redirect(`${site(request)}/es/cuenta?enlace=caducado`, 303);
  const es = p.l === "es";
  return page(
    p.l,
    `<h1 style="font-family:Georgia,serif;font-weight:300">${es ? "Entrar" : "Sign in"}</h1>
<p>${es ? "Vas a entrar como" : "You are signing in as"} <strong style="font-weight:500">${escapeHtml(p.e)}</strong>.</p>
<form method="post" action="/api/members/sign-in?t=${encodeURIComponent(t)}"><button style="min-height:48px;padding:0 1.5rem;background:#1C1B18;color:#F5F1E8;border:0;border-radius:2px;font-size:15px">${es ? "Entrar" : "Sign in"}</button></form>
<p style="font-size:13px;opacity:.7;margin-top:2rem">${es ? "Si no lo pediste tú, cierra esta página." : "If you did not ask for this, close this page."}</p>`,
  );
}

export async function POST(request: Request) {
  const base = site(request);
  const payload = await getPayload({ config });
  const done = await consumeSignIn(payload, new URL(request.url).searchParams.get("t") ?? "").catch(() => null);
  if (!done) return NextResponse.redirect(`${base}/es/cuenta?enlace=caducado`, 303);
  const account = done.locale === "en" ? "/en/account" : "/es/cuenta";
  const member = await payload.findByID({ collection: "members", id: done.member.id, depth: 0, overrideAccess: true, showHiddenFields: true });
  const res = NextResponse.redirect(`${base}${done.next ?? account}`, 303);
  res.cookies.set(MEMBER_COOKIE, sessionToken(member), memberCookieOptions());
  res.headers.set("Cache-Control", "no-store");
  return res;
}

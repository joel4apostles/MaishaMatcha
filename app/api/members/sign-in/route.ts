import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { consumeSignIn, readSignInToken, sessionToken } from "@/lib/members";
import { MEMBER_COOKIE, memberCookieOptions } from "@/lib/members-server";

/**
 * Sign-in links. The email opens the confirm page (/es/cuenta/entrar); its
 * button POSTs here, which consumes the link and sets the session.
 */
const site = (request: Request) => process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

/** Old or direct links: show the confirm page in the link's language. */
export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  const p = readSignInToken(t);
  const path = p?.l === "en" ? "/en/account/sign-in" : "/es/cuenta/entrar";
  return NextResponse.redirect(`${site(request)}${path}?t=${encodeURIComponent(t)}`, 303);
}

export async function POST(request: Request) {
  const base = site(request);
  // Only our own confirm page may submit a link (no cross-site login CSRF).
  // Browsers send Sec-Fetch-Site; the confirm page's no-referrer policy
  // makes Origin "null", so Origin is only the fallback for old browsers.
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const sameOrigin = fetchSite ? fetchSite === "same-origin" : origin === new URL(base).origin;
  if (!sameOrigin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
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

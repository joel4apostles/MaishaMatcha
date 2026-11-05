import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { consumeSignIn, sessionToken } from "@/lib/members";
import { MEMBER_COOKIE, memberCookieOptions } from "@/lib/members-server";

/**
 * The emailed sign-in link lands here. A valid link signs the member in and
 * goes to their account (or the page they came from); an expired or forged
 * one goes to the account page with a quiet notice.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const payload = await getPayload({ config });
  const done = await consumeSignIn(payload, url.searchParams.get("t") ?? "").catch(() => null);
  if (!done) return NextResponse.redirect(`${base}/es/cuenta?enlace=caducado`, 303);
  const account = done.locale === "en" ? "/en/account" : "/es/cuenta";
  const member = await payload.findByID({ collection: "members", id: done.member.id, depth: 0, overrideAccess: true, showHiddenFields: true });
  const res = NextResponse.redirect(`${base}${done.next ?? account}`, 303);
  res.cookies.set(MEMBER_COOKIE, sessionToken(member), memberCookieOptions());
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

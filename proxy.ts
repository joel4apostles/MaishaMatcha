import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * Public pages: next-intl picks the locale. The admin: pass the path on as
 * a request header, so the authenticator check (payload-totp) can tell the
 * code screen from the rest and send a session that still owes a code
 * there. Set, never appended: a client cannot supply its own.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const headers = new Headers(request.headers);
    headers.set("x-pathname", pathname);
    // Spanish first, like the salon: until someone picks a language in
    // Account (kept in the payload-lng cookie), the browser's language does
    // not decide. Otherwise the sign-in screen opened in English. The cookie
    // is set too, so the API's messages (a wrong code) follow.
    const chosen = request.cookies.has("payload-lng");
    if (!chosen) headers.set("accept-language", "es");
    const response = NextResponse.next({ request: { headers } });
    if (!chosen) response.cookies.set("payload-lng", "es", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return response;
  }
  return intl(request);
}

export const config = {
  // Every path except API, media uploads, the counter (pos, kds), Next
  // internals and files with an extension. The admin is included (above).
  matcher: ["/((?!api|media|pos(?:/|$)|kds(?:/|$)|_next|_vercel|.*\\..*).*)"],
};

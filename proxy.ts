import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except API, the Payload admin, Next internals, media
  // uploads, and files with an extension.
  matcher: ["/((?!api|admin|media|_next|_vercel|.*\\..*).*)"],
};

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withPayload } from "@payloadcms/next/withPayload";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Baseline security headers on every route (site, /pos, /admin). The CSP
 * holds only directives that cannot break Next or Payload (no script-src
 * yet: that needs nonces). Framing is refused everywhere: nothing here is
 * meant to be embedded, and it closes clickjacking on /pos and /admin.
 * Camera stays available to our own origin for the planned receipt scanner.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(self), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This project lives inside a parent folder that also has a lockfile;
  // pin the tracing root so Next resolves files from this app only.
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPayload(withNextIntl(nextConfig));

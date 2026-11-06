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

/**
 * The counter (POS, KDS) holds a staff session: there, scripts, workers and
 * connections may only come from this site (the scanner's text recognition
 * is self-hosted in public/vendor/tesseract). Inline scripts stay allowed
 * because Next's bootstrap needs them without nonces; wasm needs
 * 'wasm-unsafe-eval'. Dev adds 'unsafe-eval' for React's dev tooling.
 */
const posCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data:",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This project lives inside a parent folder that also has a lockfile;
  // pin the tracing root so Next resolves files from this app only.
  outputFileTracingRoot: process.cwd(),
  // Next 16 only serves listed qualities: 50 for textures under a veil.
  images: { qualities: [50, 75] },
  // The Spanish carta moved from /es/menu to /es/carta (2026-11-05):
  // keep old links and search results working.
  async redirects() {
    return [{ source: "/es/menu", destination: "/es/carta", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Later rules win for the same header: the counter gets the strict CSP.
      { source: "/pos/:path*", headers: [{ key: "Content-Security-Policy", value: posCsp }] },
      { source: "/pos", headers: [{ key: "Content-Security-Policy", value: posCsp }] },
      { source: "/kds", headers: [{ key: "Content-Security-Policy", value: posCsp }] },
    ];
  },
};

export default withPayload(withNextIntl(nextConfig));

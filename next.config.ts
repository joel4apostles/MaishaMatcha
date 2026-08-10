import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This project lives inside a parent folder that also has a lockfile;
  // pin the tracing root so Next resolves files from this app only.
  outputFileTracingRoot: process.cwd(),
};

export default withNextIntl(nextConfig);

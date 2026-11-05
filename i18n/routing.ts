import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  // Localized pathnames: canonical key -> per-locale segment.
  pathnames: {
    "/": "/",
    "/menu": {
      es: "/carta",
      en: "/menu",
    },
    "/pedir": {
      es: "/pedir",
      en: "/order",
    },
    "/pedido/[token]": {
      es: "/pedido/[token]",
      en: "/order-status/[token]",
    },
    "/tienda": {
      es: "/tienda",
      en: "/shop",
    },
    "/cuenta": {
      es: "/cuenta",
      en: "/account",
    },
    "/crea": {
      es: "/crea",
      en: "/create",
    },
    "/historia": {
      es: "/historia",
      en: "/story",
    },
    "/eventos": {
      es: "/eventos",
      en: "/events",
    },
    "/aviso-legal": {
      es: "/aviso-legal",
      en: "/legal-notice",
    },
    "/privacidad": {
      es: "/privacidad",
      en: "/privacy",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
/** Static pages only (links, sitemap, metadata); dynamic ones need params. */
export type AppPathname = Exclude<keyof typeof routing.pathnames, `${string}[${string}`>;

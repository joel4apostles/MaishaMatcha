import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  // Localized pathnames: canonical key -> per-locale segment.
  pathnames: {
    "/": "/",
    "/menu": "/menu",
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
export type AppPathname = keyof typeof routing.pathnames;

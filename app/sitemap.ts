import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppPathname } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";

const paths: AppPathname[] = [
  "/",
  "/menu",
  "/historia",
  "/eventos",
  "/aviso-legal",
  "/privacidad",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = SITE_URL + getPathname({ href: path, locale });
    }
    return {
      url: SITE_URL + getPathname({ href: path, locale: routing.defaultLocale }),
      alternates: { languages },
    };
  });
}

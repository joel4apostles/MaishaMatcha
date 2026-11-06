import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppPathname, type Locale } from "@/i18n/routing";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://maishamatcha.es";

const ogLocale: Record<Locale, string> = { es: "es_ES", en: "en_US" };

/**
 * Per-locale metadata with canonical + hreflang alternates and a branded OG
 * image. Paths are the internal (canonical) pathname keys; getPathname maps
 * each to its localized URL.
 */
/** A static page, or a shop product page (the one dynamic page we index). */
export type MetaPath = AppPathname | { pathname: "/tienda/[slug]"; params: { slug: string } };

export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: Locale;
  path: MetaPath;
  title: string;
  description: string;
  /** Absolute or root-relative image for link previews (a product photo). */
  image?: { url: string; alt: string } | null;
}): Metadata {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = getPathname({ href: path, locale: l });
  }
  languages["x-default"] = getPathname({
    href: path,
    locale: routing.defaultLocale,
  });

  const canonical = getPathname({ href: path, locale });
  const ogImage = image?.url ?? `/api/og?locale=${locale}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: "maisha matcha",
      locale: ogLocale[locale],
      url: canonical,
      title,
      description,
      images: image ? [{ url: ogImage, alt: image.alt }] : [{ url: ogImage, width: 1200, height: 630, alt: "maisha matcha" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

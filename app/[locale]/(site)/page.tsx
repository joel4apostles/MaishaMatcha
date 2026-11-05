import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { site } from "@/content/site";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { Hero } from "@/components/home/Hero";
import { Manifesto } from "@/components/home/Manifesto";
import { StoryTeaser } from "@/components/home/StoryTeaser";
import { MenuPreview } from "@/components/home/MenuPreview";
import { TheSpace } from "@/components/home/TheSpace";
import { Founding } from "@/components/home/Founding";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.home" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/",
    title: t("title"),
    description: t("description"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.home" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: "maisha matcha",
    description: t("description"),
    url: SITE_URL,
    servesCuisine: "Matcha",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address,
      addressLocality: site.city,
      addressCountry: "ES",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    sameAs: [site.instagramUrl],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Home />
    </>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <Manifesto />
      <StoryTeaser />
      <MenuPreview />
      <TheSpace />
      <Founding />
    </>
  );
}

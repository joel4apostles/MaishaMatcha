import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import { KigumiGrid } from "@/components/KigumiGrid";
import { QuietLink, buttonClass } from "@/components/Button";
import { WaitlistForm } from "@/components/WaitlistForm";
import { signatureItems } from "@/content/menu";
import { site } from "@/content/site";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

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
      <MenuPreview />
      <TheSpace />
      <Founding />
    </>
  );
}

function Hero() {
  const t = useTranslations("home.hero");
  const cta = useTranslations("cta");
  return (
    <section className="px-6 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-6 font-sans text-display font-medium lowercase tracking-tight text-gold">
            maisha matcha
          </h1>
          <p className="measure mt-6 text-lg text-sumi/80">{t("line")}</p>
          <div className="mt-10">
            <a href="#socios" className={buttonClass}>
              {cta("joinWaitlist")}
            </a>
          </div>
        </div>
        {/* The single kigumi motif for this page lives in the hero image. */}
        <div className="relative">
          <PlaceholderImage
            label={t("eyebrow")}
            subject="maisha"
            ratio="4 / 5"
            withMotif
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-3 -top-3 hidden h-24 w-24 opacity-[0.08] md:block"
          >
            <KigumiGrid />
          </div>
        </div>
      </div>
    </section>
  );
}

function Manifesto() {
  const t = useTranslations("home.manifesto");
  return (
    <Section aria-label={t("eyebrow")} className="border-t border-wood/15">
      <Reveal className="grid grid-cols-1 gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Headline className="mt-5">{t("title")}</Headline>
        </div>
        <div className="measure space-y-5 text-lg text-sumi/80">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
          <p>{t("p3")}</p>
          <figure className="mt-10 border-l border-wood/40 pl-5">
            <blockquote className="font-serif text-2xl font-light italic text-sumi">
              {t("quote")}
            </blockquote>
            <figcaption className="mt-2 text-eyebrow uppercase text-sumi/50">
              {t("quoteAuthor")}
            </figcaption>
          </figure>
        </div>
      </Reveal>
    </Section>
  );
}

function MenuPreview() {
  const t = useTranslations("home.menuPreview");
  const cta = useTranslations("cta");
  const locale = useLocale();
  const items = signatureItems();
  return (
    <Section aria-label={t("eyebrow")} className="border-t border-wood/15">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
        <ul className="mt-10 divide-y divide-wood/15 border-y border-wood/15">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5"
            >
              <div className="min-w-0">
                <p className="font-serif text-xl text-sumi">{item.name}</p>
                <p className="mt-1 text-sm text-sumi/70">
                  {item.description[locale]}
                </p>
              </div>
              <p className="shrink-0 font-serif text-lg text-sumi/80">
                {item.price}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <QuietLink href="/menu">{cta("toMenu")}</QuietLink>
        </div>
      </Reveal>
    </Section>
  );
}

function TheSpace() {
  const t = useTranslations("home.space");
  return (
    <Section aria-label={t("eyebrow")} className="border-t border-wood/15">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("body")}</p>
      </Reveal>
      <Reveal className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <PlaceholderImage label={t("alt1")} subject={t("caption1")} ratio="3 / 4" />
        <PlaceholderImage label={t("alt2")} subject={t("caption2")} ratio="3 / 4" />
        <PlaceholderImage label={t("alt3")} subject={t("caption3")} ratio="3 / 4" />
      </Reveal>
    </Section>
  );
}

function Founding() {
  const t = useTranslations("home.founding");
  const privileges = [t("privilege1"), t("privilege2"), t("privilege3")];
  return (
    <Section id="socios" className="border-t border-wood/15" as="section">
      <Reveal className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Headline className="mt-5">{t("title")}</Headline>
          <p className="measure mt-6 text-lg text-sumi/80">{t("body")}</p>
          <ul className="mt-8 space-y-3">
            {privileges.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sumi/80">
                <span
                  aria-hidden="true"
                  className="mt-3 h-px w-5 shrink-0 bg-wood/60"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <WaitlistForm />
        </div>
      </Reveal>
    </Section>
  );
}

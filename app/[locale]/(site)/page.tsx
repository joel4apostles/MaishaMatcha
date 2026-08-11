import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import salonRender from "@/public/images/salon.jpg";
import salonEstantes from "@/public/images/salon-estantes.jpg";
import salonBarra from "@/public/images/salon-barra.jpg";
import salonArbol from "@/public/images/salon-arbol.jpg";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { WordReveal } from "@/components/WordReveal";
import { ScrollInk } from "@/components/ScrollInk";
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

const riseDelay = (ms: number) =>
  ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

function Hero() {
  const t = useTranslations("home.hero");
  const cta = useTranslations("cta");
  return (
    <section className="relative flex min-h-[calc(100svh-9rem)] flex-col px-6 sm:min-h-[calc(100svh-5.5rem)] sm:px-8">
      {/* The single kigumi motif for this page: a full hero backdrop. */}
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.05]">
        <KigumiGrid />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center py-16 text-center">
        <p
          className="anim-rise text-eyebrow uppercase text-sumi/70"
          style={riseDelay(100)}
        >
          {t("eyebrow")}
        </p>
        <h1
          className="anim-rise mt-8 font-sans text-hero font-medium lowercase tracking-tight text-gold"
          style={riseDelay(280)}
        >
          maisha matcha
        </h1>
        <p className="mt-9 max-w-2xl font-serif text-poem font-light text-sumi/85">
          <WordReveal text={t("line")} baseDelay={500} step={70} />
        </p>
        <div className="anim-rise mt-12" style={riseDelay(1100)}>
          <a href="#socios" className={buttonClass}>
            {cta("joinWaitlist")}
          </a>
        </div>
      </div>

      <div
        className="anim-rise relative mx-auto mb-8 flex flex-col items-center gap-3"
        style={riseDelay(1500)}
      >
        <span className="text-eyebrow uppercase text-sumi/70">
          {t("scrollCue")}
        </span>
        <span aria-hidden="true" className="h-10 w-px bg-wood/60" />
      </div>
    </section>
  );
}

function Manifesto() {
  const t = useTranslations("home.manifesto");
  const inkClass =
    "measure font-serif text-2xl font-light leading-relaxed text-sumi sm:text-[1.75rem]";
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/15">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <Reveal>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Headline className="mt-5">{t("title")}</Headline>
        </Reveal>
        <div className="space-y-8">
          <ScrollInk text={t("p1")} className={inkClass} />
          <ScrollInk text={t("p2")} className={inkClass} />
          <ScrollInk text={t("p3")} className={inkClass} />
          <Reveal>
            <figure className="mt-10 border-l border-wood/40 pl-5">
              <blockquote className="font-serif text-2xl font-light italic text-sumi">
                {t("quote")}
              </blockquote>
              <figcaption className="mt-2 text-eyebrow uppercase text-sumi/70">
                {t("quoteAuthor")}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

const bentoSpans = [
  "sm:col-span-7",
  "sm:col-span-5",
  "sm:col-span-5",
  "sm:col-span-7",
];

function MenuPreview() {
  const t = useTranslations("home.menuPreview");
  const cta = useTranslations("cta");
  const locale = useLocale();
  const items = signatureItems();
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/15">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
      </Reveal>
      <Reveal className="mt-12">
        <ul className="group/menu grid grid-cols-1 gap-4 sm:grid-cols-12">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={`${bentoSpans[i]} flex min-h-[200px] flex-col justify-between rounded-[2px] border border-wood/25 bg-wood/[0.05] p-7 transition-opacity duration-300 ease-out group-hover/menu:opacity-75 hover:opacity-100! sm:p-9`}
            >
              <div>
                {item.origin ? (
                  <p className="text-eyebrow uppercase text-sumi/70">
                    {item.origin}
                  </p>
                ) : null}
                <p className="mt-3 font-serif text-3xl font-light text-sumi">
                  {item.name}
                </p>
                <p className="mt-3 max-w-md text-sumi/75">
                  {item.description[locale]}
                </p>
              </div>
              <p className="mt-8 font-serif text-xl text-sumi/85">
                {item.price}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <QuietLink href="/menu">{cta("toMenu")}</QuietLink>
        </div>
      </Reveal>
    </Section>
  );
}

function TheSpace() {
  const t = useTranslations("home.space");
  const details = [
    { src: salonEstantes, alt: t("alt1"), caption: t("caption1") },
    { src: salonBarra, alt: t("alt2"), caption: t("caption2") },
    { src: salonArbol, alt: t("alt3"), caption: t("caption3") },
  ];
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/15">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("body")}</p>
      </Reveal>

      {/* The salon, full bleed — the deck's project render. */}
      <Reveal className="mt-14">
        <figure className="bleed">
          <div className="group overflow-hidden">
            <Image
              src={salonRender}
              alt={t("altMain")}
              sizes="100vw"
              placeholder="blur"
              className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
          </div>
          <figcaption className="mx-auto mt-3 max-w-[1100px] px-6 text-eyebrow uppercase text-sumi/70 sm:px-8">
            {t("renderNote")}
          </figcaption>
        </figure>
      </Reveal>

      <Reveal className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5">
        {details.map((image) => (
          <figure key={image.caption} className="group">
            <div className="overflow-hidden rounded-[2px]">
              <Image
                src={image.src}
                alt={image.alt}
                sizes="(min-width: 640px) 33vw, 100vw"
                placeholder="blur"
                className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            </div>
            <figcaption className="mt-3 text-eyebrow uppercase text-sumi/70">
              {image.caption}
            </figcaption>
          </figure>
        ))}
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
          <p className="mt-6 font-serif text-2xl font-light text-sumi sm:text-3xl">
            {t("scarcity")}
          </p>
          <p className="measure mt-4 text-lg text-sumi/80">{t("body")}</p>
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

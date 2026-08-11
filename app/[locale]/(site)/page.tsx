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
import { QuietLink, buttonClass } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import { WaitlistForm } from "@/components/WaitlistForm";
import { TimelineRail } from "@/components/TimelineRail";
import { signatureItems } from "@/content/menu";
import { story } from "@/content/story";
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
      <StoryTeaser />
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
  const space = useTranslations("home.space");
  const cta = useTranslations("cta");
  return (
    <section className="dark-band relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden px-6 pt-16 sm:px-8">
      {/* The salon render at near-full warmth. */}
      <Image
        src={salonRender}
        alt={space("altMain")}
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-[60%_center]"
      />
      {/* Light unifying scrim; legibility comes from the ink panel below. */}
      <div aria-hidden="true" className="absolute inset-0 bg-sumi/25" />

      <div className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-end pb-24 pt-20">
        {/* Editorial ink panel: flat sumi, AA-safe on any crop or device. */}
        <div
          className="anim-rise max-w-2xl rounded-[2px] bg-sumi/70 p-7 sm:p-10"
          style={riseDelay(100)}
        >
          <p className="text-eyebrow uppercase text-washi/80">{t("eyebrow")}</p>
          <h1 className="mt-5 font-sans text-display font-medium lowercase tracking-tight text-washi">
            maisha matcha
          </h1>
          <p className="mt-6 max-w-xl font-serif text-poem font-light text-washi/90">
            <WordReveal text={t("line")} baseDelay={400} step={70} />
          </p>
          <div className="mt-9">
            <a href="#socios" className={buttonClass}>
              {cta("joinWaitlist")}
            </a>
          </div>
        </div>
      </div>

      {/* Quiet non-text scroll cue. */}
      <span
        aria-hidden="true"
        className="anim-rise absolute bottom-6 left-1/2 h-10 w-px -translate-x-1/2 bg-washi/60"
        style={riseDelay(1200)}
      />

      {/* Honesty note: project render, not a final photograph. */}
      <span className="absolute bottom-4 right-4 rounded-[2px] bg-sumi/60 px-2.5 py-1 text-eyebrow uppercase text-washi/80">
        {space("renderNote")}
      </span>
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

/** The four pivotal chapters told on the front page; the rest live in /historia. */
const TEASER_CHAPTERS = ["tang", "eisai", "rikyu", "murcia"];

function StoryTeaser() {
  const t = useTranslations("story");
  const cta = useTranslations("cta");
  const locale = useLocale();
  const chapters = story.filter((c) => TEASER_CHAPTERS.includes(c.id));
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/15">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
      </Reveal>

      <div className="relative mt-14 max-w-3xl">
        <TimelineRail />
        <ol className="pl-6 sm:pl-10">
          {chapters.map((chapter, i) => (
            <li key={chapter.id} className="relative pb-12 last:pb-0">
              <span
                aria-hidden="true"
                className="absolute -left-[calc(1.5rem+3px)] top-2 h-1.5 w-1.5 rounded-full bg-wood sm:-left-[calc(2.5rem+3px)]"
              />
              <Reveal delay={i * 120}>
                <Eyebrow>{chapter.era[locale]}</Eyebrow>
                <h3 className="mt-3 text-balance font-serif text-2xl font-light text-sumi sm:text-3xl">
                  {chapter.title[locale]}
                </h3>
                <p className="measure mt-3 text-sumi/80">
                  {chapter.body[locale]}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      <Reveal className="mt-10">
        <QuietLink href="/historia">{cta("toStory")}</QuietLink>
      </Reveal>
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
          {items.map(({ item, category }, i) => (
            <li key={item.id} className={`${bentoSpans[i]} flex`}>
              {/* Whole cell is a real link — the hover affordance is honest. */}
              <Link
                href="/menu"
                className="flex min-h-[200px] w-full flex-col justify-between rounded-[2px] border border-wood/30 p-7 transition-opacity duration-300 ease-out group-hover/menu:opacity-75 hover:opacity-100! sm:p-9"
              >
                <div>
                  <p className="text-eyebrow uppercase text-sumi/70">
                    {category.title[locale]}
                  </p>
                  <p className="mt-3 font-serif text-3xl font-light text-sumi">
                    {item.name}
                  </p>
                  <p className="mt-3 max-w-md text-sumi/75">
                    {item.description[locale]}
                  </p>
                </div>
                <div className="mt-8 flex items-baseline justify-between gap-4 border-t border-wood/15 pt-4">
                  <p className="font-serif text-xl text-sumi/85">{item.price}</p>
                  {item.origin ? (
                    <p className="text-eyebrow uppercase text-sumi/70">
                      {item.origin}
                    </p>
                  ) : null}
                </div>
              </Link>
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

      <Reveal className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5">
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
    // Inverted closing band: the page opens dark and closes dark.
    <Section id="socios" className="dark-band bg-sumi" as="section">
      <Reveal className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <p className="text-eyebrow font-medium uppercase text-washi/70">
            {t("eyebrow")}
          </p>
          <h2 className="mt-5 text-balance font-serif text-title font-light text-washi">
            {t("title")}
          </h2>
          <p className="mt-6 font-serif text-2xl font-light text-washi sm:text-3xl">
            {t("scarcity")}
          </p>
          <p className="measure mt-4 text-lg text-washi/80">{t("body")}</p>
          <ul className="mt-8 space-y-3">
            {privileges.map((p) => (
              <li key={p} className="flex items-start gap-3 text-washi/80">
                <span
                  aria-hidden="true"
                  className="mt-3 h-px w-5 shrink-0 bg-wood/70"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <WaitlistForm dark />
        </div>
      </Reveal>
    </Section>
  );
}

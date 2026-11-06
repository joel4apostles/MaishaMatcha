import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Eyebrow } from "@/components/Eyebrow";
import { Reveal } from "@/components/Reveal";
import { inkButtonClass, quietLinkClass } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import { carta, type CartaCategory, type CartaItem } from "@/content/carta";
import { cartaExtras, cartaGroup, itemSlug, priceLines } from "@/lib/carta";
import { TastingCard } from "@/components/TastingCard";
import { formatEuro } from "@/lib/money";
import { pageMetadata } from "@/lib/seo";
import drinkPhoto from "@/public/images/drink-real.jpg";
import type { Locale } from "@/i18n/routing";
import { Numeral } from "@/components/Numeral";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.menu" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/menu",
    title: t("title"),
    description: t("description"),
  });
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <MenuContent />;
}

/** Section markers on the carta: kanji numerals, the brand's motif kit. */
const NUMERALS = ["一", "二", "三", "四", "五", "六"];

const byslug = (slug: string) => carta.find((c) => c.slug === slug);
const hairline = "border-wood/35";

function Numbered({ index, children, id }: { index: number; children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-eyebrow uppercase text-sumi/70">
      <Numeral>{NUMERALS[index]}</Numeral>
      {children}
    </h2>
  );
}

function Swatch({ color, size = "size-11" }: { color: string; size?: string }) {
  // The drink, seen from above.
  return <span aria-hidden="true" className={`${size} shrink-0 rounded-full ring-1 ring-sumi/15`} style={{ backgroundColor: color }} />;
}

function MenuContent() {
  const t = useTranslations("menu");
  const cta = useTranslations("cta");
  const locale = useLocale() as Locale;
  const extras = cartaExtras(locale);
  const latteDelta = cartaGroup("preparacion-matcha").options.find((o) => o.key === "prep.latte")?.priceDeltaCents ?? 0;
  const index = new Map(carta.map((c, i) => [c.slug, i]));
  const matcha = byslug("matcha");
  const teas = byslug("otros-tes");
  const small = carta.filter((c) => c.slug !== "matcha" && c.slug !== "otros-tes");

  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-[1100px] pb-24 sm:pb-32">
        {/* Opening: the title, and one brushed phrase standing beside it. */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 pt-16 pb-12 sm:gap-12 sm:pt-28 sm:pb-20">
          <Reveal>
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="mt-6 max-w-[12ch] text-balance font-serif text-hero font-light text-sumi">{t("title")}</h1>
            <p className="measure mt-7 text-lg text-sumi/80">{t("intro")}</p>
          </Reveal>
          <div>
            <span
              lang="ja"
              aria-hidden="true"
              className="ink-write block select-none font-brush text-[clamp(1.9rem,2vw+1.2rem,3.25rem)] leading-[1.12] text-sumi [writing-mode:vertical-rl]"
              style={{ animationDelay: "300ms" }}
            >
              和敬清寂
            </span>
            <span className="sr-only">{t("phrase")}</span>
          </div>
        </header>

        {/* Jump to a section (a long page on a phone). */}
        <nav aria-label={t("sectionsAria")} className={`grid grid-cols-2 gap-x-6 border-y ${hairline} py-1 sm:flex sm:flex-wrap sm:gap-x-8`}>
          {carta.map((c) => (
            <a
              key={c.slug}
              href={`#${c.slug}`}
              className="inline-flex min-h-[44px] items-center text-sm text-sumi/80 underline decoration-wood/40 underline-offset-4 transition-colors hover:text-sumi hover:decoration-sumi/70"
            >
              {c.title[locale]}
            </a>
          ))}
        </nav>

        {matcha ? (
          <section id={matcha.slug} aria-labelledby={`${matcha.slug}-title`} className="scroll-mt-24 pt-20 sm:pt-24">
            <Reveal>
              <Numbered index={index.get(matcha.slug)!} id={`${matcha.slug}-title`}>
                {matcha.title[locale]}
              </Numbered>
            </Reveal>
            <ul className={`mt-10 grid grid-cols-1 gap-px border ${hairline} bg-wood/35 md:grid-cols-3`}>
              {matcha.items.map((item) => (
                <TastingCard key={itemSlug(item)} item={item} locale={locale} prepareLabel={t("prepare", { name: item.name })} />
              ))}
            </ul>
          </section>
        ) : null}

        {/* Your way: the latte photograph beside the milks and extras. */}
        <section id="extras" aria-labelledby="extras-title" className="grid scroll-mt-24 grid-cols-1 items-center gap-10 pt-20 sm:pt-28 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16">
          <Reveal>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[26rem] overflow-hidden rounded-[2px] md:mx-0 md:aspect-[4/5]">
              <Image
                src={drinkPhoto}
                alt={t("photoAlt")}
                placeholder="blur"
                fill
                sizes="(min-width: 768px) 416px, 90vw"
                className="object-cover object-center"
              />
            </div>
          </Reveal>
          <Reveal>
            <Eyebrow>{t("yoursEyebrow")}</Eyebrow>
            <h2 id="extras-title" className="mt-5 font-serif text-display font-light text-sumi">
              {t("yoursTitle")}
            </h2>
            <p className="measure mt-5 text-sumi/80">{t("yoursBody", { delta: formatEuro(latteDelta, locale) })}</p>
            <ul className={`mt-7 border-t ${hairline}`}>
              {extras.map((extra) => (
                <li key={extra.key} className="flex items-baseline justify-between gap-6 border-b border-wood/25 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sumi">{extra.label}</p>
                    {extra.note ? <p className="mt-0.5 text-sm text-sumi/70">{extra.note}</p> : null}
                  </div>
                  <p className="shrink-0 text-sumi/85 tabular-nums">+{extra.price}</p>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Link href="/crea" className={quietLinkClass}>
                {cta("create")}
              </Link>
            </div>
          </Reveal>
        </section>

        {teas ? (
          <section id={teas.slug} aria-labelledby={`${teas.slug}-title`} className="scroll-mt-24 pt-20 sm:pt-28">
            <Reveal>
              <Numbered index={index.get(teas.slug)!} id={`${teas.slug}-title`}>
                {teas.title[locale]}
              </Numbered>
              <ul className={`mt-8 border-t ${hairline}`}>
                {teas.items.map((item) => (
                  <li
                    key={itemSlug(item)}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-4 border-b border-wood/30 py-7 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-8"
                  >
                    <Swatch color={item.color} />
                    <div>
                      <h3 className="font-serif text-[1.75rem] font-light leading-tight text-sumi sm:text-[2.1rem]">{item.name}</h3>
                      <p className="mt-1.5 max-w-[60ch] text-sumi/80">{item.description[locale]}</p>
                    </div>
                    <Prices item={item} locale={locale} className="col-start-2 sm:col-start-3 sm:text-right" />
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-16 pt-20 sm:pt-28 md:grid-cols-2">
          {small.map((category: CartaCategory) => (
            <section key={category.slug} id={category.slug} aria-labelledby={`${category.slug}-title`} className="scroll-mt-24">
              <Reveal>
                <Numbered index={index.get(category.slug)!} id={`${category.slug}-title`}>
                  {category.title[locale]}
                </Numbered>
                <ul className={`mt-8 border-t ${hairline}`}>
                  {category.items.map((item) => (
                    <li key={itemSlug(item)} className="flex items-baseline justify-between gap-6 border-b border-wood/30 py-5">
                      <div className="min-w-0">
                        <h3 className="font-serif text-2xl font-light text-sumi">{item.name}</h3>
                        <p className="mt-1 text-sumi/75">{item.description[locale]}</p>
                      </div>
                      <Prices item={item} locale={locale} className="shrink-0 text-right" />
                    </li>
                  ))}
                </ul>
              </Reveal>
            </section>
          ))}
        </div>

        <footer className="mt-12 flex items-end justify-between gap-6">
          <p className="min-w-0 max-w-[60ch] text-sm text-sumi/70">{t("priceNote")}</p>
          <span
            lang="ja"
            aria-hidden="true"
            className="grid size-9 select-none place-items-center rounded-[2px] border border-sumi/70 font-brush text-[0.85rem] leading-[1.05] text-sumi [writing-mode:vertical-rl]"
          >
            抹茶
          </span>
        </footer>

        {/* Closing: the carta leads back to the founding list. */}
        <Reveal className="mt-16 max-w-3xl">
          <p className="font-serif text-2xl font-light text-sumi">{t("closing")}</p>
          <div className="mt-7">
            <a href={`/${locale}#socios`} className={inkButtonClass}>
              {cta("joinWaitlist")}
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Prices({ item, locale, className = "" }: { item: CartaItem; locale: Locale; className?: string }) {
  const t = useTranslations("menu");
  const lines = priceLines(item, locale);
  return (
    <dl className={`grid gap-1 text-sumi/85 ${className}`}>
      {lines.map((line, i) => (
        <div key={line.label ?? i} className="flex items-baseline justify-between gap-4 sm:justify-end">
          <dt className={line.label ? "text-sumi/80" : "sr-only"}>{line.label ?? t("price")}</dt>
          <dd className="font-serif text-xl tabular-nums">{line.price}</dd>
        </div>
      ))}
    </dl>
  );
}

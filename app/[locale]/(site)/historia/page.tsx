import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import salonArbol from "@/public/images/salon-arbol.jpg";
import { inkButtonClass, quietLinkClass } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import { StageReveal } from "@/components/StageReveal";
import { StageWords } from "@/components/StageWords";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { TimelineRail } from "@/components/TimelineRail";
import { StoryVisual } from "@/components/StoryVisual";
import { story } from "@/content/story";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";
import { Numeral } from "@/components/Numeral";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.story" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/historia",
    title: t("title"),
    description: t("description"),
  });
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <StoryContent />;
}

/** Chapter markers on the rail: kanji numerals, as on the home path and the carta. */
const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八"];

function StoryContent() {
  const t = useTranslations("story");
  const space = useTranslations("home.space");
  const cta = useTranslations("cta");
  const locale = useLocale() as Locale;
  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-[1100px] pb-24 sm:pb-32">
        {/* Opening: the title, and one brushed phrase standing beside it. */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 pt-16 pb-14 sm:gap-12 sm:pt-28 sm:pb-24">
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
              温故知新
            </span>
            <span className="sr-only">{t("phrase")}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,40rem)_1fr] lg:gap-16">
          <div className="relative">
            <TimelineRail />
            <ol className="pl-9 sm:pl-12">
              {story.map((chapter, i) => (
                <li
                  key={chapter.id}
                  data-story-id={chapter.id}
                  className="relative pb-14 last:pb-0 sm:pb-20"
                >
                  {/* The path's marker: the numeral sits on the rail, cutting it. */}
                  <Numeral className="absolute -left-9 top-0 -translate-x-1/2 bg-washi sm:-left-12">{NUMERALS[i]}</Numeral>
                  {/* Dramatic staged entrance: era, then title word by word, then body. */}
                  <StageReveal>
                    {/* Phones and tablets: the era's character sits with its chapter
                        (desktop shows it large in the sticky panel instead). */}
                    {chapter.glyph ? (
                      <div data-s aria-hidden="true" style={{ "--sd": "0ms" } as CSSProperties} className="mb-3 lg:hidden">
                        <span className="select-none font-brush text-[4.25rem] leading-none text-matcha/45">{chapter.glyph}</span>
                      </div>
                    ) : null}
                    <div data-s style={{ "--sd": "0ms" } as CSSProperties}>
                      <Eyebrow>{chapter.era[locale]}</Eyebrow>
                    </div>
                    <Headline as="h2" className="mt-3 text-4xl sm:text-5xl">
                      <StageWords text={chapter.title[locale]} baseDelay={200} step={80} />
                    </Headline>
                    <div data-s style={{ "--sd": "550ms" } as CSSProperties}>
                      <p className="measure mt-5 text-lg text-sumi/80">{chapter.body[locale]}</p>
                    </div>
                  </StageReveal>
                  {/* The origin chapter hands over to the three matchas on the carta. */}
                  {chapter.id === "uji" ? (
                    <Reveal className="mt-6">
                      <Link href={{ pathname: "/menu", hash: "matcha" }} className={quietLinkClass}>
                        {t("toCarta")}
                      </Link>
                    </Reveal>
                  ) : null}
                  {/* One breath of imagery, at the wabi-sabi chapter: the tree. */}
                  {chapter.id === "wabisabi" ? (
                    <Reveal className="mt-10 max-w-sm">
                      <figure>
                        <div className="overflow-hidden rounded-[2px]">
                          <Image
                            src={salonArbol}
                            alt={space("alt3")}
                            sizes="(min-width: 640px) 384px, 100vw"
                            placeholder="blur"
                            className="h-auto w-full"
                          />
                        </div>
                        <figcaption className="mt-3 text-eyebrow uppercase text-sumi/70">{space("caption3")}</figcaption>
                      </figure>
                    </Reveal>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {/* The visual matches the history: era emblems crossfade per chapter. */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <StoryVisual items={story.map((c) => ({ id: c.id, glyph: c.glyph, era: c.era[locale] }))} />
            </div>
          </div>
        </div>

        {/* Closing: history hands over to the founding list, under the seal. */}
        <Reveal className="mt-24 border-t border-wood/35 pt-10 sm:mt-28">
          <div className="flex items-start justify-between gap-8">
            <div className="max-w-3xl">
              <p className="font-serif text-2xl font-light text-sumi">{t("closing")}</p>
              <div className="mt-7">
                <a href={`/${locale}#socios`} className={inkButtonClass}>
                  {cta("joinWaitlist")}
                </a>
              </div>
            </div>
            <span
              lang="ja"
              aria-hidden="true"
              className="grid size-9 shrink-0 select-none place-items-center rounded-[2px] border border-sumi/70 font-brush text-[0.85rem] leading-[1.05] text-sumi [writing-mode:vertical-rl]"
            >
              抹茶
            </span>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

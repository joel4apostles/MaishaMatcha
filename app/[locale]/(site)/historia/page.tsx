import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import salonArbol from "@/public/images/salon-arbol.jpg";
import { inkButtonClass } from "@/components/Button";
import { StageReveal } from "@/components/StageReveal";
import { StageWords } from "@/components/StageWords";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { TimelineRail } from "@/components/TimelineRail";
import { StoryVisual } from "@/components/StoryVisual";
import { story } from "@/content/story";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

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

function StoryContent() {
  const t = useTranslations("story");
  const space = useTranslations("home.space");
  const cta = useTranslations("cta");
  const locale = useLocale();
  return (
    <Section>
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline as="h1" className="mt-5 text-display">
          {t("title")}
        </Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,40rem)_1fr] lg:gap-16">
      <div className="relative">
        <TimelineRail />
        <ol className="pl-6 sm:pl-10">
        {story.map((chapter) => (
          <li
            key={chapter.id}
            data-story-id={chapter.id}
            className="relative pb-12 last:pb-0 sm:pb-16"
          >
            <span
              aria-hidden="true"
              className="absolute -left-[calc(1.5rem+3px)] top-2.5 h-1.5 w-1.5 rounded-full bg-wood sm:-left-[calc(2.5rem+3px)]"
            />
            {/* Dramatic staged entrance: era, then title word by word, then body. */}
            <StageReveal>
              {/* Phones and tablets: the era's character sits with its chapter
                  (desktop shows it large in the sticky panel instead). */}
              {chapter.glyph ? (
                <div data-s aria-hidden="true" style={{ "--sd": "0ms" } as CSSProperties} className="mb-4 lg:hidden">
                  <span className="select-none font-brush text-[5.5rem] leading-none text-matcha/40">{chapter.glyph}</span>
                </div>
              ) : null}
              <div data-s style={{ "--sd": "0ms" } as CSSProperties}>
                <Eyebrow>{chapter.era[locale]}</Eyebrow>
              </div>
              <Headline as="h2" className="mt-3 text-4xl sm:text-5xl">
                <StageWords
                  text={chapter.title[locale]}
                  baseDelay={200}
                  step={80}
                />
              </Headline>
              <div data-s style={{ "--sd": "550ms" } as CSSProperties}>
                <p className="measure mt-5 text-lg text-sumi/80">
                  {chapter.body[locale]}
                </p>
              </div>
            </StageReveal>
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
                  <figcaption className="mt-3 text-eyebrow uppercase text-sumi/70">
                    {space("caption3")}
                  </figcaption>
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
          <StoryVisual
            items={story.map((c) => ({
              id: c.id,
              glyph: c.glyph,
              era: c.era[locale],
            }))}
          />
        </div>
      </div>
      </div>

      {/* Closing: history hands over to the founding list. */}
      <Reveal className="mt-20 max-w-3xl border-t border-wood/25 pt-10">
        <p className="font-serif text-2xl font-light text-sumi">
          {t("closing")}
        </p>
        <div className="mt-7">
          <a href={`/${locale}#socios`} className={inkButtonClass}>
            {cta("joinWaitlist")}
          </a>
        </div>
      </Reveal>
    </Section>
  );
}

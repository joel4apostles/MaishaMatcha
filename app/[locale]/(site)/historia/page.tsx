import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import salonArbol from "@/public/images/salon-arbol.jpg";
import { buttonClass } from "@/components/Button";
import { StageReveal } from "@/components/StageReveal";
import { StageWords } from "@/components/StageWords";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { TimelineRail } from "@/components/TimelineRail";
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
        <Headline as="h1" className="mt-5">
          {t("title")}
        </Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
      </Reveal>

      <div className="relative mt-16">
        <TimelineRail />
        <ol className="pl-6 sm:pl-10">
        {story.map((chapter) => (
          <li key={chapter.id} className="relative pb-16 last:pb-0">
            <span
              aria-hidden="true"
              className="absolute -left-[calc(1.5rem+3px)] top-2.5 h-1.5 w-1.5 rounded-full bg-wood sm:-left-[calc(2.5rem+3px)]"
            />
            {/* Dramatic staged entrance: era, then title word by word, then body. */}
            <StageReveal>
              <div data-s style={{ "--sd": "0ms" } as CSSProperties}>
                <Eyebrow>{chapter.era[locale]}</Eyebrow>
              </div>
              <Headline as="h2" className="mt-3 text-3xl sm:text-4xl">
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

      {/* Closing: history hands over to the founding list. */}
      <Reveal className="mt-20 max-w-3xl border-t border-wood/25 pt-10">
        <p className="font-serif text-2xl font-light text-sumi">
          {t("closing")}
        </p>
        <div className="mt-7">
          <a href={`/${locale}#socios`} className={buttonClass}>
            {cta("joinWaitlist")}
          </a>
        </div>
      </Reveal>
    </Section>
  );
}

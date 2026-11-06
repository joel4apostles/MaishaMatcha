import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { StageReveal } from "@/components/StageReveal";
import { StageWords } from "@/components/StageWords";
import { QuietLink } from "@/components/Button";
import { TimelineRail } from "@/components/TimelineRail";
import { StoryVisual } from "@/components/StoryVisual";
import { story } from "@/content/story";
import { stageDelay } from "./motion";

/** The four pivotal chapters told on the front page; the rest live in /historia. */
const TEASER_CHAPTERS = ["tang", "eisai", "rikyu", "murcia"];
/** Phones tell only the first and last of them; the full four from sm up. */
const PHONE_CHAPTERS = new Set(["tang", "murcia"]);

export function StoryTeaser() {
  const t = useTranslations("story");
  const cta = useTranslations("cta");
  const locale = useLocale();
  const chapters = story.filter((c) => TEASER_CHAPTERS.includes(c.id));
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/25">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,40rem)_1fr] lg:gap-16">
      <div className="relative max-w-3xl">
        <TimelineRail />
        <ol className="pl-6 sm:pl-10">
          {chapters.map((chapter) => (
            <li
              key={chapter.id}
              data-story-id={chapter.id}
              className={`relative pb-12 last:pb-0 ${PHONE_CHAPTERS.has(chapter.id) ? "" : "hidden sm:list-item"}`}
            >
              <span
                aria-hidden="true"
                className="absolute -left-[calc(1.5rem+3px)] top-2 h-1.5 w-1.5 rounded-full bg-wood sm:-left-[calc(2.5rem+3px)]"
              />
              {/* Dramatic staged entrance: era, then title word by word, then body. */}
              <StageReveal>
                {chapter.glyph ? (
                  <div data-s aria-hidden="true" style={stageDelay(0)} className="mb-4 lg:hidden">
                    <span className="select-none font-brush text-[4.5rem] leading-none text-matcha/40">{chapter.glyph}</span>
                  </div>
                ) : null}
                <div data-s style={stageDelay(0)}>
                  <Eyebrow>{chapter.era[locale]}</Eyebrow>
                </div>
                <h3 className="mt-3 text-balance font-serif text-3xl font-light text-sumi sm:text-4xl">
                  <StageWords
                    text={chapter.title[locale]}
                    baseDelay={200}
                    step={80}
                  />
                </h3>
                <div data-s style={stageDelay(550)}>
                  <p className="measure mt-3 text-sumi/80">
                    {chapter.body[locale]}
                  </p>
                </div>
              </StageReveal>
            </li>
          ))}
        </ol>
      </div>

      {/* The visual matches the history: era emblems crossfade per chapter. */}
      <div className="hidden lg:block">
        <Reveal className="sticky top-24">
          <StoryVisual
            items={chapters.map((c) => ({
              id: c.id,
              glyph: c.glyph,
              era: c.era[locale],
            }))}
          />
        </Reveal>
      </div>
      </div>

      <Reveal className="mt-10">
        <QuietLink href="/historia">{cta("toStory")}</QuietLink>
      </Reveal>
    </Section>
  );
}

import { useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { ScrollInk } from "@/components/ScrollInk";

export function Manifesto() {
  const t = useTranslations("home.manifesto");
  const inkClass =
    "measure font-serif text-2xl font-light leading-relaxed text-sumi sm:text-[1.75rem]";
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/25">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <Reveal>
          <Eyebrow numeral="一">{t("eyebrow")}</Eyebrow>
          <Headline className="mt-5">{t("title")}</Headline>
          {/* Paz stands beside the prose as its epigraph, not under it as a footnote. */}
          <figure className="mt-10 border-l border-wood/40 pl-5 md:mt-14">
            <blockquote lang="es" className="text-balance font-serif text-3xl font-light italic leading-snug text-sumi sm:text-[2.25rem]">
              {t("quote")}
            </blockquote>
            {t("quoteNote") ? <p className="mt-2 text-sumi/70">{t("quoteNote")}</p> : null}
            <figcaption className="mt-3 text-eyebrow uppercase text-sumi/70">{t("quoteAuthor")}</figcaption>
          </figure>
        </Reveal>
        <div className="space-y-8">
          <ScrollInk text={t("p1")} className={inkClass} />
          <ScrollInk text={t("p2")} className={inkClass} />
          <ScrollInk text={t("p3")} className={inkClass} />
        </div>
      </div>
    </Section>
  );
}


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


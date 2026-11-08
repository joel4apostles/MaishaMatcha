import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { QuietLink } from "@/components/Button";
import { TastingCard } from "@/components/TastingCard";
import { PourVideo } from "@/components/PourVideo";
import { carta } from "@/content/carta";
import { itemSlug } from "@/lib/carta";
import type { Locale } from "@/i18n/routing";

/**
 * The carta on the home page: the three matchas as the same tasting cards
 * the carta page uses (one source, one look), then one way onward. Beside
 * the title, on the right, a real pour at the bar (PourVideo).
 */
export function MenuPreview() {
  const t = useTranslations("home.menuPreview");
  const menu = useTranslations("menu");
  const cta = useTranslations("cta");
  const locale = useLocale() as Locale;
  const matchas = carta.find((c) => c.slug === "matcha")?.items ?? [];
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/25">
      {/* The words on the left like every numbered section above, the pour
          beside them on the right (founder, 2026-11-08: one reading line).
          Bottom-aligned: "see the full menu" sits on the caption's line. */}
      <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-20">
        <Reveal>
          <Eyebrow numeral="三">{t("eyebrow")}</Eyebrow>
          <Headline className="mt-5">{t("title")}</Headline>
          <p className="measure mt-5 text-lg text-sumi/80">{t("line")}</p>
          <div className="mt-7">
            <QuietLink href="/menu">{cta("toMenu")}</QuietLink>
          </div>
        </Reveal>
        <Reveal>
          <PourVideo className="mx-auto w-full max-w-[22rem] md:mr-0" />
        </Reveal>
      </div>
      <Reveal className="mt-14">
        {/* Phones: a swipeable row (82% cells, the brand's gallery rule). md+: three columns. */}
        <ul className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-3 md:gap-px md:overflow-visible md:border md:border-wood/35 md:bg-wood/35 md:px-0 md:pb-0 [&>li]:w-[82%] [&>li]:shrink-0 [&>li]:snap-start [&>li]:border [&>li]:border-wood/35 md:[&>li]:w-auto md:[&>li]:border-0">
          {matchas.map((item) => (
            <TastingCard key={itemSlug(item)} item={item} locale={locale} prepareLabel={menu("prepare", { name: item.name })} />
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}

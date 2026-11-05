import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { QuietLink } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import { itemSlug, priceLines, signatureItems } from "@/lib/carta";
import type { Locale } from "@/i18n/routing";

const bentoSpans = [
  "sm:col-span-7",
  "sm:col-span-5",
  "sm:col-span-5",
  "sm:col-span-7",
];

export function MenuPreview() {
  const t = useTranslations("home.menuPreview");
  const cta = useTranslations("cta");
  const locale = useLocale() as Locale;
  const items = signatureItems();
  return (
    <Section ariaLabel={t("eyebrow")} className="border-t border-wood/25">
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline className="mt-5">{t("title")}</Headline>
      </Reveal>
      <Reveal className="mt-12">
        {/* Phones: hairline rows like the carta page. sm+: the bento of cards. */}
        <ul className="group/menu grid grid-cols-1 border-t border-wood/30 sm:grid-cols-12 sm:gap-4 sm:border-t-0">
          {items.map(({ item, category }, i) => (
            <li key={itemSlug(item)} className={`${bentoSpans[i]} flex`}>
              {/* Whole cell is a real link — the hover affordance is honest. */}
              <Link
                href="/menu"
                style={{ "--drink": item.color } as CSSProperties}
                className="flex w-full flex-col justify-between border-b border-wood/30 py-5 transition-[opacity,background-color,border-color] duration-300 ease-out group-hover/menu:opacity-90 hover:border-[color-mix(in_srgb,var(--drink)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--drink)_10%,transparent)] hover:opacity-100! sm:min-h-[200px] sm:rounded-[2px] sm:border sm:border-wood/40 sm:p-9"
              >
                <div>
                  <div className="hidden items-center justify-between gap-4 sm:flex">
                    <p className="text-eyebrow uppercase text-sumi/70">
                      {category.title[locale]}
                    </p>
                    {/* The drink, seen from above. */}
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-sumi/10"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                  <p className="flex items-center gap-3 font-serif text-2xl font-light text-sumi sm:mt-3 sm:text-3xl">
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-sumi/15 sm:hidden"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </p>
                  <p className="mt-3 hidden max-w-md text-sumi/75 sm:block">
                    {item.description[locale]}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 sm:mt-8 sm:justify-between sm:border-t sm:border-wood/25 sm:pt-4">
                  {priceLines(item, locale).map((line) => (
                    <p key={line.label ?? "price"} className="flex items-baseline gap-2">
                      {line.label ? (
                        <span className="text-eyebrow uppercase text-sumi/70">{line.label}</span>
                      ) : null}
                      <span className="font-serif text-xl text-sumi/85 tabular-nums">{line.price}</span>
                    </p>
                  ))}
                </div>
              </Link>
            </li>
          ))}
          {/* Fifth cell: compose your own. */}
          <li className="flex sm:col-span-12">
            <Link
              href="/crea"
              className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-wood/30 py-5 transition-[opacity,background-color,border-color] duration-300 ease-out group-hover/menu:opacity-90 hover:border-matcha/50 hover:bg-matcha/[0.06] hover:opacity-100! sm:rounded-[2px] sm:border sm:border-wood/40 sm:p-9"
            >
              <div>
                <p className="text-eyebrow uppercase text-sumi/70">
                  {t("createEyebrow")}
                </p>
                <p className="mt-2 font-serif text-2xl font-light text-sumi sm:mt-3 sm:text-3xl">
                  {cta("create")}
                </p>
              </div>
            </Link>
          </li>
        </ul>
        <div className="mt-10">
          <QuietLink href="/menu">{cta("toMenu")}</QuietLink>
        </div>
      </Reveal>
    </Section>
  );
}

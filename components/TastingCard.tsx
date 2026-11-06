import { useTranslations } from "next-intl";
import { quietLinkClass } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import type { CartaItem } from "@/content/carta";
import { itemSlug, priceLines, tastingNotes } from "@/lib/carta";
import type { Locale } from "@/i18n/routing";

/** One matcha as a tasting card: grade, name, region, notes, the two ways to drink it. */
export function TastingCard({ item, locale, prepareLabel }: { item: CartaItem; locale: Locale; prepareLabel: string }) {
  const t = useTranslations("menu");
  return (
    <li className="flex flex-col bg-washi px-7 pt-9 pb-8 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <span aria-hidden="true" className="size-11 shrink-0 rounded-full ring-1 ring-sumi/15" style={{ backgroundColor: item.color }} />
        {item.grade ? <p className="text-eyebrow uppercase text-leaf">{item.grade[locale]}</p> : null}
      </div>
      <h3 className="mt-9 font-serif text-[clamp(2.75rem,3vw+1.5rem,3.5rem)] font-light leading-none text-sumi">{item.name}</h3>
      {item.origin ? <p className="mt-2.5 text-sm text-sumi/70">{item.origin[locale]}</p> : null}
      <p className="mt-6 mb-8 text-[1.0625rem] text-sumi/85">{tastingNotes(item, locale)}</p>
      <dl className="mt-auto grid gap-1.5 border-t border-wood/35 pt-5">
        {priceLines(item, locale).map((line, i) => (
          <div key={line.label ?? i} className="flex items-baseline justify-between gap-4">
            <dt className="text-sumi/80">{line.label ?? t("price")}</dt>
            <dd className="font-serif text-xl text-sumi tabular-nums">{line.price}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">
        <Link href={{ pathname: "/crea", query: { r: `${itemSlug(item)}.base` } }} className={quietLinkClass}>
          {prepareLabel}
        </Link>
      </div>
    </li>
  );
}

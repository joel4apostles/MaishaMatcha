import { carta, cartaGroups, type CartaCategory, type CartaGroup, type CartaItem } from "@/content/carta";
import type { Locale } from "@/i18n/routing";
import { formatEuro } from "@/lib/money";

/**
 * Presentation helpers for the public carta. Prices are derived from the
 * same data the counter uses (base price + option delta), so the website
 * can never disagree with the till.
 */
export type PriceLine = { label: string | null; price: string };

const groupBySlug = new Map(cartaGroups.map((g) => [g.slug, g]));

export function cartaGroup(slug: string): CartaGroup {
  const g = groupBySlug.get(slug);
  if (!g) throw new Error(`unknown carta group ${slug}`);
  return g;
}

/** "Usucha 8,80 € · Latte 10,20 €" for drinks with a preparation choice, else one price. */
export function priceLines(item: CartaItem, locale: Locale): PriceLine[] {
  const prep = item.groups.map((s) => groupBySlug.get(s)).find((g) => g?.slug.startsWith("preparacion"));
  if (!prep) return [{ label: null, price: formatEuro(item.priceCents, locale) }];
  return prep.options.map((o) => ({
    label: o.label[locale],
    price: formatEuro(item.priceCents + o.priceDeltaCents, locale),
  }));
}

/** The extras offered on drinks, in carta order. */
export function cartaExtras(locale: Locale) {
  return cartaGroup("extras").options.map((o) => ({
    key: o.key,
    label: o.label[locale],
    note: o.note?.[locale],
    price: formatEuro(o.priceDeltaCents, locale),
  }));
}

export function signatureItems(): { item: CartaItem; category: CartaCategory }[] {
  return carta.flatMap((category) =>
    category.items.filter((i) => i.signature).map((item) => ({ item, category })),
  );
}

export const itemSlug = (item: CartaItem) =>
  item.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");

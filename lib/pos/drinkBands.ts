import type { CatalogItem } from "./pricing";

export type Band = { id: string; color: string; grow: number; label: string };

/**
 * The till's picture of the drink being built: its layers top to bottom, as
 * in the cup (the same idea as the site's LayerColumn). Coconut Cloud on
 * top, the tea, the milk when it is a latte, then any purées. Items without
 * layers (a mochi, a juice) are one field of their own colour. Built only
 * from the catalog (item colour, option hues), so the owner's changes show.
 */
export function drinkBands(item: Pick<CatalogItem, "name" | "color" | "groups">, modifierKeys: string[]): Band[] {
  const chosen = item.groups.flatMap((g) => g.options.filter((o) => modifierKeys.includes(o.key)).map((o) => ({ ...o, group: g.slug })));
  const latte = chosen.some((o) => /latte/.test(o.key));
  const layered = item.groups.some((g) => g.options.some((o) => o.hue));
  if (!layered) {
    const label = chosen.map((o) => o.label).join(" · ") || item.name;
    return [{ id: "item", color: item.color, grow: 1, label }];
  }
  const bands: Band[] = [];
  const cloud = chosen.find((o) => /cloud/.test(o.key));
  if (cloud) bands.push({ id: cloud.key, color: cloud.hue || "#F4EFE3", grow: 1, label: cloud.label });
  const prep = chosen.find((o) => o.group.startsWith("preparacion"));
  bands.push({ id: "tea", color: item.color, grow: latte ? 5 : 8, label: latte || !prep ? item.name : `${item.name}, ${prep.label.toLowerCase()}` });
  const milk = chosen.find((o) => o.group === "leche");
  if (latte && milk) bands.push({ id: milk.key, color: milk.hue || "#F1EADB", grow: 4, label: milk.label });
  for (const o of chosen) {
    if (o === cloud || o === milk || o === prep || !o.hue) continue;
    bands.push({ id: o.key, color: o.hue, grow: 1.6, label: o.label });
  }
  return bands;
}

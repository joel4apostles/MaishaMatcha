import { carta, type CartaItem, type CartaOption } from "@/content/carta";
import { cartaGroup, itemSlug } from "@/lib/carta";

/**
 * The recipe builder's logic, built on the real carta: the same teas,
 * preparations, milks and extras (and the same prices) as the menu page and
 * the counter. Pure functions, unit tested in tests/unit/recipe.test.ts.
 */
export type RecipeIds = {
  /** Tea slug: uji, nishio, kagoshima, hojicha, black-tea. */
  tea: string;
  /** "base" = usucha (matcha) or solo (tea); "latte" adds milk. */
  prep: "base" | "latte";
  /** Milk key suffix (vaca, avena); only used for lattes. */
  milk: string;
  /** Extra key suffixes, in carta order. */
  extras: string[];
};

export type Recipe = {
  tea: CartaItem;
  prep: CartaOption;
  milk: CartaOption | null;
  extras: CartaOption[];
};

/** Teas the builder offers: every carta item with a preparation choice. */
export const builderTeas: CartaItem[] = carta
  .flatMap((c) => c.items)
  .filter((i) => i.groups.some((g) => g.startsWith("preparacion")));

const prepGroupOf = (tea: CartaItem) =>
  cartaGroup(tea.groups.find((g) => g.startsWith("preparacion"))!);

/** [usucha or solo, latte] for a tea, straight from its carta group. */
export const prepOptionsFor = (tea: CartaItem) => {
  const [base, latte] = prepGroupOf(tea).options;
  return { base, latte };
};

export const builderMilks = cartaGroup("leche").options;
export const builderExtras = cartaGroup("extras").options;

const suffix = (o: CartaOption) => o.key.slice(o.key.indexOf(".") + 1);

export const DEFAULT_RECIPE: RecipeIds = {
  tea: "nishio",
  prep: "latte",
  milk: suffix(builderMilks[0]),
  extras: [],
};

export function resolveRecipe(ids: RecipeIds): Recipe {
  const tea = builderTeas.find((t) => itemSlug(t) === ids.tea) ?? builderTeas[0];
  const [base, latte] = prepGroupOf(tea).options;
  const prep = ids.prep === "latte" ? latte : base;
  const milk =
    ids.prep === "latte"
      ? (builderMilks.find((m) => suffix(m) === ids.milk) ?? builderMilks[0])
      : null;
  const extras = builderExtras.filter((e) => ids.extras.includes(suffix(e)));
  return { tea, prep, milk, extras };
}

/** IVA-included cents: the carta price, the preparation and every extra. */
export function priceCents(r: Recipe): number {
  return (
    r.tea.priceCents +
    r.prep.priceDeltaCents +
    (r.milk?.priceDeltaCents ?? 0) +
    r.extras.reduce((sum, e) => sum + e.priceDeltaCents, 0)
  );
}

const teaCode = (tea: CartaItem) =>
  tea.name.normalize("NFD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

/** What the barista reads at the counter, e.g. "NIS·LAT·AVE·CCL". */
export function displayCode(r: Recipe): string {
  return [teaCode(r.tea), r.prep.code, r.milk?.code, ...r.extras.map((e) => e.code)]
    .filter(Boolean)
    .join("·");
}

/** Share-link parameter, e.g. "nishio.latte.avena.coconut-cloud~ube" (~ survives URLs; + would decode to a space). */
export function toParam(ids: RecipeIds): string {
  const r = resolveRecipe(ids);
  return [
    itemSlug(r.tea),
    ids.prep,
    r.milk ? suffix(r.milk) : "no",
    r.extras.length ? r.extras.map(suffix).join("~") : "no",
  ].join(".");
}

/** Lenient parse: anything unknown falls back to the default, never throws. */
export function fromParam(param: string | null): RecipeIds {
  if (!param) return DEFAULT_RECIPE;
  const [tea, prep, milk, extras] = param.split(".");
  const known = new Set(builderExtras.map(suffix));
  return {
    tea: builderTeas.some((t) => itemSlug(t) === tea) ? tea : DEFAULT_RECIPE.tea,
    prep: prep === "latte" ? "latte" : prep === "base" ? "base" : DEFAULT_RECIPE.prep,
    milk: builderMilks.some((m) => suffix(m) === milk) ? milk : DEFAULT_RECIPE.milk,
    extras: (extras ?? "")
      .split("~")
      .filter((e, i, all) => known.has(e) && all.indexOf(e) === i),
  };
}

export function optionSuffix(o: CartaOption): string {
  return suffix(o);
}

/** The carta modifier keys of a recipe: the same keys the till and the web order use. */
export function recipeModifierKeys(r: Recipe): string[] {
  return [r.prep.key, ...(r.milk ? [r.milk.key] : []), ...r.extras.map((e) => e.key)];
}

/** Recipes kept on this device only (localStorage), newest first. */
export type SavedRecipe = { name: string; r: string };
export const SAVED_KEY = "maisha:recipes:v1";
export const MAX_SAVED = 12;

export function parseSaved(raw: string | null): SavedRecipe[] {
  try {
    const list = JSON.parse(raw ?? "[]");
    if (!Array.isArray(list)) return [];
    return list
      .filter((x): x is SavedRecipe => typeof x?.name === "string" && typeof x?.r === "string")
      .map((x) => ({ name: x.name.trim().slice(0, 40), r: toParam(fromParam(x.r)) }))
      .filter((x) => x.name)
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

/** Save (or rename) a recipe: one entry per name, newest first. */
export function addSaved(list: SavedRecipe[], name: string, r: string): SavedRecipe[] {
  const clean = name.trim().slice(0, 40);
  if (!clean) return list;
  return [{ name: clean, r }, ...list.filter((x) => x.name.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_SAVED);
}

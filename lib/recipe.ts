import {
  RECIPE_BASE_PRICE_CENTS,
  MATCHA_HUE,
  intensities,
  bases,
  fruits,
  temps,
  type Intensity,
  type Base,
  type Fruit,
  type Temp,
} from "@/content/recipe";

export type Recipe = {
  intensity: Intensity;
  base: Base;
  fruit: Fruit | null;
  temp: Temp;
};

export type RecipeIds = {
  intensity: Intensity["id"];
  base: Base["id"];
  fruit: Fruit["id"] | null;
  temp: Temp["id"];
};

export const DEFAULT_RECIPE: RecipeIds = {
  intensity: "clasico",
  base: "agua",
  fruit: null,
  temp: "frio",
};

export function resolveRecipe(ids: RecipeIds): Recipe {
  return {
    intensity:
      intensities.find((i) => i.id === ids.intensity) ?? intensities[1],
    base: bases.find((b) => b.id === ids.base) ?? bases[0],
    fruit: ids.fruit ? (fruits.find((f) => f.id === ids.fruit) ?? null) : null,
    temp: temps.find((t) => t.id === ids.temp) ?? temps[0],
  };
}

/** Total in cents: matcha base + intensity + base liquid + fruit. */
export function priceCents(recipe: Recipe): number {
  return (
    RECIPE_BASE_PRICE_CENTS +
    recipe.intensity.surchargeCents +
    recipe.base.surchargeCents +
    (recipe.fruit?.surchargeCents ?? 0)
  );
}

export function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** "2 g : 200 ml · 1:100" — the craft, stated plainly. */
export function ratioLabel(recipe: Recipe): string {
  const { grams } = recipe.intensity;
  const { ml } = recipe.base;
  const ratio = Math.round(ml / grams);
  const g = grams % 1 === 0 ? String(grams) : grams.toFixed(1).replace(".", ",");
  return `${g} g : ${ml} ml · 1:${ratio}`;
}

/** Human-readable recipe code, e.g. "CLA·TON·YUZ·F". */
export function displayCode(recipe: Recipe): string {
  return [
    recipe.intensity.code,
    recipe.base.code,
    recipe.fruit?.code,
    recipe.temp.code,
  ]
    .filter(Boolean)
    .join("·");
}

/** Compact URL param, e.g. "clasico.tonica.yuzu.frio" (fruit "no" if none). */
export function toParam(ids: RecipeIds): string {
  return [ids.intensity, ids.base, ids.fruit ?? "no", ids.temp].join(".");
}

export function fromParam(param: string | null): RecipeIds {
  if (!param) return DEFAULT_RECIPE;
  const [i, b, f, t] = param.split(".");
  return {
    intensity: intensities.some((x) => x.id === i)
      ? (i as Intensity["id"])
      : DEFAULT_RECIPE.intensity,
    base: bases.some((x) => x.id === b) ? (b as Base["id"]) : DEFAULT_RECIPE.base,
    fruit: fruits.some((x) => x.id === f) ? (f as Fruit["id"]) : null,
    temp: temps.some((x) => x.id === t) ? (t as Temp["id"]) : DEFAULT_RECIPE.temp,
  };
}

/** The drink's color: matcha blended with its base and fruit. Flat, no gradients. */
export function blendColor(recipe: Recipe): string {
  const hex = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const matcha = hex(MATCHA_HUE);
  const base = hex(recipe.base.hue);
  const fruit = recipe.fruit ? hex(recipe.fruit.hue) : null;

  // Matcha leads; base softens; fruit tints.
  const weights = fruit ? [0.5, 0.25, 0.25] : [0.62, 0.38, 0];
  const mix = matcha.map((m, ch) =>
    Math.round(
      m * weights[0] + base[ch] * weights[1] + (fruit ? fruit[ch] : 0) * weights[2],
    ),
  );
  return `#${mix.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

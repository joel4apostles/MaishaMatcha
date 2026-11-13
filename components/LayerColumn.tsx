import type { Recipe } from "@/lib/recipe";
import type { Locale } from "@/i18n/routing";

/**
 * The recipe as a quiet column of its layers, top to bottom as they sit in
 * the cup (Coconut Cloud, the tea, the milk, the purées), each named beside
 * it like a printed recipe card. Flat colour fields from the carta's own
 * hues, one hairline; a new layer settles in once (reduced motion: still).
 * No imitation of the drink: real photographs come from the bar.
 * `bare` draws the column alone (the phone's price bar).
 */
type Band = { id: string; color: string; grow: number; label: string };

function layerBands(recipe: Recipe, locale: Locale): Band[] {
  const bands: Band[] = [];
  const cloud = recipe.extras.find((e) => e.key === "extra.coconut-cloud");
  if (cloud) bands.push({ id: cloud.key, color: cloud.hue ?? "#F4EFE3", grow: 1, label: cloud.label[locale] });
  const teaLabel = recipe.milk ? recipe.tea.name : `${recipe.tea.name}, ${recipe.prep.label[locale].toLowerCase()}`;
  bands.push({ id: `tea-${recipe.tea.color}`, color: recipe.tea.color, grow: recipe.milk ? 5 : 8, label: teaLabel });
  if (recipe.milk) bands.push({ id: recipe.milk.key, color: recipe.milk.hue ?? "#F1EADB", grow: 4, label: recipe.milk.label[locale] });
  for (const e of recipe.extras) {
    if (e.key === "extra.coconut-cloud") continue;
    // Ube at the bar is a deep purple, darker than its carta swatch.
    bands.push({ id: e.key, color: e.key === "extra.ube" ? "#5E2E8C" : (e.hue ?? "#E6D9BF"), grow: 1.6, label: e.label[locale] });
  }
  return bands;
}

export function LayerColumn({
  recipe,
  locale,
  bare = false,
  className = "",
}: {
  recipe: Recipe;
  locale: Locale;
  bare?: boolean;
  className?: string;
}) {
  const bands = layerBands(recipe, locale);
  const column = (
    <div aria-hidden="true" className="flex h-full w-full flex-col overflow-hidden rounded-[2px] ring-1 ring-sumi/15">
      {bands.map((b) => (
        <div key={b.id} className="settle-in" style={{ flexGrow: b.grow, flexBasis: 0, backgroundColor: b.color }} />
      ))}
    </div>
  );
  if (bare) return <div className={className}>{column}</div>;
  return (
    <div className={`grid grid-cols-[3.5rem_minmax(0,1fr)] gap-6 ${className}`.trim()}>
      {column}
      {/* The names, each level with its layer. */}
      <ol className="flex h-full flex-col">
        {bands.map((b) => (
          <li key={b.id} className="flex min-h-0 items-center border-t border-wood/25 first:border-t-0" style={{ flexGrow: b.grow, flexBasis: 0 }}>
            <span className="text-eyebrow uppercase leading-snug text-sumi/80">{b.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

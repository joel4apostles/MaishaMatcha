import type { CatalogItem, LineInput } from "@/lib/pos/pricing";

/** URL slug of a product, from its name ("Lata de matcha Uji" -> "lata-de-matcha-uji"). */
export const productSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function findProduct(products: CatalogItem[], slug: string): CatalogItem | null {
  return products.find((p) => productSlug(p.name) === slug) ?? null;
}

/** Up to three pairings that are shop products and on sale, in the order the team chose. */
export function pairingsOf(product: CatalogItem, products: CatalogItem[]): CatalogItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return (product.pairsWith ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is CatalogItem => Boolean(p && p.id !== product.id && p.available))
    .slice(0, 3);
}

/** "?add=12" from a product page: one unit of an available shop product. */
export function addLine(products: CatalogItem[], add: string | string[] | undefined): LineInput[] {
  const id = typeof add === "string" && /^\d{1,9}$/.test(add) ? Number(add) : null;
  const p = id == null ? null : products.find((x) => x.id === id);
  return p && p.available && p.groups.length === 0 ? [{ menuItemId: p.id, quantity: 1, modifierKeys: [] }] : [];
}

/** The basket kept across shop pages (this tab only): ids and quantities, re-checked against today's catalog. */
export type StoredLine = { id: number; q: number };
export function restoreLines(saved: unknown, products: CatalogItem[]): LineInput[] {
  if (!Array.isArray(saved)) return [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const out = new Map<number, number>();
  for (const s of saved) {
    const id = (s as StoredLine)?.id;
    const q = (s as StoredLine)?.q;
    const p = typeof id === "number" ? byId.get(id) : undefined;
    if (!p || !p.available || p.groups.length || typeof q !== "number" || !Number.isFinite(q) || q < 1) continue;
    out.set(id, Math.min(5, (out.get(id) ?? 0) + Math.floor(q)));
  }
  return [...out].map(([menuItemId, quantity]) => ({ menuItemId, quantity, modifierKeys: [] }));
}

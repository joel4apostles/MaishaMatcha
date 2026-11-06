import { describe, expect, it } from "vitest";
import { addLine, findProduct, pairingsOf, productSlug, restoreLines } from "@/lib/shop";
import type { CatalogItem } from "@/lib/pos/pricing";

const base: CatalogItem = {
  id: 1,
  name: "Lata de matcha Uji",
  category: "Para casa",
  color: "#9BAB37",
  priceCents: 2400,
  taxRateBasisPoints: 2100,
  available: true,
  defaultGrams: null,
  groups: [],
  shop: true,
  stock: 3,
  pairsWith: [2, 3, 1, 9],
};
const chasen = { ...base, id: 2, name: "Chasen (80 púas)" };
const soldOut = { ...base, id: 3, name: "Chawan", available: false };

describe("shop", () => {
  it("slugs names for URLs", () => {
    expect(productSlug("Lata de matcha Uji")).toBe("lata-de-matcha-uji");
    expect(productSlug("Chasen (80 púas)")).toBe("chasen-80-puas");
    expect(findProduct([base, chasen], "chasen-80-puas")?.id).toBe(2);
    expect(findProduct([base], "../admin")).toBeNull();
  });

  it("pairs only with other products that are on sale", () => {
    expect(pairingsOf(base, [base, chasen, soldOut]).map((p) => p.id)).toEqual([2]);
  });

  it("?add= takes one unit of an available product only", () => {
    expect(addLine([base], "1")).toEqual([{ menuItemId: 1, quantity: 1, modifierKeys: [] }]);
    expect(addLine([soldOut], "3")).toEqual([]);
    expect(addLine([base], "1;drop")).toEqual([]);
    expect(addLine([base], ["1", "1"])).toEqual([]);
  });

  it("restores a stored basket against today's catalog, capped at five", () => {
    const saved = [{ id: 1, q: 4 }, { id: 1, q: 4 }, { id: 3, q: 1 }, { id: 99, q: 1 }, { id: 2, q: -2 }, "junk"];
    expect(restoreLines(saved, [base, chasen, soldOut])).toEqual([{ menuItemId: 1, quantity: 5, modifierKeys: [] }]);
    expect(restoreLines("nope", [base])).toEqual([]);
  });
});

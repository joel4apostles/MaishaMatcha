import { describe, expect, it } from "vitest";
import { usualLines } from "@/lib/members";
import type { CatalogItem } from "@/lib/pos/pricing";

const uji: CatalogItem = {
  id: 1,
  name: "Uji",
  category: "Selección de matcha",
  color: "#5F7A2C",
  priceCents: 880,
  taxRateBasisPoints: 1000,
  available: true,
  defaultGrams: 2,
  groups: [
    {
      slug: "preparacion-matcha",
      label: "Preparación",
      selection: "single",
      required: true,
      options: [
        { key: "prep.usucha", label: "Usucha", priceDeltaCents: 0, available: true },
        { key: "prep.latte", label: "Latte", priceDeltaCents: 140, available: true },
      ],
    },
  ],
};
const mochi: CatalogItem = { ...uji, id: 2, name: "Mochi", priceCents: 350, groups: [], available: false };

describe("lo de siempre", () => {
  it("rebuilds the last order from the stored option keys", () => {
    const lines = usualLines(
      [{ menuItem: 1, quantity: 2, modifiers: [{ key: "prep.latte", label: "Latte", priceDeltaCents: 140 }] }],
      [uji],
    );
    expect(lines).toEqual([{ menuItemId: 1, quantity: 2, modifierKeys: ["prep.latte"] }]);
  });

  it("drops products that are gone, sold out or whose options no longer exist", () => {
    const lines = usualLines(
      [
        { menuItem: 99, quantity: 1, modifiers: [] },
        { menuItem: 2, quantity: 1, modifiers: [] },
        { menuItem: { id: 1 }, quantity: 1, modifiers: [{ key: "prep.gone" }] },
        { menuItem: null, quantity: 1 },
      ],
      [uji, mochi],
    );
    expect(lines).toEqual([]);
  });

  it("caps the quantity", () => {
    const [line] = usualLines([{ menuItem: 1, quantity: 80, modifiers: [{ key: "prep.usucha" }] }], [uji]);
    expect(line.quantity).toBe(20);
  });
});

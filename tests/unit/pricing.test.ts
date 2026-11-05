import { describe, expect, it } from "vitest";
import {
  cashChange,
  changeBreakdown,
  priceLine,
  priceOrder,
  quickTenders,
  type CatalogItem,
} from "@/lib/pos/pricing";

const nishio: CatalogItem = {
  id: 2,
  name: "Nishio",
  category: "Selección de matcha",
  color: "#748A38",
  priceCents: 740,
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
    {
      slug: "leche",
      label: "Leche",
      selection: "single",
      required: false,
      options: [
        { key: "leche.vaca", label: "Leche", priceDeltaCents: 0, available: true },
        { key: "leche.avena", label: "Avena", priceDeltaCents: 0, available: true },
      ],
    },
    {
      slug: "extras",
      label: "Extras",
      selection: "multiple",
      required: false,
      options: [
        { key: "extra.coconut-cloud", label: "Coconut Cloud", priceDeltaCents: 150, available: true },
        { key: "extra.ube", label: "Ube", priceDeltaCents: 200, available: false },
      ],
    },
  ],
};
const juice: CatalogItem = { ...nishio, id: 9, name: "Zumo", priceCents: 950, defaultGrams: null, groups: [], available: false };
const catalog = new Map([nishio, juice].map((i) => [i.id, i]));

describe("server pricing", () => {
  it("prices a line from the catalog, never from the client", () => {
    const r = priceLine(catalog, {
      menuItemId: 2,
      quantity: 2,
      modifierKeys: ["prep.latte", "leche.avena", "extra.coconut-cloud"],
      grams: 2.54,
    });
    expect(r.ok && r.line).toMatchObject({ name: "Nishio", unitCents: 1030, quantity: 2, grams: 2.5 });
  });

  it("refuses anything the carta does not allow", () => {
    const bad = (input: Partial<Parameters<typeof priceLine>[1]>) =>
      priceLine(catalog, { menuItemId: 2, quantity: 1, modifierKeys: ["prep.usucha"], ...input });
    expect(bad({ menuItemId: 99 })).toMatchObject({ ok: false, error: "unknown-item" });
    expect(bad({ menuItemId: 9 })).toMatchObject({ ok: false, error: "unavailable-item" });
    expect(bad({ quantity: 0 })).toMatchObject({ ok: false, error: "bad-quantity" });
    expect(bad({ quantity: 1.5 })).toMatchObject({ ok: false, error: "bad-quantity" });
    expect(bad({ modifierKeys: [] })).toMatchObject({ ok: false, error: "missing-required" });
    expect(bad({ modifierKeys: ["prep.usucha", "prep.latte"] })).toMatchObject({ ok: false, error: "too-many-options" });
    expect(bad({ modifierKeys: ["prep.usucha", "extra.ube"] })).toMatchObject({ ok: false, error: "unavailable-option" });
    expect(bad({ modifierKeys: ["prep.usucha", "free.gold"] })).toMatchObject({ ok: false, error: "unknown-option" });
    expect(bad({ grams: 0 })).toMatchObject({ ok: false, error: "bad-grams" });
    expect(bad({ grams: 50 })).toMatchObject({ ok: false, error: "bad-grams" });
    expect(bad({ note: "x".repeat(200) })).toMatchObject({ ok: false, error: "note-too-long" });
  });

  it("totals a ticket with its IVA breakdown", () => {
    const r = priceOrder(catalog, [
      { menuItemId: 2, quantity: 2, modifierKeys: ["prep.latte", "leche.avena", "extra.coconut-cloud"] },
      { menuItemId: 2, quantity: 1, modifierKeys: ["prep.usucha"] },
    ]);
    expect(r.ok && r.totalCents).toBe(2060 + 740);
    expect(r.ok && r.taxBreakdown).toEqual([{ rateBasisPoints: 1000, grossCents: 2800, baseCents: 2545, taxCents: 255 }]);
    expect(priceOrder(catalog, [])).toMatchObject({ ok: false, error: "empty-order" });
  });

  it("handles cash", () => {
    expect(cashChange(3290, 5000)).toBe(1710);
    expect(cashChange(3290, 3000)).toBeNull();
    expect(changeBreakdown(1710)).toEqual([
      { cents: 1000, count: 1 },
      { cents: 500, count: 1 },
      { cents: 200, count: 1 },
      { cents: 10, count: 1 },
    ]);
    expect(quickTenders(3290)).toEqual([3290, 3500, 4000, 5000]);
  });
});

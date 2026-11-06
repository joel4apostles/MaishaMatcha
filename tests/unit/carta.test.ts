import { describe, expect, it } from "vitest";
import { carta, cartaGroups } from "@/content/carta";
import { cartaExtras, priceLines, tastingNotes } from "@/lib/carta";

const find = (name: string) => carta.flatMap((c) => c.items).find((i) => i.name === name)!;
const plain = (s: string) => s.replace(/\s/g, " ");

describe("carta", () => {
  it("matches the printed carta prices", () => {
    expect(priceLines(find("Uji"), "es").map((l) => `${l.label} ${plain(l.price)}`)).toEqual([
      "Usucha 8,80 €",
      "Latte 10,20 €",
    ]);
    expect(priceLines(find("Nishio"), "es").map((l) => plain(l.price))).toEqual(["7,40 €", "8,80 €"]);
    expect(priceLines(find("Kagoshima"), "es").map((l) => plain(l.price))).toEqual(["6,20 €", "7,60 €"]);
    expect(priceLines(find("Hojicha"), "es").map((l) => `${l.label} ${plain(l.price)}`)).toEqual([
      "Solo 6,60 €",
      "Latte 8,00 €",
    ]);
    expect(priceLines(find("Mochi especial"), "es")).toEqual([{ label: null, price: expect.stringContaining("4,50") }]);
    expect(cartaExtras("es").map((e) => plain(e.price))).toEqual(["1,50 €", "1,50 €", "1,50 €", "1,50 €", "2,00 €"]);
  });

  it("only references option groups that exist, with unique option keys", () => {
    const slugs = new Set(cartaGroups.map((g) => g.slug));
    for (const item of carta.flatMap((c) => c.items)) {
      for (const g of item.groups) expect(slugs.has(g)).toBe(true);
    }
    const keys = cartaGroups.flatMap((g) => g.options.map((o) => o.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("tasting cards show the grade once (label, not again in the notes)", () => {
    const uji = carta.find((c) => c.slug === "matcha")!.items[0];
    expect(uji.grade?.es).toBe("Ceremonial");
    expect(tastingNotes(uji, "es")).toBe("Dulzor natural, umami profundo y textura sedosa, sin amargor.");
    expect(tastingNotes(uji, "en").startsWith("Natural sweetness")).toBe(true);
  });

  it("uses whole cents everywhere", () => {
    for (const item of carta.flatMap((c) => c.items)) expect(Number.isInteger(item.priceCents)).toBe(true);
    for (const o of cartaGroups.flatMap((g) => g.options)) expect(Number.isInteger(o.priceDeltaCents)).toBe(true);
  });
});

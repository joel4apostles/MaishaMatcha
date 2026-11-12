import { describe, expect, it } from "vitest";
import { drinkBands } from "@/lib/pos/drinkBands";

const opt = (key: string, label: string, hue: string | null = null) => ({ key, label, priceDeltaCents: 0, available: true, hue });
const nishio = {
  name: "Nishio",
  color: "#748A38",
  groups: [
    { slug: "preparacion-matcha", label: "Preparación", selection: "single" as const, required: true, options: [opt("prep.usucha", "Usucha"), opt("prep.latte", "Latte")] },
    { slug: "leche", label: "Leche", selection: "single" as const, required: false, options: [opt("leche.vaca", "Leche", "#F1EADB"), opt("leche.avena", "Avena", "#E6D9BC")] },
    { slug: "extras", label: "Extras", selection: "multiple" as const, required: false, options: [opt("extra.coconut-cloud", "Coconut Cloud", "#F4EFE3"), opt("extra.ube", "Ube", "#8C6BB1")] },
  ],
};

describe("the till's drink picture", () => {
  it("draws a usucha as the tea alone", () => {
    expect(drinkBands(nishio, ["prep.usucha"]).map((b) => b.label)).toEqual(["Nishio, usucha"]);
  });

  it("stacks a latte as the cup does: cloud, tea, milk, purée", () => {
    const bands = drinkBands(nishio, ["prep.latte", "leche.avena", "extra.coconut-cloud", "extra.ube"]);
    expect(bands.map((b) => b.label)).toEqual(["Coconut Cloud", "Nishio", "Avena", "Ube"]);
    expect(bands.map((b) => b.color)).toEqual(["#F4EFE3", "#748A38", "#E6D9BC", "#8C6BB1"]);
  });

  it("ignores milk on a usucha", () => {
    expect(drinkBands(nishio, ["prep.usucha", "leche.vaca"]).map((b) => b.label)).toEqual(["Nishio, usucha"]);
  });

  it("shows an item without layers as its own colour, named by its choice", () => {
    const mochi = { name: "Mochi", color: "#C8D29A", groups: [{ slug: "sabor-mochi", label: "Sabor", selection: "single" as const, required: true, options: [opt("mochi.coco", "Coco")] }] };
    expect(drinkBands(mochi, ["mochi.coco"])).toEqual([{ id: "item", color: "#C8D29A", grow: 1, label: "Coco" }]);
  });
});

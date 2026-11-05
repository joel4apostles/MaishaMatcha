import { describe, expect, it } from "vitest";
import { addSaved, fromParam, parseSaved, recipeModifierKeys, resolveRecipe, MAX_SAVED } from "@/lib/recipe";

describe("recipe to order", () => {
  it("maps a recipe to the carta modifier keys the till prices", () => {
    const r = resolveRecipe(fromParam("uji.latte.avena.coconut-cloud~ube"));
    expect(recipeModifierKeys(r)).toEqual(["prep.latte", "leche.avena", "extra.coconut-cloud", "extra.ube"]);
    expect(recipeModifierKeys(resolveRecipe(fromParam("hojicha.base.no.no")))).toEqual(["prep.solo"]);
  });
});

describe("saved recipes", () => {
  it("survives garbage in storage", () => {
    expect(parseSaved(null)).toEqual([]);
    expect(parseSaved("{not json")).toEqual([]);
    expect(parseSaved('{"a":1}')).toEqual([]);
    expect(parseSaved('[{"name":"  ","r":"x"},{"name":"Mía","r":"evil.latte"}]')).toEqual([
      { name: "Mía", r: "nishio.latte.vaca.no" },
    ]);
  });

  it("keeps one entry per name, newest first, capped", () => {
    let list = addSaved([], "Mañanas", "uji.base.no.no");
    list = addSaved(list, "Tarde", "nishio.latte.avena.no");
    list = addSaved(list, "mañanas", "kagoshima.base.no.no");
    expect(list.map((x) => x.name)).toEqual(["mañanas", "Tarde"]);
    for (let i = 0; i < 20; i++) list = addSaved(list, `r${i}`, "uji.base.no.no");
    expect(list).toHaveLength(MAX_SAVED);
  });
});

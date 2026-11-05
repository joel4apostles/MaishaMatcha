import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECIPE,
  blendColor,
  builderTeas,
  displayCode,
  fromParam,
  priceCents,
  resolveRecipe,
  toParam,
} from "@/lib/recipe";

describe("recipe builder", () => {
  it("offers exactly the carta's teas with a preparation choice", () => {
    expect(builderTeas.map((t) => t.name)).toEqual(["Uji", "Nishio", "Kagoshima", "Hojicha", "Black Tea"]);
  });

  it("prices like the carta and the counter", () => {
    const usucha = resolveRecipe({ tea: "uji", prep: "base", milk: "vaca", extras: [] });
    expect(priceCents(usucha)).toBe(880);
    expect(usucha.milk).toBeNull();
    const latte = resolveRecipe({ tea: "nishio", prep: "latte", milk: "avena", extras: ["coconut-cloud", "ube"] });
    expect(priceCents(latte)).toBe(740 + 140 + 150 + 200);
    expect(displayCode(latte)).toBe("NIS·LAT·AVE·CCL·UBE");
    const tea = resolveRecipe({ tea: "hojicha", prep: "base", milk: "vaca", extras: [] });
    expect(displayCode(tea)).toBe("HOJ·SOL");
  });

  it("round-trips the share parameter", () => {
    const ids = { tea: "kagoshima", prep: "latte" as const, milk: "vaca", extras: ["pure-mango"] };
    const param = toParam(ids);
    expect(param).toBe("kagoshima.latte.vaca.pure-mango");
    expect(fromParam(param)).toEqual(ids);
    expect(toParam({ ...ids, prep: "base", extras: [] })).toBe("kagoshima.base.no.no");
  });

  it("never trusts a shared link", () => {
    expect(fromParam(null)).toEqual(DEFAULT_RECIPE);
    expect(fromParam("x.y.z.w")).toEqual({ ...DEFAULT_RECIPE, extras: [] });
    expect(fromParam("uji.latte.avena.ube~ube~<script>").extras).toEqual(["ube"]);
  });

  it("blends a flat colour that lightens with milk", () => {
    const lum = (h: string) => [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0);
    const usucha = blendColor(resolveRecipe({ tea: "uji", prep: "base", milk: "vaca", extras: [] }));
    const latte = blendColor(resolveRecipe({ tea: "uji", prep: "latte", milk: "vaca", extras: [] }));
    expect(usucha).toMatch(/^#[0-9a-f]{6}$/);
    expect(lum(latte)).toBeGreaterThan(lum(usucha));
  });
});

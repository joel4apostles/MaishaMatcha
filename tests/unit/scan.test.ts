import { describe, expect, it } from "vitest";
import { matchScore, suggestDelivery, suggestTicket } from "@/lib/scan";

describe("scanning suggestions", () => {
  it("matches names despite accents, case and noise", () => {
    expect(matchScore("MATCHA CEREMONIAL UJI 100G   4", "Matcha ceremonial Uji")).toBe(1);
    expect(matchScore("Leche de avena 1L", "Leche de Avena")).toBe(1);
    expect(matchScore("Azúcar moreno", "Matcha Nishio")).toBe(0);
  });

  it("suggests delivered packs per purchase-order line, never wild numbers", () => {
    const text = `MATCHA HUIS BV\nAlbarán 20391\nMatcha ceremonial Uji 4 x 100 g\nMatcha Nishio 6 uds\nHojicha polvo 2025 lote\nTotal 406,00`;
    const s = suggestDelivery(text, [
      { index: 0, name: "Matcha ceremonial Uji", orderedPacks: 4 },
      { index: 1, name: "Matcha Nishio", orderedPacks: 6 },
      { index: 2, name: "Hojicha en polvo", orderedPacks: 2 },
      { index: 3, name: "Leche de avena", orderedPacks: 12 },
    ]);
    expect(s.map((x) => x.packs)).toEqual([4, 6, null, null]);
    expect(s[3].line).toBeNull();
  });

  it("reads carta items and quantities from a paper ticket", () => {
    const items = [
      { id: 1, name: "Uji" },
      { id: 2, name: "Mochi" },
      { id: 3, name: "Mochi especial" },
      { id: 4, name: "Hojicha" },
    ];
    const s = suggestTicket(`maisha 06/11\n2 x UJI latte\nMochi especial\nhojicha 1\nTOTAL 27,40`, items);
    expect(s.map((x) => [x.menuItemId, x.quantity])).toEqual([[1, 2], [3, 1], [4, 1]]);
  });
});

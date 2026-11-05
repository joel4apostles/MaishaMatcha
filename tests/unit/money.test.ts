import { describe, expect, it } from "vitest";
import { formatEuro, lineGrossCents, splitGross, taxBreakdown } from "@/lib/money";

describe("money", () => {
  it("multiplies integer cents by quantity", () => {
    expect(lineGrossCents(450, 3)).toBe(1350);
    expect(() => lineGrossCents(4.5, 1)).toThrow();
    expect(() => lineGrossCents(450, 0)).toThrow();
  });

  it("splits an IVA-included price into base and cuota", () => {
    expect(splitGross(450, 1000)).toEqual({ baseCents: 409, taxCents: 41 });
    expect(splitGross(550, 2100)).toEqual({ baseCents: 455, taxCents: 95 });
    expect(splitGross(500, 0)).toEqual({ baseCents: 500, taxCents: 0 });
  });

  it("always adds base and cuota back to the gross", () => {
    for (let gross = 1; gross <= 5000; gross += 7) {
      for (const rate of [0, 400, 500, 1000, 2100]) {
        const { baseCents, taxCents } = splitGross(gross, rate);
        expect(baseCents + taxCents).toBe(gross);
        expect(taxCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("groups a ticket by rate, rounding once per rate", () => {
    const { rates, totalCents } = taxBreakdown([
      { grossCents: 450, rateBasisPoints: 1000 },
      { grossCents: 550, rateBasisPoints: 1000 },
      { grossCents: 300, rateBasisPoints: 2100 },
    ]);
    expect(totalCents).toBe(1300);
    expect(rates).toEqual([
      { rateBasisPoints: 1000, grossCents: 1000, baseCents: 909, taxCents: 91 },
      { rateBasisPoints: 2100, grossCents: 300, baseCents: 248, taxCents: 52 },
    ]);
  });

  it("formats euros per locale", () => {
    expect(formatEuro(450, "es").replace(/\s/g, " ")).toBe("4,50 €");
    expect(formatEuro(450, "en")).toBe("€4.50");
  });
});

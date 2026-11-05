/**
 * Money is integer cents (EUR). Tax rates are basis points (1000 = 10 %).
 * Menu prices in Spain are shown and charged IVA included, so tax is
 * extracted from the gross amount per rate.
 */
export type Cents = number;

function assertCents(value: number, name: string) {
  if (!Number.isInteger(value)) throw new Error(`${name} must be integer cents`);
}

export function lineGrossCents(unitCents: Cents, quantity: number): Cents {
  assertCents(unitCents, "unitCents");
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("quantity must be a positive integer");
  }
  return unitCents * quantity;
}

/** Split an IVA-included gross into base + cuota (base rounded half up). */
export function splitGross(grossCents: Cents, rateBasisPoints: number) {
  assertCents(grossCents, "grossCents");
  if (!Number.isInteger(rateBasisPoints) || rateBasisPoints < 0) {
    throw new Error("rateBasisPoints must be a non-negative integer");
  }
  const base = Math.round((grossCents * 10000) / (10000 + rateBasisPoints));
  return { baseCents: base, taxCents: grossCents - base };
}

/**
 * Tax breakdown per rate for a ticket (a factura simplificada needs one line
 * per IVA rate). Lines with the same rate are summed before splitting, so
 * rounding happens once per rate, not once per line.
 */
export function taxBreakdown(lines: { grossCents: Cents; rateBasisPoints: number }[]) {
  const byRate = new Map<number, Cents>();
  for (const l of lines) {
    assertCents(l.grossCents, "grossCents");
    byRate.set(l.rateBasisPoints, (byRate.get(l.rateBasisPoints) ?? 0) + l.grossCents);
  }
  const rates = [...byRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rateBasisPoints, grossCents]) => ({
      rateBasisPoints,
      grossCents,
      ...splitGross(grossCents, rateBasisPoints),
    }));
  const totalCents = rates.reduce((s, r) => s + r.grossCents, 0);
  return { rates, totalCents };
}

export function formatEuro(cents: Cents, locale: "es" | "en" = "es"): string {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

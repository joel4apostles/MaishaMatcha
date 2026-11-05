import { taxBreakdown } from "@/lib/money";

/**
 * Server-side pricing of counter and web orders, pure. The client sends
 * only WHAT was ordered (item id, option keys, quantity, measured grams);
 * every price, IVA rate and label comes from the catalog loaded on the
 * server. Unit tested in tests/unit/pricing.test.ts.
 */
export type CatalogOption = {
  key: string;
  label: string;
  priceDeltaCents: number;
  available: boolean;
};

export type CatalogGroup = {
  slug: string;
  label: string;
  selection: "single" | "multiple";
  required: boolean;
  options: CatalogOption[];
};

export type CatalogItem = {
  id: number;
  name: string;
  category: string;
  color: string;
  priceCents: number;
  taxRateBasisPoints: number;
  available: boolean;
  defaultGrams: number | null;
  groups: CatalogGroup[];
};

export type LineInput = {
  menuItemId: number;
  quantity: number;
  modifierKeys: string[];
  grams?: number | null;
  note?: string | null;
};

export type PricedLine = {
  menuItem: number;
  name: string;
  quantity: number;
  unitCents: number;
  taxRateBasisPoints: number;
  modifiers: { key: string; label: string; priceDeltaCents: number }[];
  grams: number | null;
  note: string | null;
};

export type PriceError =
  | "unknown-item"
  | "unavailable-item"
  | "bad-quantity"
  | "unknown-option"
  | "unavailable-option"
  | "too-many-options"
  | "missing-required"
  | "bad-grams"
  | "note-too-long"
  | "empty-order";

export const MAX_QUANTITY = 50;
export const MAX_GRAMS = 20;
export const MAX_NOTE = 140;

export function priceLine(
  catalog: Map<number, CatalogItem>,
  input: LineInput,
): { ok: true; line: PricedLine } | { ok: false; error: PriceError; detail?: string } {
  const item = catalog.get(input.menuItemId);
  if (!item) return { ok: false, error: "unknown-item" };
  if (!item.available) return { ok: false, error: "unavailable-item", detail: item.name };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QUANTITY) {
    return { ok: false, error: "bad-quantity" };
  }

  const keys = [...new Set(input.modifierKeys)];
  const chosen: PricedLine["modifiers"] = [];
  for (const group of item.groups) {
    const picked = group.options.filter((o) => keys.includes(o.key));
    if (group.selection === "single" && picked.length > 1) {
      return { ok: false, error: "too-many-options", detail: group.label };
    }
    if (group.required && picked.length === 0) {
      return { ok: false, error: "missing-required", detail: group.label };
    }
    for (const o of picked) {
      if (!o.available) return { ok: false, error: "unavailable-option", detail: o.label };
      chosen.push({ key: o.key, label: o.label, priceDeltaCents: o.priceDeltaCents });
    }
  }
  if (chosen.length !== keys.length) return { ok: false, error: "unknown-option" };

  let grams: number | null = null;
  if (input.grams !== undefined && input.grams !== null) {
    const g = Math.round(input.grams * 10) / 10;
    if (!Number.isFinite(g) || g <= 0 || g > MAX_GRAMS) return { ok: false, error: "bad-grams" };
    grams = g;
  }
  const note = input.note?.trim() || null;
  if (note && note.length > MAX_NOTE) return { ok: false, error: "note-too-long" };

  return {
    ok: true,
    line: {
      menuItem: item.id,
      name: item.name,
      quantity: input.quantity,
      unitCents: item.priceCents + chosen.reduce((s, m) => s + m.priceDeltaCents, 0),
      taxRateBasisPoints: item.taxRateBasisPoints,
      modifiers: chosen,
      grams,
      note,
    },
  };
}

export function priceOrder(catalog: Map<number, CatalogItem>, inputs: LineInput[]) {
  if (inputs.length === 0) return { ok: false as const, error: "empty-order" as PriceError };
  const lines: PricedLine[] = [];
  for (const input of inputs) {
    const r = priceLine(catalog, input);
    if (!r.ok) return r;
    lines.push(r.line);
  }
  const breakdown = taxBreakdown(
    lines.map((l) => ({ grossCents: l.unitCents * l.quantity, rateBasisPoints: l.taxRateBasisPoints })),
  );
  return { ok: true as const, lines, totalCents: breakdown.totalCents, taxBreakdown: breakdown.rates };
}

/** Change to hand back, and whether the tendered cash covers the total. */
export function cashChange(totalCents: number, tenderedCents: number) {
  if (!Number.isInteger(tenderedCents) || tenderedCents < totalCents) return null;
  return tenderedCents - totalCents;
}

const DENOMINATIONS = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

/** Fewest notes and coins for the change, largest first. */
export function changeBreakdown(changeCents: number): { cents: number; count: number }[] {
  const out: { cents: number; count: number }[] = [];
  let left = changeCents;
  for (const d of DENOMINATIONS) {
    const n = Math.floor(left / d);
    if (n > 0) {
      out.push({ cents: d, count: n });
      left -= n * d;
    }
  }
  return out;
}

/** Quick cash buttons: exact, then the next round amounts above the total. */
export function quickTenders(totalCents: number): number[] {
  const candidates = [500, 1000, 2000, 5000, 10000].flatMap((step) => [
    Math.ceil(totalCents / step) * step,
  ]);
  return [...new Set([totalCents, ...candidates])].filter((v) => v >= totalCents).sort((a, b) => a - b).slice(0, 4);
}

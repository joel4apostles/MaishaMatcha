import type { Payload } from "payload";

/**
 * Owner reporting: today at a glance, and exports for the accountant.
 * Days are Spanish local days (Europe/Madrid).
 */
const TZ = "Europe/Madrid";
const rid = (v: unknown): number => (typeof v === "object" && v ? (v as { id: number }).id : (v as number));

/** Start and end (exclusive) of a local day, as ISO strings. */
export function madridDay(date = new Date()): { from: string; to: string; label: string } {
  const label = date.toLocaleDateString("en-CA", { timeZone: TZ });
  const offsetAt = (iso: string) => {
    const d = new Date(iso);
    const local = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
    const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
    return local.getTime() - utc.getTime();
  };
  const start = new Date(`${label}T00:00:00Z`);
  const from = new Date(start.getTime() - offsetAt(start.toISOString()));
  const to = new Date(from.getTime() + 24 * 3600 * 1000);
  return { from: from.toISOString(), to: to.toISOString(), label };
}

export type Today = {
  label: string;
  salesCents: number;
  refundsCents: number;
  orders: number;
  averageTicketCents: number;
  byChannel: Record<string, number>;
  byMethod: Record<string, number>;
  topItems: { name: string; quantity: number; cents: number }[];
  onShift: { name: string; since: string }[];
};

export async function today(payload: Payload, date = new Date()): Promise<Today> {
  const { from, to, label } = madridDay(date);
  const range = { and: [{ createdAt: { greater_than_equal: from } }, { createdAt: { less_than: to } }] };
  const [payments, refunds, shifts] = await Promise.all([
    payload.find({ collection: "payments", overrideAccess: true, depth: 0, limit: 10000, where: range }),
    payload.find({ collection: "refunds", overrideAccess: true, depth: 0, limit: 10000, where: range }),
    payload.find({ collection: "shifts", overrideAccess: true, depth: 1, limit: 20, where: { status: { equals: "open" } } }),
  ]);
  const orderIds = [...new Set(payments.docs.map((p) => rid(p.order)))];
  const orders = orderIds.length
    ? (await payload.find({ collection: "orders", overrideAccess: true, depth: 0, limit: 10000, where: { id: { in: orderIds } } })).docs
    : [];
  const byMethod: Record<string, number> = {};
  for (const p of payments.docs) byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amountCents;
  const byChannel: Record<string, number> = {};
  const items = new Map<string, { quantity: number; cents: number }>();
  for (const o of orders) {
    byChannel[o.channel] = (byChannel[o.channel] ?? 0) + o.totalCents;
    for (const l of o.lines ?? []) {
      const it = items.get(l.name) ?? { quantity: 0, cents: 0 };
      it.quantity += l.quantity;
      it.cents += l.unitCents * l.quantity;
      items.set(l.name, it);
    }
  }
  const gross = payments.docs.reduce((s, p) => s + p.amountCents, 0);
  const refundsCents = refunds.docs.reduce((s, r) => s + r.amountCents, 0);
  return {
    label,
    salesCents: gross - refundsCents,
    refundsCents,
    orders: orders.length,
    averageTicketCents: orders.length ? Math.round(gross / orders.length) : 0,
    byChannel,
    byMethod,
    topItems: [...items.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    onShift: shifts.docs.map((s) => ({
      name: typeof s.openedBy === "object" && s.openedBy ? s.openedBy.name : "",
      since: s.openedAt,
    })),
  };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formulas and quote everything.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};
const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** One row per invoice (sales and corrective), for the accountant. */
export async function invoicesCsv(payload: Payload, from: string, to: string): Promise<string> {
  const { docs } = await payload.find({
    collection: "invoices",
    overrideAccess: true,
    depth: 0,
    limit: 100000,
    sort: "issuedAt",
    where: { and: [{ issuedAt: { greater_than_equal: from } }, { issuedAt: { less_than: to } }] },
  });
  const header = ["Fecha", "Número", "Tipo", "Base 10%", "Cuota 10%", "Base 21%", "Cuota 21%", "Otras bases", "Otras cuotas", "Total", "Huella"];
  const rows = docs.map((d) => {
    const rates = (d.taxBreakdown as { rateBasisPoints: number; baseCents: number; taxCents: number }[] | null) ?? [];
    const pick = (bp: number) => rates.find((r) => r.rateBasisPoints === bp) ?? { baseCents: 0, taxCents: 0 };
    const other = rates.filter((r) => r.rateBasisPoints !== 1000 && r.rateBasisPoints !== 2100);
    return [
      new Date(d.issuedAt).toLocaleString("es-ES", { timeZone: TZ }),
      d.fullNumber,
      d.type,
      euros(pick(1000).baseCents),
      euros(pick(1000).taxCents),
      euros(pick(2100).baseCents),
      euros(pick(2100).taxCents),
      euros(other.reduce((s, r) => s + r.baseCents, 0)),
      euros(other.reduce((s, r) => s + r.taxCents, 0)),
      euros(d.totalCents),
      d.hash,
    ];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}

/** IVA summary per rate for a period (modelo 303 helper). */
export async function ivaSummary(payload: Payload, from: string, to: string) {
  const { docs } = await payload.find({
    collection: "invoices",
    overrideAccess: true,
    depth: 0,
    limit: 100000,
    where: { and: [{ issuedAt: { greater_than_equal: from } }, { issuedAt: { less_than: to } }] },
  });
  const byRate = new Map<number, { baseCents: number; taxCents: number }>();
  for (const d of docs) {
    for (const r of (d.taxBreakdown as { rateBasisPoints: number; baseCents: number; taxCents: number }[] | null) ?? []) {
      const t = byRate.get(r.rateBasisPoints) ?? { baseCents: 0, taxCents: 0 };
      t.baseCents += r.baseCents;
      t.taxCents += r.taxCents;
      byRate.set(r.rateBasisPoints, t);
    }
  }
  return [...byRate.entries()].sort(([a], [b]) => a - b).map(([rate, v]) => ({ rateBasisPoints: rate, ...v }));
}

export function ivaCsv(rows: Awaited<ReturnType<typeof ivaSummary>>): string {
  const header = ["Tipo de IVA", "Base imponible", "Cuota"];
  return [header, ...rows.map((r) => [`${r.rateBasisPoints / 100} %`, euros(r.baseCents), euros(r.taxCents)])]
    .map((r) => r.map(csvCell).join(";"))
    .join("\r\n");
}

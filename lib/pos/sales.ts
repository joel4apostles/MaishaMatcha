import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from "payload";
import { writeAudit } from "@/cms/audit";
import { query, sql, table } from "@/cms/db";
import {
  cashChange,
  priceOrder,
  type CatalogGroup,
  type CatalogItem,
  type LineInput,
  type PriceError,
} from "./pricing";
import { fingerprint, fullInvoiceNumber, qrUrl, type InvoiceType } from "./verifactu";

/**
 * Counter operations, server only, free of cookies so they are testable.
 * Callers (server actions) have already resolved a valid POS session; the
 * staff and device ids passed here come from that session, never from the
 * client. Every money operation runs in ONE database transaction.
 */
export type Actor = { staffId: number; deviceId: number };
export type SaleError = PriceError | "no-shift" | "shift-open" | "not-found" | "already-paid" | "cancelled" | "short-cash" | "bad-amount";

type Result<T> = { ok: true } & T | { ok: false; error: SaleError; detail?: string };

async function inTransaction<T>(payload: Payload, staffId: number | null, fn: (req: PayloadRequest) => Promise<T>) {
  const req = await createLocalReq({}, payload);
  if (staffId) {
    req.user = { ...(await payload.findByID({ collection: "users", id: staffId, depth: 0 })), collection: "users" } as never;
  }
  await initTransaction(req);
  try {
    const out = await fn(req);
    await commitTransaction(req);
    return out;
  } catch (err) {
    await killTransaction(req);
    throw err;
  }
}

/** Advance a named counter atomically; the row lock lasts until commit. */
async function nextInSequence(req: PayloadRequest, key: string) {
  const seq = table(req.payload, "sequences");
  await query(
    req.payload,
    sql`insert into ${seq} (key, value, updated_at, created_at) values (${key}, 0, now(), now()) on conflict (key) do nothing`,
    req,
  );
  const rows = await query(
    req.payload,
    sql`update ${seq} set value = value + 1, updated_at = now() where key = ${key} returning value, last_hash`,
    req,
  );
  return { value: Number(rows[0].value), lastHash: (rows[0].last_hash as string | null) ?? null };
}

async function setSequenceHash(req: PayloadRequest, key: string, hash: string) {
  const seq = table(req.payload, "sequences");
  await query(req.payload, sql`update ${seq} set last_hash = ${hash} where key = ${key}`, req);
}

// ---------------------------------------------------------------- catalog

const id = (v: unknown): number => (typeof v === "object" && v ? (v as { id: number }).id : (v as number));

export async function loadCatalog(payload: Payload, locale: "es" | "en" = "es"): Promise<CatalogItem[]> {
  const [items, groups, options, rates] = await Promise.all([
    payload.find({ collection: "menu-items", limit: 500, depth: 0, locale, sort: "order", overrideAccess: true }),
    payload.find({ collection: "modifier-groups", limit: 200, depth: 0, locale, sort: "order", overrideAccess: true }),
    payload.find({ collection: "modifiers", limit: 1000, depth: 0, locale, sort: "order", overrideAccess: true }),
    payload.find({ collection: "tax-rates", limit: 50, depth: 0, overrideAccess: true }),
  ]);
  const categories = await payload.find({ collection: "menu-categories", limit: 100, depth: 0, locale, sort: "order", overrideAccess: true });
  const catName = new Map(categories.docs.map((c) => [c.id, c.title]));
  const catOrder = new Map(categories.docs.map((c, i) => [c.id, i]));
  const rateOf = new Map(rates.docs.map((r) => [r.id, r.rateBasisPoints]));
  const groupOf = new Map<number, CatalogGroup>(
    groups.docs.map((g) => [
      g.id,
      { slug: g.slug, label: g.label, selection: g.selection, required: Boolean(g.required), options: [] },
    ]),
  );
  for (const o of options.docs) {
    groupOf.get(id(o.group))?.options.push({
      key: o.key,
      label: o.label,
      priceDeltaCents: o.priceDeltaCents ?? 0,
      available: o.available !== false,
    });
  }
  return items.docs
    .slice()
    .sort((a, b) => (catOrder.get(id(a.category)) ?? 0) - (catOrder.get(id(b.category)) ?? 0) || (a.order ?? 0) - (b.order ?? 0))
    .map((i) => ({
      id: i.id,
      name: i.name,
      category: String(catName.get(id(i.category)) ?? ""),
      color: i.color,
      priceCents: i.priceCents,
      taxRateBasisPoints: rateOf.get(id(i.taxRate)) ?? 1000,
      available: i.available !== false,
      defaultGrams: i.defaultGrams ?? null,
      groups: (i.modifierGroups ?? []).map((g) => groupOf.get(id(g))).filter((g): g is CatalogGroup => Boolean(g)),
    }));
}

// ----------------------------------------------------------------- shifts

export async function currentShift(payload: Payload, deviceId: number) {
  const { docs } = await payload.find({
    collection: "shifts",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { and: [{ device: { equals: deviceId } }, { status: { equals: "open" } }] },
  });
  return docs[0] ?? null;
}

export async function openShift(payload: Payload, actor: Actor, floatCents: number): Promise<Result<{ shiftId: number }>> {
  if (!Number.isInteger(floatCents) || floatCents < 0 || floatCents > 100000) return { ok: false, error: "bad-amount" };
  if (await currentShift(payload, actor.deviceId)) return { ok: false, error: "shift-open" };
  const now = new Date();
  const shift = await payload.create({
    collection: "shifts",
    overrideAccess: true,
    data: {
      device: actor.deviceId,
      openedBy: actor.staffId,
      openedAt: now.toISOString(),
      floatCents,
      status: "open",
      label: `Turno ${now.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })} ${now.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}`,
    },
  });
  return { ok: true, shiftId: shift.id };
}

// ----------------------------------------------------------------- orders

export async function createOrder(
  payload: Payload,
  actor: Actor,
  input: { lines: LineInput[]; service: "here" | "takeaway"; note?: string | null; idempotencyKey: string },
): Promise<Result<{ orderId: number; label: string; totalCents: number; duplicate: boolean }>> {
  // A retried submission (offline queue, double tap) returns the first order.
  const existing = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { idempotencyKey: { equals: input.idempotencyKey } },
  });
  if (existing.docs[0]) {
    const o = existing.docs[0];
    return { ok: true, orderId: o.id, label: o.label ?? "", totalCents: o.totalCents, duplicate: true };
  }

  const shift = await currentShift(payload, actor.deviceId);
  if (!shift) return { ok: false, error: "no-shift" };

  const catalog = new Map((await loadCatalog(payload)).map((i) => [i.id, i]));
  const priced = priceOrder(catalog, input.lines);
  if (!priced.ok) return priced;

  return inTransaction(payload, actor.staffId, async (req) => {
    const { value } = await nextInSequence(req, "order-label");
    const label = String(value % 10000).padStart(4, "0");
    const order = await payload.create({
      collection: "orders",
      req,
      overrideAccess: true,
      data: {
        label,
        channel: "counter",
        service: input.service,
        status: "received",
        paymentStatus: "unpaid",
        lines: priced.lines,
        totalCents: priced.totalCents,
        taxBreakdown: priced.taxBreakdown,
        note: input.note?.trim() || undefined,
        staff: actor.staffId,
        device: actor.deviceId,
        shift: shift.id,
        statusChangedAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
      } as never,
    });
    return { ok: true as const, orderId: order.id, label, totalCents: priced.totalCents, duplicate: false };
  });
}

// --------------------------------------------------------------- payments

async function issueInvoice(req: PayloadRequest, order: { id: number; totalCents: number; taxBreakdown?: unknown }, type: InvoiceType = "F2") {
  const business = await req.payload.findGlobal({ slug: "business", req, overrideAccess: true });
  const series = business.invoiceSeries || "T";
  const now = new Date();
  const year = Number(now.toLocaleDateString("en-GB", { timeZone: "Europe/Madrid", year: "numeric" }));
  // Gap-free per series and year; the row lock serialises the hash chain.
  const key = `invoice:${series}:${year}`;
  const { value, lastHash } = await nextInSequence(req, key);
  const fullNumber = fullInvoiceNumber(series, year, value);
  const rates = (order.taxBreakdown as { taxCents: number }[] | undefined) ?? [];
  const taxCents = rates.reduce((s, r) => s + r.taxCents, 0);
  const issuerNif = business.nif || "PENDIENTE";
  const hash = fingerprint({
    issuerNif,
    fullNumber,
    issuedAt: now,
    type,
    taxCents,
    totalCents: order.totalCents,
    previousHash: lastHash,
    generatedAt: now,
  });
  await setSequenceHash(req, key, hash);
  return req.payload.create({
    collection: "invoices",
    req,
    overrideAccess: true,
    data: {
      fullNumber,
      series,
      number: value,
      type,
      order: order.id,
      issuedAt: now.toISOString(),
      issuerNif,
      totalCents: order.totalCents,
      taxCents,
      taxBreakdown: order.taxBreakdown as never,
      hash,
      previousHash: lastHash ?? undefined,
      qrUrl: qrUrl({ issuerNif, fullNumber, issuedAt: now, totalCents: order.totalCents }),
      aeatStatus: "pending",
    },
  });
}

export async function payOrder(
  payload: Payload,
  actor: Actor,
  input: { orderId: number; method: "cash" | "card_terminal"; tenderedCents?: number },
): Promise<Result<{ invoiceNumber: string; changeCents: number }>> {
  const shift = await currentShift(payload, actor.deviceId);
  if (!shift) return { ok: false, error: "no-shift" };

  return inTransaction(payload, actor.staffId, async (req) => {
    // Lock the order row: two taps on "Cobrar" can never pay twice.
    const orders = table(payload, "orders");
    const rows = await query(payload, sql`select id from ${orders} where id = ${input.orderId} for update`, req);
    if (!rows[0]) return { ok: false as const, error: "not-found" as const };
    const order = await payload.findByID({ collection: "orders", id: input.orderId, req, depth: 0, overrideAccess: true });
    if (order.paymentStatus !== "unpaid") return { ok: false as const, error: "already-paid" as const };
    if (order.status === "cancelled") return { ok: false as const, error: "cancelled" as const };

    let change = 0;
    if (input.method === "cash") {
      const c = cashChange(order.totalCents, input.tenderedCents ?? -1);
      if (c === null) return { ok: false as const, error: "short-cash" as const };
      change = c;
    }
    await payload.create({
      collection: "payments",
      req,
      overrideAccess: true,
      data: {
        order: order.id,
        shift: shift.id,
        method: input.method,
        amountCents: order.totalCents,
        tenderedCents: input.method === "cash" ? input.tenderedCents : undefined,
        changeCents: input.method === "cash" ? change : undefined,
        staff: actor.staffId,
      },
    });
    const invoice = await issueInvoice(req, order);
    await payload.update({
      collection: "orders",
      id: order.id,
      req,
      overrideAccess: true,
      data: { paymentStatus: "paid" },
    });
    return { ok: true as const, invoiceNumber: invoice.fullNumber, changeCents: change };
  });
}

// ------------------------------------------------------------ close shift

export async function closeShift(
  payload: Payload,
  actor: Actor,
  countedCashCents: number,
): Promise<Result<{ report: ZReport }>> {
  if (!Number.isInteger(countedCashCents) || countedCashCents < 0) return { ok: false, error: "bad-amount" };
  const shift = await currentShift(payload, actor.deviceId);
  if (!shift) return { ok: false, error: "no-shift" };
  const report = await zReport(payload, shift.id, shift.floatCents);
  const difference = countedCashCents - report.expectedCashCents;
  await payload.update({
    collection: "shifts",
    id: shift.id,
    overrideAccess: true,
    data: {
      status: "closed",
      closedBy: actor.staffId,
      closedAt: new Date().toISOString(),
      expectedCashCents: report.expectedCashCents,
      countedCashCents,
      differenceCents: difference,
      report: { ...report, countedCashCents, differenceCents: difference } as never,
    },
  });
  if (difference !== 0) {
    await writeAudit({ payload }, {
      action: "shift.cash-difference",
      entity: "shifts",
      entityId: shift.id,
      actorId: actor.staffId,
      deviceId: actor.deviceId,
      after: { expected: report.expectedCashCents, counted: countedCashCents, difference },
    });
  }
  return { ok: true, report: { ...report, countedCashCents, differenceCents: difference } };
}

export type ZReport = {
  floatCents: number;
  orders: number;
  byMethod: Record<string, number>;
  totalCents: number;
  tax: { rateBasisPoints: number; baseCents: number; taxCents: number; grossCents: number }[];
  expectedCashCents: number;
  countedCashCents?: number;
  differenceCents?: number;
};

export async function zReport(payload: Payload, shiftId: number, floatCents: number): Promise<ZReport> {
  const payments = await payload.find({
    collection: "payments",
    overrideAccess: true,
    depth: 0,
    limit: 5000,
    where: { shift: { equals: shiftId } },
  });
  const byMethod: Record<string, number> = {};
  for (const p of payments.docs) byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amountCents;
  const orderIds = [...new Set(payments.docs.map((p) => id(p.order)))];
  const orders = orderIds.length
    ? await payload.find({ collection: "orders", overrideAccess: true, depth: 0, limit: 5000, where: { id: { in: orderIds } } })
    : { docs: [] };
  const tax = new Map<number, { rateBasisPoints: number; baseCents: number; taxCents: number; grossCents: number }>();
  for (const o of orders.docs) {
    for (const r of (o.taxBreakdown as { rateBasisPoints: number; baseCents: number; taxCents: number; grossCents: number }[]) ?? []) {
      const t = tax.get(r.rateBasisPoints) ?? { rateBasisPoints: r.rateBasisPoints, baseCents: 0, taxCents: 0, grossCents: 0 };
      t.baseCents += r.baseCents;
      t.taxCents += r.taxCents;
      t.grossCents += r.grossCents;
      tax.set(r.rateBasisPoints, t);
    }
  }
  const totalCents = Object.values(byMethod).reduce((s, v) => s + v, 0);
  return {
    floatCents,
    orders: orderIds.length,
    byMethod,
    totalCents,
    tax: [...tax.values()].sort((a, b) => a.rateBasisPoints - b.rateBasisPoints),
    expectedCashCents: floatCents + (byMethod.cash ?? 0),
  };
}

// -------------------------------------------------------- kitchen display

export const KDS_FLOW = ["received", "preparing", "ready", "collected"] as const;
export type KdsStatus = (typeof KDS_FLOW)[number] | "cancelled";

export async function kitchenQueue(payload: Payload) {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 1,
    limit: 100,
    sort: "createdAt",
    where: {
      or: [
        { status: { in: ["received", "preparing"] } },
        { and: [{ status: { equals: "ready" } }, { statusChangedAt: { greater_than: since } }] },
      ],
    },
  });
  return docs.map((o) => ({
    id: o.id,
    label: o.label ?? String(o.id),
    status: o.status as KdsStatus,
    channel: o.channel,
    service: o.service,
    createdAt: o.createdAt,
    statusChangedAt: o.statusChangedAt ?? o.createdAt,
    staffName: typeof o.staff === "object" && o.staff ? o.staff.name : null,
    paid: o.paymentStatus === "paid",
    note: o.note ?? null,
    lines: (o.lines ?? []).map((l) => ({
      name: l.name,
      quantity: l.quantity,
      modifiers: ((l.modifiers as { label: string }[] | null) ?? []).map((m) => m.label),
      grams: l.grams ?? null,
      note: l.note ?? null,
    })),
  }));
}

export async function advanceOrder(payload: Payload, actor: Actor, orderId: number, to: KdsStatus): Promise<Result<object>> {
  const order = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!order) return { ok: false, error: "not-found" };
  if (order.status === "cancelled" || order.status === "collected") return { ok: false, error: "cancelled" };
  await payload.update({
    collection: "orders",
    id: orderId,
    overrideAccess: true,
    data: { status: to, statusChangedAt: new Date().toISOString() },
  });
  if (to === "cancelled") {
    await writeAudit({ payload }, { action: "order.void", entity: "orders", entityId: orderId, actorId: actor.staffId, deviceId: actor.deviceId });
  }
  return { ok: true };
}

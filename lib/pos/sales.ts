import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from "payload";
import { writeAudit } from "@/cms/audit";
import { attemptPin } from "./core";
import { deductForOrder, draftReorders } from "@/lib/inventory";
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
export type SaleError =
  | PriceError
  | "no-shift"
  | "shift-open"
  | "not-found"
  | "already-paid"
  | "cancelled"
  | "short-cash"
  | "bad-amount"
  | "not-paid"
  | "reason-required"
  | "over-limit"
  | "approval-failed"
  | "paid";

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

async function issueInvoice(
  req: PayloadRequest,
  order: { id: number; totalCents: number; taxBreakdown?: unknown },
  type: InvoiceType = "F2",
  rectifies?: number,
) {
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
      rectifies,
    },
  });
}

/** Issue the simplified invoice for a paid order (counter or web). */
export const issueInvoiceFor = (req: PayloadRequest, order: { id: number; totalCents: number; taxBreakdown?: unknown }) =>
  issueInvoice(req, order);

export async function payOrder(
  payload: Payload,
  actor: Actor,
  input: { orderId: number; method: "cash" | "card_terminal"; tenderedCents?: number },
): Promise<Result<{ invoiceNumber: string; changeCents: number }>> {
  const shift = await currentShift(payload, actor.deviceId);
  if (!shift) return { ok: false, error: "no-shift" };

  let touched: number[] = [];
  const result = await inTransaction(payload, actor.staffId, async (req) => {
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
    // Stock leaves with the sale, in the same transaction.
    touched = await deductForOrder(req, order);
    await payload.update({
      collection: "orders",
      id: order.id,
      req,
      overrideAccess: true,
      data: { paymentStatus: "paid" },
    });
    return { ok: true as const, invoiceNumber: invoice.fullNumber, changeCents: change };
  });
  // Reorder drafts after commit: never slows down or fails a sale.
  if (result.ok && touched.length) {
    await draftReorders(payload, touched).catch((err) => console.error("[inventory] reorder draft failed", err));
  }
  return result;
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
  refundsByMethod: Record<string, number>;
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
  const refunds = await payload.find({
    collection: "refunds",
    overrideAccess: true,
    depth: 0,
    limit: 5000,
    where: { shift: { equals: shiftId } },
  });
  const refundsByMethod: Record<string, number> = {};
  for (const r of refunds.docs) refundsByMethod[r.method] = (refundsByMethod[r.method] ?? 0) + r.amountCents;
  const refundTotal = Object.values(refundsByMethod).reduce((s, v) => s + v, 0);
  const totalCents = Object.values(byMethod).reduce((s, v) => s + v, 0) - refundTotal;
  return {
    floatCents,
    orders: orderIds.length,
    byMethod,
    refundsByMethod,
    totalCents,
    tax: [...tax.values()].sort((a, b) => a.rateBasisPoints - b.rateBasisPoints),
    expectedCashCents: floatCents + (byMethod.cash ?? 0) - (refundsByMethod.cash ?? 0),
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
      and: [
        {
          or: [
            { status: { in: ["received", "preparing"] } },
            { and: [{ status: { equals: "ready" } }, { statusChangedAt: { greater_than: since } }] },
          ],
        },
        // A card order sent to Stripe waits here until it is paid: an
        // abandoned checkout never makes the bar prepare a drink.
        { or: [{ payOnline: { not_equals: true } }, { paymentStatus: { equals: "paid" } }] },
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
    staffName: typeof o.staff === "object" && o.staff ? o.staff.name : (o.customerName ?? null),
    pickupAt: o.pickupAt ?? null,
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
  if (to === "ready" && order.channel === "online") {
    const { sendReady } = await import("@/lib/online");
    await sendReady(payload, orderId).catch(() => undefined);
  }
  return { ok: true };
}

// ---------------------------------------------------- refunds and voids

/** Cancel an order that has not been paid (a void), with a reason. */
export async function voidOrder(payload: Payload, actor: Actor, orderId: number, reason: string): Promise<Result<object>> {
  const why = reason.trim();
  if (!why) return { ok: false, error: "reason-required" };
  const order = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!order) return { ok: false, error: "not-found" };
  if (order.paymentStatus !== "unpaid") return { ok: false, error: "paid" };
  if (order.status === "cancelled") return { ok: false, error: "cancelled" };
  await payload.update({
    collection: "orders",
    id: orderId,
    overrideAccess: true,
    data: { status: "cancelled", statusChangedAt: new Date().toISOString() },
  });
  await writeAudit({ payload }, {
    action: "order.void",
    entity: "orders",
    entityId: orderId,
    reason: why,
    actorId: actor.staffId,
    deviceId: actor.deviceId,
  });
  return { ok: true };
}

/**
 * Refund all or part of a paid order. Above the person's refund limit a
 * manager or owner must approve with their PIN on the same device. Issues a
 * corrective invoice (R5) for the negative amount in the same hash chain.
 */
export async function refundOrder(
  payload: Payload,
  actor: Actor,
  input: { orderId: number; amountCents: number; reason: string; approver?: { staffId: number; pin: string } },
): Promise<Result<{ invoiceNumber: string; refundedCents: number }>> {
  const why = input.reason.trim();
  if (!why) return { ok: false, error: "reason-required" };
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return { ok: false, error: "bad-amount" };
  const shift = await currentShift(payload, actor.deviceId);
  if (!shift) return { ok: false, error: "no-shift" };

  const staffDoc = await payload.findByID({ collection: "users", id: actor.staffId, depth: 0, overrideAccess: true });
  const limit = staffDoc.role === "barista" ? (staffDoc.refundLimitCents ?? 0) : Number.POSITIVE_INFINITY;
  let approvedBy: number | undefined;
  if (input.amountCents > limit) {
    if (!input.approver) return { ok: false, error: "over-limit" };
    const approver = await payload.findByID({ collection: "users", id: input.approver.staffId, depth: 0, overrideAccess: true }).catch(() => null);
    if (!approver || (approver.role !== "owner" && approver.role !== "manager")) return { ok: false, error: "approval-failed" };
    const check = await attemptPin(payload, {
      deviceId: actor.deviceId,
      userId: input.approver.staffId,
      pin: input.approver.pin,
      purpose: "approval",
    });
    if (!check.ok) return { ok: false, error: "approval-failed" };
    approvedBy = approver.id;
  }

  return inTransaction(payload, actor.staffId, async (req) => {
    const orders = table(payload, "orders");
    await query(payload, sql`select id from ${orders} where id = ${input.orderId} for update`, req);
    const order = await payload.findByID({ collection: "orders", id: input.orderId, req, depth: 0, overrideAccess: true }).catch(() => null);
    if (!order) return { ok: false as const, error: "not-found" as const };
    if (order.paymentStatus === "unpaid") return { ok: false as const, error: "not-paid" as const };
    const { docs: prior } = await payload.find({
      collection: "refunds",
      req,
      depth: 0,
      overrideAccess: true,
      limit: 100,
      where: { order: { equals: order.id } },
    });
    const already = prior.reduce((s, r) => s + r.amountCents, 0);
    if (already + input.amountCents > order.totalCents) return { ok: false as const, error: "bad-amount" as const };
    const { docs: pays } = await payload.find({
      collection: "payments",
      req,
      depth: 0,
      overrideAccess: true,
      limit: 1,
      where: { order: { equals: order.id } },
    });
    const { docs: invoices } = await payload.find({
      collection: "invoices",
      req,
      depth: 0,
      overrideAccess: true,
      limit: 1,
      where: { and: [{ order: { equals: order.id } }, { type: { equals: "F2" } }] },
    });

    // Corrective invoice: negative amounts, IVA split in proportion.
    const share = input.amountCents / order.totalCents;
    const rates = ((order.taxBreakdown as { rateBasisPoints: number; grossCents: number; baseCents: number; taxCents: number }[]) ?? []).map((r) => {
      const gross = -Math.round(r.grossCents * share);
      const tax = -Math.round(r.taxCents * share);
      return { rateBasisPoints: r.rateBasisPoints, grossCents: gross, taxCents: tax, baseCents: gross - tax };
    });
    const invoice = await issueInvoice(req, { id: order.id, totalCents: -input.amountCents, taxBreakdown: rates }, "R5", invoices[0]?.id);
    await payload.create({
      collection: "refunds",
      req,
      overrideAccess: true,
      data: {
        order: order.id,
        shift: shift.id,
        method: pays[0]?.method ?? "cash",
        amountCents: input.amountCents,
        reason: why,
        staff: actor.staffId,
        approvedBy,
        invoice: invoice.id,
      },
    });
    const full = already + input.amountCents === order.totalCents;
    await payload.update({
      collection: "orders",
      id: order.id,
      req,
      overrideAccess: true,
      data: { paymentStatus: full ? "refunded" : "partially_refunded" },
    });
    await writeAudit(req, {
      action: "order.refund",
      entity: "orders",
      entityId: order.id,
      reason: why,
      actorId: actor.staffId,
      deviceId: actor.deviceId,
      after: { amountCents: input.amountCents, approvedBy: approvedBy ?? null },
    });
    return { ok: true as const, invoiceNumber: invoice.fullNumber, refundedCents: input.amountCents };
  });
}

/** This tablet's orders in the open shift, newest first, for the orders list. */
export async function shiftOrders(payload: Payload, deviceId: number) {
  const shift = await currentShift(payload, deviceId);
  if (!shift) return [];
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 200,
    sort: "-createdAt",
    where: { shift: { equals: shift.id } },
  });
  const refunds = await payload.find({
    collection: "refunds",
    overrideAccess: true,
    depth: 0,
    limit: 1000,
    where: { shift: { equals: shift.id } },
  });
  const refunded = new Map<number, number>();
  for (const r of refunds.docs) refunded.set(id(r.order), (refunded.get(id(r.order)) ?? 0) + r.amountCents);
  return docs.map((o) => ({
    id: o.id,
    label: o.label ?? String(o.id),
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalCents: o.totalCents,
    refundedCents: refunded.get(o.id) ?? 0,
    summary: (o.lines ?? []).map((l) => `${l.quantity} × ${l.name}`).join(", "),
  }));
}

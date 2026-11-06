import { randomBytes } from "node:crypto";
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
} from "payload";
import { query, sql, table } from "@/cms/db";
import { deductForOrder, draftReorders } from "@/lib/inventory";
import { emailFrame, escapeHtml, sendEmail } from "@/lib/email";
import { formatEuro } from "@/lib/money";
import { priceOrder, type LineInput } from "@/lib/pos/pricing";
import { issueInvoiceFor, loadCatalog } from "@/lib/pos/sales";
import { isBookable, madridInstant, pickupSlots, type SlotSettings } from "@/lib/slots";
import { cancelOrderOnce, takeUnits } from "@/lib/units";
import { stripeEnabled } from "@/lib/stripe";

/**
 * Web orders: pickup slots, server pricing, pay at pickup or online
 * (Stripe), the private status page and the customer emails.
 */
export async function onlineSettings(payload: Payload) {
  const b = await payload.findGlobal({ slug: "business", overrideAccess: true });
  const settings: SlotSettings = {
    openingTime: b.openingTime || "08:00",
    closingTime: b.closingTime || "18:00",
    openDays: (b.openDays as string[] | null) ?? ["tue", "wed", "thu", "fri", "sat", "sun"],
    slotMinutes: b.slotMinutes ?? 15,
    slotCapacity: b.slotCapacity ?? 6,
    leadMinutes: b.leadMinutes ?? 15,
  };
  return { enabled: Boolean(b.onlineOrdering), settings, tables: b.tableOrdering ? (b.tableCount ?? 0) : 0 };
}

/** An unpaid card checkout stops holding its slot after this long. */
export const CHECKOUT_HOLD_MINUTES = 30;
/** The salon is open at this instant (an open day, between opening and closing). */
export function openNow(s: SlotSettings, now: Date) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);
  const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(`${date}T12:00:00Z`).getUTCDay()];
  if (!s.openDays.includes(day)) return false;
  const t = now.getTime();
  return t >= madridInstant(date, s.openingTime).getTime() && t < madridInstant(date, s.closingTime).getTime();
}

/** Most units of one shop product per order. */
export const MAX_SHOP_UNITS = 5;
/** Most open web orders one email may hold at once. */
export const MAX_OPEN_PER_EMAIL = 3;

export async function takenSlots(payload: Payload, now = new Date()) {
  const holdCutoff = new Date(now.getTime() - CHECKOUT_HOLD_MINUTES * 60000).toISOString();
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 2000,
    where: {
      and: [
        { channel: { equals: "online" } },
        { status: { not_equals: "cancelled" } },
        { pickupAt: { greater_than_equal: now.toISOString() } },
        // Abandoned card checkouts must not block real customers.
        {
          or: [
            { payOnline: { not_equals: true } },
            { paymentStatus: { not_equals: "unpaid" } },
            { createdAt: { greater_than: holdCutoff } },
          ],
        },
      ],
    },
  });
  const taken = new Map<string, number>();
  for (const o of docs) if (o.pickupAt) taken.set(new Date(o.pickupAt).toISOString(), (taken.get(new Date(o.pickupAt).toISOString()) ?? 0) + 1);
  return taken;
}

export async function availableSlots(payload: Payload, now = new Date()) {
  const { enabled, settings } = await onlineSettings(payload);
  if (!enabled) return { enabled, slots: [] };
  return { enabled, slots: pickupSlots(settings, now, await takenSlots(payload, now), 2) };
}

export type PlaceInput = {
  lines: LineInput[];
  /** A pickup slot; not used for an order from a table. */
  pickupAt?: string | null;
  /** Ordered from a table's QR code: served there, no pickup slot. */
  table?: number | null;
  name: string;
  email: string;
  phone?: string | null;
  note?: string | null;
  payOnline: boolean;
  idempotencyKey: string;
  memberId?: number | null;
};

export type PlaceResult =
  | { ok: true; orderId: number; token: string; label: string; totalCents: number }
  | { ok: false; error: "closed" | "slot-full" | "invalid" | string };

export async function placeOnlineOrder(payload: Payload, input: PlaceInput, now = new Date()): Promise<PlaceResult> {
  const { enabled, settings, tables } = await onlineSettings(payload);
  const tableNo = input.table ?? null;
  if (tableNo != null) {
    // Table orders: switched on, a real table, and the salon open right now.
    if (!tables || !Number.isInteger(tableNo) || tableNo < 1 || tableNo > tables) return { ok: false, error: "closed" };
    if (!openNow(settings, now)) return { ok: false, error: "closed" };
  } else {
    if (!enabled) return { ok: false, error: "closed" };
    if (!input.pickupAt) return { ok: false, error: "invalid" };
  }

  const existing = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { idempotencyKey: { equals: input.idempotencyKey } },
  });
  if (existing.docs[0]) {
    const o = existing.docs[0];
    // A retried key only returns the order to the same customer.
    if ((o.customerEmail ?? "").toLowerCase() !== input.email.trim().toLowerCase()) return { ok: false, error: "invalid" };
    return { ok: true, orderId: o.id, token: o.publicToken ?? "", label: o.label ?? "", totalCents: o.totalCents };
  }

  const open = await payload.count({
    collection: "orders",
    overrideAccess: true,
    where: {
      and: [
        { channel: { equals: "online" } },
        { customerEmail: { equals: input.email.trim().toLowerCase() } },
        { status: { in: ["received", "preparing", "ready"] } },
        { pickupAt: { greater_than_equal: now.toISOString() } },
      ],
    },
  });
  if (open.totalDocs >= MAX_OPEN_PER_EMAIL) return { ok: false, error: "too-many" };

  const catalog = new Map((await loadCatalog(payload, "es", "online")).map((i) => [i.id, i]));
  // Shop units are scarce: a few per order, and held only by orders that pay
  // online (an unpaid card checkout lets them go after 30 minutes).
  const shopUnits = new Map<number, number>();
  for (const l of input.lines) if (catalog.get(l.menuItemId)?.shop) shopUnits.set(l.menuItemId, (shopUnits.get(l.menuItemId) ?? 0) + l.quantity);
  if ([...shopUnits.values()].some((q) => q > MAX_SHOP_UNITS)) return { ok: false, error: "too-many-units" };
  if (shopUnits.size && !input.payOnline && stripeEnabled()) return { ok: false, error: "pay-online" };
  // Measured grams are a barista input, never a customer one.
  const priced = priceOrder(catalog, input.lines.map((l) => ({ ...l, grams: null })));
  if (!priced.ok) return { ok: false, error: priced.error };

  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    // Re-check the slot inside the transaction, under a lock on the
    // sequence row, so two customers cannot both take the last place.
    const seq = table(payload, "sequences");
    await query(payload, sql`insert into ${seq} (key, value, updated_at, created_at) values ('order-label', 0, now(), now()) on conflict (key) do nothing`, req);
    const rows = await query(payload, sql`update ${seq} set value = value + 1 where key = 'order-label' returning value`, req);
    if (tableNo == null && !isBookable(settings, now, await takenSlots(payload, now), input.pickupAt!)) {
      await killTransaction(req);
      return { ok: false, error: "slot-full" };
    }
    if (!(await takeUnits(req, catalog, input.lines))) {
      await killTransaction(req);
      return { ok: false, error: "unavailable-item" };
    }
    const label = `W-${String(Number(rows[0].value) % 10000).padStart(4, "0")}`;
    const token = randomBytes(24).toString("base64url");
    const order = await payload.create({
      collection: "orders",
      req,
      overrideAccess: true,
      data: {
        label,
        channel: "online",
        service: tableNo != null ? "here" : "takeaway",
        status: "received",
        paymentStatus: "unpaid",
        payOnline: input.payOnline,
        table: tableNo ?? undefined,
        lines: priced.lines,
        totalCents: priced.totalCents,
        taxBreakdown: priced.taxBreakdown,
        note: input.note?.trim() || undefined,
        customerName: input.name.trim(),
        customerEmail: input.email.trim().toLowerCase(),
        customerPhone: input.phone?.trim() || undefined,
        pickupAt: tableNo != null ? now.toISOString() : input.pickupAt,
        statusChangedAt: now.toISOString(),
        publicToken: token,
        idempotencyKey: input.idempotencyKey,
        member: input.memberId ?? undefined,
      } as never,
    });
    await commitTransaction(req);
    return { ok: true, orderId: order.id, token, label, totalCents: priced.totalCents };
  } catch (err) {
    await killTransaction(req);
    // Two submits with one key at the same instant: the unique index wins,
    // the loser returns the order the winner created.
    const again = await payload.find({ collection: "orders", overrideAccess: true, depth: 0, limit: 1, where: { idempotencyKey: { equals: input.idempotencyKey } } });
    const o = again.docs[0];
    if (o && (o.customerEmail ?? "").toLowerCase() === input.email.trim().toLowerCase()) {
      return { ok: true, orderId: o.id, token: o.publicToken ?? "", label: o.label ?? "", totalCents: o.totalCents };
    }
    throw err;
  }
}

/** Stripe says the checkout expired unpaid: cancel, freeing the slot. */
export async function cancelUnpaidOnline(payload: Payload, orderId: number) {
  const o = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!o || o.channel !== "online" || o.paymentStatus !== "unpaid" || !o.payOnline) return false;
  if (o.status !== "received" && o.kind !== "membership") return false;
  return cancelOrderOnce(payload, orderId, { onlyUnpaid: true });
}

/** Stripe confirmed payment: record it, invoice, deduct stock. Idempotent. */
export async function markOnlinePaid(
  payload: Payload,
  orderId: number,
  providerRef: string,
  amountCents?: number,
  opts: { notify?: boolean } = {},
) {
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  let touched: number[] = [];
  try {
    const orders = table(payload, "orders");
    await query(payload, sql`select id from ${orders} where id = ${orderId} for update`, req);
    const order = await payload.findByID({ collection: "orders", id: orderId, req, depth: 0, overrideAccess: true }).catch(() => null);
    // A cancelled order (its units already returned) never becomes paid late.
    if (!order || order.paymentStatus !== "unpaid" || order.status === "cancelled" || (amountCents !== undefined && amountCents !== order.totalCents)) {
      await commitTransaction(req);
      return false;
    }
    await payload.create({
      collection: "payments",
      req,
      overrideAccess: true,
      data: { order: order.id, method: "online", amountCents: order.totalCents, providerRef },
    });
    await issueInvoiceFor(req, order);
    touched = await deductForOrder(req, order);
    await payload.update({ collection: "orders", id: order.id, req, overrideAccess: true, data: { paymentStatus: "paid" } });
    await commitTransaction(req);
  } catch (err) {
    await killTransaction(req);
    throw err;
  }
  if (touched.length) await draftReorders(payload, touched).catch(() => undefined);
  if (opts.notify !== false) await sendConfirmation(payload, orderId).catch(() => undefined);
  return true;
}

/** What the customer's private status page may show. */
export async function orderByToken(payload: Payload, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { publicToken: { equals: token } },
  });
  const o = docs[0];
  if (!o) return null;
  return {
    label: o.label ?? "",
    status: o.status,
    paymentStatus: o.paymentStatus,
    payOnline: Boolean(o.payOnline),
    pickupAt: o.pickupAt ?? null,
    table: o.table ?? null,
    totalCents: o.totalCents,
    firstName: (o.customerName ?? "").split(" ")[0],
    lines: (o.lines ?? []).map((l) => ({
      name: l.name,
      quantity: l.quantity,
      modifiers: ((l.modifiers as { label: string }[] | null) ?? []).map((m) => m.label),
    })),
  };
}

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendConfirmation(payload: Payload, orderId: number) {
  const o = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true });
  if (!o.customerEmail || !o.publicToken) return;
  const when = o.pickupAt ? new Date(o.pickupAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const items = (o.lines ?? []).map((l) => `<li>${l.quantity} × ${escapeHtml(l.name)}</li>`).join("");
  await sendEmail(
    o.customerEmail,
    `Tu pedido ${o.label} · maisha matcha`,
    emailFrame(
      `Pedido ${o.label}`,
      `<p>Recógelo ${escapeHtml(when)}.</p><ul>${items}</ul><p>Total ${formatEuro(o.totalCents)}${o.paymentStatus === "paid" ? ", pagado" : ", se paga al recoger"}.</p>
       <p><a style="color:#1C1B18" href="${siteUrl()}/es/pedido/${o.publicToken}">Ver el estado del pedido</a></p>`,
    ),
  );
}

export async function sendReady(payload: Payload, orderId: number) {
  const o = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true });
  if (o.channel !== "online" || !o.customerEmail || o.readyNotifiedAt) return;
  await sendEmail(
    o.customerEmail,
    `Tu pedido ${o.label} está listo`,
    emailFrame(`${o.label} está listo`, `<p>Te esperamos en la barra. Plaza Cetina, 3.</p>`),
  );
  await payload.update({ collection: "orders", id: orderId, overrideAccess: true, data: { readyNotifiedAt: new Date().toISOString() } });
}

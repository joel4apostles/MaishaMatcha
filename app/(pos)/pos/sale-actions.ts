"use server";

import { z } from "zod";
import { MAX_GRAMS, MAX_NOTE, MAX_QUANTITY } from "@/lib/pos/pricing";
import {
  advanceOrder,
  closeShift,
  createOrder,
  issueFullInvoice,
  kitchenQueue,
  openShift,
  payOrder,
  type Actor,
} from "@/lib/pos/sales";
import { currentPosSession, payloadClient } from "@/lib/pos/server";
import { rateLimit } from "@/lib/rateLimit";
import { emailReceipt } from "@/lib/receipt";

/**
 * Counter server actions. Each one re-resolves the POS session from its
 * cookies (person + device + PIN version) and takes the actor from there,
 * never from the client. Inputs are validated with zod; prices are never
 * accepted from the client.
 */
type Fail = { ok: false; error: string };
const noSession: Fail = { ok: false, error: "no-session" };
const invalid: Fail = { ok: false, error: "invalid" };

async function actor(): Promise<Actor | null> {
  const s = await currentPosSession();
  return s ? { staffId: s.staff.id, deviceId: s.device.id } : null;
}

const cents = z.number().int().min(0).max(1_000_000);

export async function openShiftAction(floatCents: number) {
  const a = await actor();
  if (!a) return noSession;
  const p = cents.safeParse(floatCents);
  if (!p.success) return invalid;
  return openShift(await payloadClient(), a, p.data);
}

const lineSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  modifierKeys: z.array(z.string().max(80)).max(20),
  grams: z.number().positive().max(MAX_GRAMS).nullable().optional(),
  note: z.string().max(MAX_NOTE).nullable().optional(),
});

const chargeSchema = z.object({
  idempotencyKey: z.string().uuid(),
  service: z.enum(["here", "takeaway"]),
  lines: z.array(lineSchema).min(1).max(40),
  note: z.string().max(MAX_NOTE).nullable().optional(),
  method: z.enum(["cash", "card_terminal", "split"]),
  tenderedCents: cents.optional(),
  cardCents: cents.optional(),
});

/** Create (idempotently) and pay in one step: what the "Cobrar" button does. */
export async function chargeAction(input: z.infer<typeof chargeSchema>) {
  const a = await actor();
  if (!a) return noSession;
  const p = chargeSchema.safeParse(input);
  if (!p.success) return invalid;
  const payload = await payloadClient();
  const order = await createOrder(payload, a, p.data);
  if (!order.ok) return order;
  const paid = await payOrder(payload, a, {
    orderId: order.orderId,
    method: p.data.method,
    tenderedCents: p.data.tenderedCents,
    cardCents: p.data.cardCents,
  });
  if (!paid.ok) {
    // A retried charge of an order that was already paid is a success.
    if (paid.error === "already-paid" && order.duplicate) return { ok: true as const, orderId: order.orderId, label: order.label, invoiceNumber: null, changeCents: 0 };
    return paid;
  }
  return { ok: true as const, orderId: order.orderId, label: order.label, invoiceNumber: paid.invoiceNumber, changeCents: paid.changeCents };
}

export async function closeShiftAction(countedCashCents: number) {
  const a = await actor();
  if (!a) return noSession;
  const p = cents.safeParse(countedCashCents);
  if (!p.success) return invalid;
  return closeShift(await payloadClient(), a, p.data);
}

export async function kitchenQueueAction() {
  const a = await actor();
  if (!a) return { ok: false as const, error: "no-session", orders: [] };
  return { ok: true as const, orders: await kitchenQueue(await payloadClient()) };
}

const statusSchema = z.enum(["preparing", "ready", "collected", "cancelled"]);

export async function advanceOrderAction(orderId: number, to: string) {
  const a = await actor();
  if (!a) return noSession;
  const s = statusSchema.safeParse(to);
  if (!s.success || !Number.isInteger(orderId)) return invalid;
  return advanceOrder(await payloadClient(), a, orderId, s.data);
}

export async function voidOrderAction(orderId: number, reason: string) {
  const a = await actor();
  if (!a) return noSession;
  if (!Number.isInteger(orderId) || typeof reason !== "string" || reason.length > 300) return invalid;
  const { voidOrder } = await import("@/lib/pos/sales");
  return voidOrder(await payloadClient(), a, orderId, reason);
}

const refundSchema = z.object({
  orderId: z.number().int().positive(),
  amountCents: z.number().int().positive().max(1_000_000),
  reason: z.string().min(1).max(300),
  approverId: z.number().int().positive().optional(),
  approverPin: z.string().regex(/^\d{4,6}$/).optional(),
});

export async function refundOrderAction(input: z.infer<typeof refundSchema>) {
  const a = await actor();
  if (!a) return noSession;
  const p = refundSchema.safeParse(input);
  if (!p.success) return invalid;
  const { refundOrder } = await import("@/lib/pos/sales");
  return refundOrder(await payloadClient(), a, {
    orderId: p.data.orderId,
    amountCents: p.data.amountCents,
    reason: p.data.reason,
    approver: p.data.approverId && p.data.approverPin ? { staffId: p.data.approverId, pin: p.data.approverPin } : undefined,
  });
}

const customerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  taxId: z.string().trim().min(5).max(30),
  address: z.string().trim().min(3).max(200),
});

/** A customer asks for a full invoice for a paid ticket (factura completa). */
export async function fullInvoiceAction(orderId: number, customer: z.infer<typeof customerSchema>) {
  const a = await actor();
  if (!a) return noSession;
  const p = customerSchema.safeParse(customer);
  if (!p.success || !Number.isInteger(orderId)) return invalid;
  return issueFullInvoice(await payloadClient(), a, orderId, p.data);
}

/** Email a copy of the ticket (or full invoice). The address is not stored. */
export async function emailReceiptAction(orderId: number, email: string) {
  const a = await actor();
  if (!a) return noSession;
  const p = z.email().max(254).safeParse(String(email).trim());
  if (!p.success || !Number.isInteger(orderId)) return invalid;
  if (!rateLimit(`receipt:${a.deviceId}`, 20)) return { ok: false as const, error: "rate-limited" };
  return emailReceipt(await payloadClient(), orderId, p.data);
}

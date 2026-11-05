"use server";

import { z } from "zod";
import { MAX_GRAMS, MAX_NOTE, MAX_QUANTITY } from "@/lib/pos/pricing";
import {
  advanceOrder,
  closeShift,
  createOrder,
  kitchenQueue,
  openShift,
  payOrder,
  type Actor,
} from "@/lib/pos/sales";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

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
  method: z.enum(["cash", "card_terminal"]),
  tenderedCents: cents.optional(),
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

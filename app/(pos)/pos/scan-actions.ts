"use server";

import { createLocalReq } from "payload";
import { z } from "zod";
import { writeAudit } from "@/cms/audit";
import { createOrder, payOrder } from "@/lib/pos/sales";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

/**
 * Saving what a scan suggested, ONLY after a person confirmed every number
 * on screen. Receiving stock is for owner/manager; back-entering a paper
 * ticket is any signed-in staff with an open shift (it is a sale).
 */
const noSession = { ok: false as const, error: "no-session" };
const invalid = { ok: false as const, error: "invalid" };

const receiveSchema = z.object({
  idempotencyKey: z.string().uuid(),
  poId: z.number().int().positive(),
  packs: z.array(z.object({ index: z.number().int().min(0).max(100), packs: z.number().int().min(0).max(500) })).max(100),
});

export async function receiveScannedAction(input: z.infer<typeof receiveSchema>) {
  const s = await currentPosSession();
  if (!s) return noSession;
  if (s.staff.role !== "owner" && s.staff.role !== "manager") return { ok: false as const, error: "forbidden" };
  const p = receiveSchema.safeParse(input);
  if (!p.success) return invalid;
  const payload = await payloadClient();
  // A double tap or a retried request never receives the same note twice.
  const seen = await payload.count({ collection: "audit-log", overrideAccess: true, where: { and: [{ action: { equals: "po.received" } }, { reason: { contains: p.data.idempotencyKey } }] } });
  if (seen.totalDocs > 0) return { ok: true as const };
  const po = await payload.findByID({ collection: "purchase-orders", id: p.data.poId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!po || (po.status !== "sent" && po.status !== "partially_received")) return { ok: false as const, error: "not-open" };
  const lines = (po.lines ?? []).map((l, i) => {
    const add = p.data.packs.find((x) => x.index === i)?.packs ?? 0;
    return { ...l, receivedPacks: (l.receivedPacks ?? 0) + add };
  });
  if (lines.every((l, i) => l.receivedPacks === (po.lines?.[i]?.receivedPacks ?? 0))) return { ok: false as const, error: "nothing" };
  // More than ordered is almost always a misread: correct it in /admin if real.
  if (lines.some((l) => l.receivedPacks > l.packs)) return { ok: false as const, error: "over-ordered" };
  // Same path as receiving in /admin: the update hook brings the stock in.
  const user = await payload.findByID({ collection: "users", id: s.staff.id, depth: 0, overrideAccess: true });
  const req = await createLocalReq({ user: { ...user, collection: "users" } as never }, payload);
  await payload.update({ collection: "purchase-orders", id: po.id, req, overrideAccess: true, data: { lines } });
  await writeAudit({ payload }, {
    action: "po.received",
    entity: "purchase-orders",
    entityId: po.id,
    actorId: s.staff.id,
    deviceId: s.device.id,
    reason: `Albarán escaneado y confirmado (${p.data.idempotencyKey})`,
  });
  return { ok: true as const };
}

const ticketSchema = z.object({
  idempotencyKey: z.string().uuid(),
  // A paper ticket is from the past (or today), never the future.
  paperDate: z.iso.date().refine((d) => d <= new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()), "future"),
  method: z.enum(["cash", "card_terminal"]),
  lines: z.array(z.object({ menuItemId: z.number().int().positive(), quantity: z.number().int().min(1).max(20), modifierKeys: z.array(z.string().max(80)).max(20) })).min(1).max(40),
});

export async function backEnterTicketAction(input: z.infer<typeof ticketSchema>) {
  const s = await currentPosSession();
  if (!s) return noSession;
  const p = ticketSchema.safeParse(input);
  if (!p.success) return invalid;
  const payload = await payloadClient();
  const actor = { staffId: s.staff.id, deviceId: s.device.id };
  const [y, m, d] = p.data.paperDate.split("-");
  const order = await createOrder(payload, actor, {
    lines: p.data.lines,
    service: "here",
    // The invoice is issued today (records are never back-dated); the note
    // keeps the day of the paper ticket for the gestor.
    note: `Ticket en papel del ${d}/${m}/${y} (escaneado y confirmado)`,
    idempotencyKey: p.data.idempotencyKey,
  });
  if (!order.ok) return order;
  const paid = await payOrder(payload, actor, {
    orderId: order.orderId,
    method: p.data.method,
    tenderedCents: p.data.method === "cash" ? order.totalCents : undefined,
  });
  if (!paid.ok && !(paid.error === "already-paid" && order.duplicate)) return paid;
  return { ok: true as const, orderId: order.orderId, totalCents: order.totalCents };
}

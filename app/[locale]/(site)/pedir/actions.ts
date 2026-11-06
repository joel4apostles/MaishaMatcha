"use server";

import { headers } from "next/headers";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { placeOnlineOrder, sendConfirmation } from "@/lib/online";
import { MAX_NOTE, MAX_QUANTITY } from "@/lib/pos/pricing";
import { rateLimit } from "@/lib/rateLimit";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { currentMember } from "@/lib/members-server";

/**
 * The public "place order" action. Rate-limited per IP, validated with zod,
 * priced on the server. Pay online goes to Stripe's hosted checkout; the
 * webhook (not this redirect) is what marks the order paid.
 */
const schema = z.object({
  idempotencyKey: z.string().uuid(),
  locale: z.enum(["es", "en"]),
  name: z.string().trim().min(1).max(80),
  email: z.email().max(254),
  phone: z.string().trim().max(30).optional().nullable(),
  note: z.string().trim().max(MAX_NOTE).optional().nullable(),
  pickupAt: z.iso.datetime().optional().nullable(),
  table: z.number().int().min(1).max(60).optional().nullable(),
  payOnline: z.boolean(),
  lines: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
        modifierKeys: z.array(z.string().max(80)).max(20),
        note: z.string().max(MAX_NOTE).nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
});

function clientIp(h: Headers) {
  return (h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
}

export async function placeOrderAction(input: z.infer<typeof schema>): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  const h = await headers();
  if (!rateLimit(`order:${clientIp(h)}`)) return { ok: false, error: "rate-limited" };
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const payload = await getPayload({ config });
  // Never build payment return URLs from the Host header in production.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? null : `http://${h.get("host")}`);
  const payOnline = p.data.payOnline && stripeEnabled() && base !== null;

  // Signed-in members get the order on their account (the session decides, not the client).
  const member = await currentMember();
  const placed = await placeOnlineOrder(payload, { ...p.data, payOnline,
    memberId: member && member.email === p.data.email.trim().toLowerCase() ? member.id : null,
  });
  if (!placed.ok) return { ok: false, error: placed.error };

  if (!p.data.table && !p.data.pickupAt) return { ok: false, error: "invalid" };
  const statusPath = `/${p.data.locale}/${p.data.locale === "es" ? "pedido" : "order-status"}/${placed.token}`;
  if (!payOnline || !base) {
    await sendConfirmation(payload, placed.orderId).catch(() => undefined);
    return { ok: true, redirect: statusPath };
  }
  const order = await payload.findByID({ collection: "orders", id: placed.orderId, depth: 0, overrideAccess: true });
  try {
    const session = await createCheckoutSession({
      orderId: placed.orderId,
      label: placed.label,
      lines: (order.lines ?? []).map((l) => ({ name: l.name, quantity: l.quantity, unitCents: l.unitCents })),
      email: p.data.email,
      successUrl: `${base}${statusPath}`,
      cancelUrl: `${base}/${p.data.locale}/${p.data.locale === "es" ? "pedir" : "order"}`,
      locale: p.data.locale,
    });
    return { ok: true, redirect: session.url };
  } catch {
    return { ok: false, error: "generic" };
  }
}

import { randomBytes } from "node:crypto";
import type { Payload, Where } from "payload";
import { query, sql, table } from "@/cms/db";
import { writeAudit } from "@/cms/audit";
import { emailFrame, escapeHtml, sendEmail } from "@/lib/email";
import { taxBreakdown } from "@/lib/money";
import { markOnlinePaid } from "@/lib/online";
import { createPortalSession, createSubscriptionCheckout, liveSubscriptions, stripeEnabled } from "@/lib/stripe";

/**
 * Premium subscription: monthly, through Stripe. Founding members pay the
 * founding price if Empresa sets one (the promise made on the home page).
 * Every paid month becomes an order of kind "subscription" with its payment
 * and invoice in the chain. Stripe is the source of truth for the status;
 * the webhook mirrors it onto the member.
 *
 * The monthly box (founder, 2026-11-09): one fixed shop product, set in
 * Empresa. Each paid month the order carries it, takes one unit, and waits
 * as "ready": collected at the bar, or posted by the owner (flat shipping
 * fee, address in Spain collected by Stripe Checkout) and marked shipped.
 */
export type BoxDelivery = "pickup" | "shipping";
type MemberLike = {
  id: number;
  name: string;
  email: string;
  tier: string;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
};

export async function premiumSettings(payload: Payload, locale: "es" | "en" = "es") {
  const b = await payload.findGlobal({ slug: "business", overrideAccess: true, depth: 1, locale });
  const rate = b.premiumTaxRate && typeof b.premiumTaxRate === "object" ? b.premiumTaxRate.rateBasisPoints : null;
  return {
    open: Boolean(b.premiumOpen && b.premiumMonthlyCents && rate != null && stripeEnabled()),
    monthlyCents: b.premiumMonthlyCents ?? null,
    foundingMonthlyCents: b.premiumFoundingMonthlyCents ?? null,
    rateBasisPoints: rate,
    perks: (b.premiumPerks ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean),
    product:
      b.premiumProduct && typeof b.premiumProduct === "object"
        ? { id: b.premiumProduct.id, name: b.premiumProduct.name, stock: b.premiumProduct.stock ?? null }
        : null,
    // null = pickup only.
    shippingCents: typeof b.premiumShippingCents === "number" ? b.premiumShippingCents : null,
  };
}

export const isPremium = (m: { subscriptionStatus?: string | null }) => m.subscriptionStatus === "active";

export function monthlyPriceFor(member: { tier: string }, s: { monthlyCents: number | null; foundingMonthlyCents: number | null }) {
  return member.tier === "founding" && s.foundingMonthlyCents ? s.foundingMonthlyCents : s.monthlyCents;
}

export async function startPremium(payload: Payload, member: MemberLike, locale: "es" | "en", baseUrl: string, delivery: BoxDelivery = "pickup") {
  if (member.subscriptionStatus === "active" || member.subscriptionStatus === "past_due") return { ok: false as const, error: "already" };
  const s = await premiumSettings(payload, locale);
  const price = monthlyPriceFor(member, s);
  if (!s.open || !price || s.rateBasisPoints == null) return { ok: false as const, error: "closed" };
  if (delivery === "shipping" && s.shippingCents == null) return { ok: false as const, error: "closed" };
  const account = `${baseUrl}/${locale}/${locale === "es" ? "cuenta" : "account"}`;
  try {
    // Stripe is the truth: never open a second subscription for one customer.
    if (member.stripeCustomerId && (await liveSubscriptions(member.stripeCustomerId)) > 0) return { ok: false as const, error: "already" };
    const session = await createSubscriptionCheckout({
      memberId: member.id,
      name: locale === "es" ? "maisha matcha · suscripción mensual" : "maisha matcha · monthly membership",
      monthlyCents: price,
      taxRateBasisPoints: s.rateBasisPoints,
      customerId: member.stripeCustomerId,
      email: member.email,
      successUrl: `${account}?premium=1`,
      cancelUrl: account,
      locale,
      shipping:
        delivery === "shipping" && s.shippingCents != null
          ? { cents: s.shippingCents, name: locale === "es" ? "Envío a casa de la caja mensual" : "Home delivery of the monthly box" }
          : null,
    });
    return { ok: true as const, url: session.url };
  } catch {
    return { ok: false as const, error: "generic" };
  }
}

export async function premiumPortal(member: MemberLike, returnUrl: string) {
  if (!member.stripeCustomerId || !stripeEnabled()) return { ok: false as const, error: "closed" };
  try {
    return { ok: true as const, url: (await createPortalSession(member.stripeCustomerId, returnUrl)).url };
  } catch {
    return { ok: false as const, error: "generic" };
  }
}

// ------------------------------------------------------------- webhook side

type Meta = { kind?: string; memberId?: string; taxBp?: string; delivery?: string; shipCents?: string } | null | undefined;

type StripeAddress = { line1?: string | null; line2?: string | null; postal_code?: string | null; city?: string | null; state?: string | null; country?: string | null };
type ShippingDetails = { name?: string | null; address?: StripeAddress | null } | null | undefined;

/** Stripe's shipping details as our address group (Spain only, by Checkout's own rule). */
export function shipToFrom(details: ShippingDetails, phone?: string | null) {
  const a = details?.address;
  if (!a?.line1 || !a.postal_code) return null;
  return {
    name: details?.name ?? null,
    phone: phone ?? null,
    line1: a.line1,
    line2: a.line2 ?? null,
    postalCode: a.postal_code,
    city: a.city ?? null,
    province: a.state ?? null,
  };
}

async function findMember(payload: Payload, meta: Meta, subscriptionId?: string | null, customerId?: string | null) {
  const id = Number(meta?.memberId);
  if (Number.isInteger(id) && id > 0) {
    const m = await payload.findByID({ collection: "members", id, depth: 0, overrideAccess: true, showHiddenFields: true }).catch(() => null);
    if (m) return m;
  }
  const or: Where[] = [];
  if (subscriptionId) or.push({ stripeSubscriptionId: { equals: subscriptionId } });
  if (customerId) or.push({ stripeCustomerId: { equals: customerId } });
  if (!or.length) return null;
  const { docs } = await payload.find({ collection: "members", overrideAccess: true, showHiddenFields: true, depth: 0, limit: 1, where: { or } });
  return docs[0] ?? null;
}

/** checkout.session.completed for a subscription: remember Stripe's ids. */
export async function onPremiumCheckout(
  payload: Payload,
  session: {
    metadata?: Meta;
    customer?: string | null;
    subscription?: string | null;
    shipping_details?: ShippingDetails;
    collected_information?: { shipping_details?: ShippingDetails } | null;
    customer_details?: { phone?: string | null } | null;
  },
) {
  const m = await findMember(payload, session.metadata);
  if (!m) return false;
  const shipping = session.metadata?.delivery === "shipping";
  // Newer Stripe API versions move the address under collected_information.
  const shipTo = shipping ? shipToFrom(session.collected_information?.shipping_details ?? session.shipping_details, session.customer_details?.phone) : null;
  await payload.update({
    collection: "members",
    id: m.id,
    overrideAccess: true,
    // Ids only: the status comes from customer.subscription.* events (a
    // delayed payment method must not read as paid).
    data: {
      stripeCustomerId: session.customer ?? undefined,
      stripeSubscriptionId: session.subscription ?? undefined,
      boxDelivery: shipping ? "shipping" : "pickup",
      ...(shipTo ? { shipTo } : {}),
    },
  });
  return true;
}

/** The order lines of one paid month: the box (or the plain fee) and, if posted, the shipping. */
export function boxLines(input: {
  amountPaid: number;
  rateBasisPoints: number;
  shipCents: number;
  product: { id: number; name: string } | null;
  locale: "es" | "en";
}) {
  const es = input.locale !== "en";
  const ship = input.shipCents > 0 && input.amountPaid > input.shipCents ? input.shipCents : 0;
  const fee = input.amountPaid - ship;
  const lines: { name: string; quantity: number; unitCents: number; taxRateBasisPoints: number; modifiers: never[]; menuItem?: number }[] = [
    input.product
      ? { name: es ? `Caja mensual: ${input.product.name}` : `Monthly box: ${input.product.name}`, quantity: 1, unitCents: fee, taxRateBasisPoints: input.rateBasisPoints, modifiers: [], menuItem: input.product.id }
      : { name: es ? "Suscripción mensual" : "Monthly membership", quantity: 1, unitCents: fee, taxRateBasisPoints: input.rateBasisPoints, modifiers: [] },
  ];
  if (ship) lines.push({ name: es ? "Envío a casa" : "Home delivery", quantity: 1, unitCents: ship, taxRateBasisPoints: input.rateBasisPoints, modifiers: [] });
  return lines;
}

type StripeInvoice = {
  id: string;
  amount_paid: number;
  customer?: string | null;
  subscription?: string | null;
  payment_intent?: string | null;
  subscription_details?: { metadata?: Meta } | null;
  parent?: { subscription_details?: { metadata?: Meta; subscription?: string } | null } | null;
  lines?: { data?: { period?: { end?: number } }[] };
};

/** invoice.paid: one order + payment + invoice per paid month. Idempotent per Stripe invoice. */
export async function onPremiumInvoicePaid(payload: Payload, inv: StripeInvoice) {
  const meta = inv.parent?.subscription_details?.metadata ?? inv.subscription_details?.metadata;
  const subscriptionId = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
  // Only our own membership invoices (manual dashboard invoices are not).
  if (meta?.kind !== "premium") return false;
  const m = await findMember(payload, meta, subscriptionId, inv.customer);
  if (!m) return false;
  if (!inv.amount_paid || inv.amount_paid <= 0) return true;

  const key = `stripe-invoice:${inv.id}`;
  const existing = await payload.find({ collection: "orders", overrideAccess: true, depth: 0, limit: 1, where: { idempotencyKey: { equals: key } } });
  let orderId = existing.docs[0]?.id;
  const settings = await premiumSettings(payload);
  let created = false;
  if (!orderId) {
    const rate = Number(meta?.taxBp ?? settings.rateBasisPoints);
    if (!Number.isInteger(rate)) throw new Error("premium invoice without an IVA rate");
    const delivery: BoxDelivery = (meta?.delivery ?? m.boxDelivery) === "shipping" ? "shipping" : "pickup";
    const lines = boxLines({
      amountPaid: inv.amount_paid,
      rateBasisPoints: rate,
      shipCents: delivery === "shipping" ? Number(meta?.shipCents ?? 0) || 0 : 0,
      product: settings.product,
      locale: (m.locale ?? "es") === "en" ? "en" : "es",
    });
    const breakdown = taxBreakdown(lines.map((l) => ({ grossCents: l.unitCents, rateBasisPoints: l.taxRateBasisPoints })));
    const shipTo = delivery === "shipping" && m.shipTo?.line1 ? m.shipTo : null;
    try {
      const order = await payload.create({
        collection: "orders",
        overrideAccess: true,
        data: {
          label: `S-${randomBytes(3).toString("hex").toUpperCase()}`,
          kind: "subscription",
          channel: "online",
          service: "takeaway",
          // A box waits at the bar (or for the post); a fee alone is done.
          status: settings.product ? "ready" : "collected",
          paymentStatus: "unpaid",
          payOnline: true,
          lines,
          fulfilment: settings.product ? delivery : undefined,
          ...(settings.product && shipTo ? { shipTo: { name: shipTo.name, phone: shipTo.phone, line1: shipTo.line1, line2: shipTo.line2, postalCode: shipTo.postalCode, city: shipTo.city, province: shipTo.province } } : {}),
          ...(settings.product && delivery === "shipping" && !shipTo ? { note: "SIN DIRECCIÓN: pide la dirección al suscriptor antes de enviar." } : {}),
          totalCents: breakdown.totalCents,
          taxBreakdown: breakdown.rates,
          member: m.id,
          customerName: m.name,
          customerEmail: m.email,
          idempotencyKey: key,
          publicToken: randomBytes(24).toString("base64url"),
          statusChangedAt: new Date().toISOString(),
        } as never,
      });
      orderId = order.id;
      created = true;
    } catch {
      // A concurrent retry created it first (unique idempotency key).
      orderId = (await payload.find({ collection: "orders", overrideAccess: true, depth: 0, limit: 1, where: { idempotencyKey: { equals: key } } })).docs[0]?.id;
      if (!orderId) throw new Error("premium order not created");
    }
  }
  // One tin per box, taken once (only by the call that created the order).
  if (created && settings.product) await takeBoxUnit(payload, orderId, settings.product.id);
  await markOnlinePaid(payload, orderId, inv.payment_intent ?? inv.id, inv.amount_paid, { notify: false });
  if (settings.product) await sendBoxReady(payload, orderId).catch(() => undefined);
  return true;
}

/** Takes one unit of the box product; when none is left the order says so (the box is still owed). */
async function takeBoxUnit(payload: Payload, orderId: number, productId: number) {
  const items = table(payload, "menu_items");
  const rows = await query(payload, sql`update ${items} set stock = stock - 1 where id = ${productId} and (stock is null or stock >= 1) returning stock`);
  if (rows.length === 0) {
    const o = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true });
    await payload.update({
      collection: "orders",
      id: orderId,
      overrideAccess: true,
      data: { note: [o.note, "SIN EXISTENCIAS: no quedaba ninguna lata al cobrar esta caja. Repón y entrégala."].filter(Boolean).join("\n") },
    });
  }
}

const monthName = (iso: string, locale: "es" | "en") =>
  new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "es-ES", { timeZone: "Europe/Madrid", month: "long" });

/** "Your box is waiting" (pickup) or "we are preparing it" (post). Once per box. */
export async function sendBoxReady(payload: Payload, orderId: number) {
  const o = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true });
  if (o.kind !== "subscription" || !o.customerEmail || o.readyNotifiedAt || o.status !== "ready") return;
  const month = monthName(o.createdAt, "es");
  const pickup = o.fulfilment !== "shipping";
  await sendEmail(
    o.customerEmail,
    pickup ? `Tu caja de ${month} te espera` : `Preparamos tu caja de ${month}`,
    emailFrame(
      pickup ? `Tu caja de ${month} te espera` : `Tu caja de ${month}`,
      pickup
        ? `<p>Está en la barra, a tu nombre. Plaza Cetina, 3, Murcia.</p>`
        : `<p>La preparamos y te avisamos cuando salga.</p>`,
    ),
  );
  await payload.update({ collection: "orders", id: orderId, overrideAccess: true, data: { readyNotifiedAt: new Date().toISOString() } });
}

/**
 * The owner posted a box: it leaves the "to ship" list (status collected,
 * shippedAt), the subscriber is told, the audit log keeps who. Exactly once.
 */
export async function markBoxShipped(payload: Payload, orderId: number, actorId: number) {
  const orders = table(payload, "orders");
  const rows = await query(
    payload,
    sql`update ${orders} set status = 'collected', shipped_at = now(), status_changed_at = now() where id = ${orderId} and kind = 'subscription' and fulfilment = 'shipping' and status = 'ready' returning id`,
  );
  if (rows.length === 0) return false;
  await writeAudit({ payload }, { action: "box.shipped", entity: "orders", entityId: orderId, actorId });
  const o = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true });
  if (o.customerEmail) {
    const month = monthName(o.createdAt, "es");
    await sendEmail(
      o.customerEmail,
      `Tu caja de ${month} va de camino`,
      emailFrame(`Tu caja de ${month} va de camino`, `<p>Ha salido hoy hacia ${escapeHtml([o.shipTo?.city, o.shipTo?.province].filter(Boolean).join(", "))}.</p>`),
    ).catch(() => undefined);
  }
  return true;
}

/** A pickup box handed over (from the admin; the bar uses the order queue). Exactly once. */
export async function markBoxCollected(payload: Payload, orderId: number, actorId: number) {
  const orders = table(payload, "orders");
  const rows = await query(
    payload,
    sql`update ${orders} set status = 'collected', status_changed_at = now() where id = ${orderId} and kind = 'subscription' and status = 'ready' returning id`,
  );
  if (rows.length === 0) return false;
  await writeAudit({ payload }, { action: "box.collected", entity: "orders", entityId: orderId, actorId });
  return true;
}

/** Boxes still owed: waiting at the bar, and waiting for the post. */
export async function pendingBoxes(payload: Payload) {
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 500,
    sort: "createdAt",
    where: { and: [{ kind: { equals: "subscription" } }, { status: { equals: "ready" } }, { paymentStatus: { equals: "paid" } }] },
  });
  const row = (o: (typeof docs)[number]) => ({
    id: o.id,
    label: o.label ?? String(o.id),
    name: o.customerName ?? "",
    email: o.customerEmail ?? "",
    createdAt: o.createdAt,
    box: o.lines?.[0]?.name ?? "",
    note: o.note ?? null,
    shipTo: o.shipTo ?? null,
  });
  return {
    pickup: docs.filter((o) => o.fulfilment !== "shipping").map(row),
    shipping: docs.filter((o) => o.fulfilment === "shipping").map(row),
  };
}

/** This member's latest box, for their account page. */
export async function latestBox(payload: Payload, memberId: number) {
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    sort: "-createdAt",
    where: { and: [{ member: { equals: memberId } }, { kind: { equals: "subscription" } }, { fulfilment: { exists: true } }, { paymentStatus: { equals: "paid" } }] },
  });
  const o = docs[0];
  if (!o) return null;
  return { createdAt: o.createdAt, status: o.status, fulfilment: o.fulfilment ?? "pickup", shippedAt: o.shippedAt ?? null };
}

type StripeSubscription = {
  id: string;
  status: string;
  customer?: string | null;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number }[] };
  metadata?: Meta;
};

const STATUS: Record<string, "active" | "past_due" | "cancelled"> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  incomplete: "past_due",
  canceled: "cancelled",
  incomplete_expired: "cancelled",
  paused: "cancelled",
};

/** customer.subscription.updated / .deleted: mirror Stripe's status. */
export async function onPremiumSubscription(payload: Payload, sub: StripeSubscription, deleted = false, eventCreated?: number) {
  if (sub.metadata?.kind !== "premium") return false;
  const m = await findMember(payload, sub.metadata, sub.id, sub.customer);
  if (!m) return false;
  // Stripe does not deliver in order: an older event never overwrites a newer one.
  if (eventCreated && m.subscriptionEventAt && eventCreated < m.subscriptionEventAt) return false;
  // While one subscription is live, events about a different one (an old or
  // duplicate subscription) must not flip this member. A new one after a
  // cancellation is fine.
  const live = m.subscriptionStatus === "active" || m.subscriptionStatus === "past_due";
  if (live && m.stripeSubscriptionId && m.stripeSubscriptionId !== sub.id) return false;
  const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  await payload.update({
    collection: "members",
    id: m.id,
    overrideAccess: true,
    data: {
      subscriptionStatus: deleted ? "cancelled" : (STATUS[sub.status] ?? "past_due"),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      ...(end ? { subscriptionPeriodEnd: new Date(end * 1000).toISOString() } : {}),
      stripeSubscriptionId: sub.id,
      ...(eventCreated ? { subscriptionEventAt: eventCreated } : {}),
    },
  });
  return true;
}

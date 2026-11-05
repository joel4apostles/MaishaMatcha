import { randomBytes } from "node:crypto";
import type { Payload, Where } from "payload";
import { taxBreakdown } from "@/lib/money";
import { markOnlinePaid } from "@/lib/online";
import { createPortalSession, createSubscriptionCheckout, stripeEnabled } from "@/lib/stripe";

/**
 * Premium subscription: monthly, through Stripe. Founding members pay the
 * founding price if Empresa sets one (the promise made on the home page).
 * Every paid month becomes an order of kind "subscription" with its payment
 * and invoice in the chain. Stripe is the source of truth for the status;
 * the webhook mirrors it onto the member.
 */
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
  };
}

export const isPremium = (m: { subscriptionStatus?: string | null }) => m.subscriptionStatus === "active";

export function monthlyPriceFor(member: { tier: string }, s: { monthlyCents: number | null; foundingMonthlyCents: number | null }) {
  return member.tier === "founding" && s.foundingMonthlyCents ? s.foundingMonthlyCents : s.monthlyCents;
}

export async function startPremium(payload: Payload, member: MemberLike, locale: "es" | "en", baseUrl: string) {
  if (member.subscriptionStatus === "active" || member.subscriptionStatus === "past_due") return { ok: false as const, error: "already" };
  const s = await premiumSettings(payload, locale);
  const price = monthlyPriceFor(member, s);
  if (!s.open || !price || s.rateBasisPoints == null) return { ok: false as const, error: "closed" };
  const account = `${baseUrl}/${locale}/${locale === "es" ? "cuenta" : "account"}`;
  try {
    const session = await createSubscriptionCheckout({
      memberId: member.id,
      name: locale === "es" ? "maisha matcha · suscripción premium" : "maisha matcha · premium subscription",
      monthlyCents: price,
      taxRateBasisPoints: s.rateBasisPoints,
      customerId: member.stripeCustomerId,
      email: member.email,
      successUrl: `${account}?premium=1`,
      cancelUrl: account,
      locale,
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

type Meta = { kind?: string; memberId?: string; taxBp?: string } | null | undefined;

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
  session: { metadata?: Meta; customer?: string | null; subscription?: string | null },
) {
  const m = await findMember(payload, session.metadata);
  if (!m) return false;
  await payload.update({
    collection: "members",
    id: m.id,
    overrideAccess: true,
    data: { stripeCustomerId: session.customer ?? undefined, stripeSubscriptionId: session.subscription ?? undefined, subscriptionStatus: "active" },
  });
  return true;
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
  if (meta?.kind && meta.kind !== "premium") return false;
  const m = await findMember(payload, meta, subscriptionId, inv.customer);
  if (!m) return false;
  const periodEnd = inv.lines?.data?.[0]?.period?.end;
  await payload.update({
    collection: "members",
    id: m.id,
    overrideAccess: true,
    data: {
      subscriptionStatus: "active",
      ...(periodEnd ? { subscriptionPeriodEnd: new Date(periodEnd * 1000).toISOString() } : {}),
      ...(inv.customer ? { stripeCustomerId: inv.customer } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
  if (!inv.amount_paid || inv.amount_paid <= 0) return true;

  const key = `stripe-invoice:${inv.id}`;
  const existing = await payload.find({ collection: "orders", overrideAccess: true, depth: 0, limit: 1, where: { idempotencyKey: { equals: key } } });
  let orderId = existing.docs[0]?.id;
  if (!orderId) {
    const rate = Number(meta?.taxBp ?? (await premiumSettings(payload)).rateBasisPoints);
    if (!Number.isInteger(rate)) throw new Error("premium invoice without an IVA rate");
    const breakdown = taxBreakdown([{ grossCents: inv.amount_paid, rateBasisPoints: rate }]);
    const name = (m.locale ?? "es") === "en" ? "Premium subscription · month" : "Suscripción premium · mes";
    try {
      const order = await payload.create({
        collection: "orders",
        overrideAccess: true,
        data: {
          label: `S-${randomBytes(3).toString("hex").toUpperCase()}`,
          kind: "subscription",
          channel: "online",
          service: "takeaway",
          status: "collected",
          paymentStatus: "unpaid",
          payOnline: true,
          lines: [{ name, quantity: 1, unitCents: inv.amount_paid, taxRateBasisPoints: rate, modifiers: [] }],
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
    } catch {
      // A concurrent retry created it first (unique idempotency key).
      orderId = (await payload.find({ collection: "orders", overrideAccess: true, depth: 0, limit: 1, where: { idempotencyKey: { equals: key } } })).docs[0]?.id;
      if (!orderId) throw new Error("premium order not created");
    }
  }
  await markOnlinePaid(payload, orderId, inv.payment_intent ?? inv.id, inv.amount_paid, { notify: false });
  return true;
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
export async function onPremiumSubscription(payload: Payload, sub: StripeSubscription, deleted = false) {
  if (sub.metadata?.kind && sub.metadata.kind !== "premium") return false;
  const m = await findMember(payload, sub.metadata, sub.id, sub.customer);
  if (!m) return false;
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
    },
  });
  return true;
}

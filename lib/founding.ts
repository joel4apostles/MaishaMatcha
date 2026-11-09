import { randomBytes, randomUUID } from "node:crypto";
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import { query, sql, table } from "@/cms/db";
import { emailFrame, escapeHtml, sendEmail } from "@/lib/email";
import { taxBreakdown } from "@/lib/money";
import { markOnlinePaid } from "@/lib/online";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";

/**
 * The founding membership: a one-time fee paid through Stripe Checkout.
 * Price, IVA and number of places come from Empresa (never invented here);
 * until they are set, or Stripe is not configured, the offer stays closed.
 * The fee is recorded as an order of kind "membership" so it gets a payment
 * and an invoice in the chain like any sale, but never reaches the kitchen.
 */
export async function foundingSettings(payload: Payload, locale: "es" | "en" = "es") {
  const b = await payload.findGlobal({ slug: "business", overrideAccess: true, depth: 1, locale });
  const rate = b.foundingTaxRate && typeof b.foundingTaxRate === "object" ? b.foundingTaxRate.rateBasisPoints : null;
  const taken = (await payload.count({ collection: "members", overrideAccess: true, where: { tier: { equals: "founding" } } })).totalDocs;
  const cap = b.foundingCap ?? 50;
  const configured = Boolean(b.foundingOpen && b.foundingPriceCents && rate != null && stripeEnabled());
  return {
    open: configured && taken < cap,
    priceCents: b.foundingPriceCents ?? null,
    rateBasisPoints: rate,
    cap,
    taken,
    remaining: Math.max(0, cap - taken),
    perks: (b.foundingPerks ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean),
  };
}

export type StartResult = { ok: true; url: string } | { ok: false; error: "closed" | "already" | "pending" | "generic" };

/** A checkout started in the last half hour that Stripe has not settled. */
const PENDING_MINUTES = 30;

export async function startFounding(
  payload: Payload,
  member: { id: number; name: string; email: string; tier: string },
  locale: "es" | "en",
  baseUrl: string,
): Promise<StartResult> {
  if (member.tier === "founding") return { ok: false, error: "already" };
  const s = await foundingSettings(payload, locale);
  if (!s.open || !s.priceCents || s.rateBasisPoints == null) return { ok: false, error: "closed" };
  // Two tabs must not mean two payments.
  const pending = await payload.count({
    collection: "orders",
    overrideAccess: true,
    where: {
      and: [
        { kind: { equals: "membership" } },
        { member: { equals: member.id } },
        { paymentStatus: { equals: "unpaid" } },
        { status: { not_equals: "cancelled" } },
        { createdAt: { greater_than: new Date(Date.now() - PENDING_MINUTES * 60000).toISOString() } },
      ],
    },
  });
  if (pending.totalDocs > 0) return { ok: false, error: "pending" };
  const name = locale === "es" ? "Socio fundador · maisha matcha" : "Founding member · maisha matcha";
  const breakdown = taxBreakdown([{ grossCents: s.priceCents, rateBasisPoints: s.rateBasisPoints }]);
  const order = await payload.create({
    collection: "orders",
    overrideAccess: true,
    data: {
      label: `F-${randomBytes(3).toString("hex").toUpperCase()}`,
      kind: "membership",
      channel: "online",
      service: "takeaway",
      status: "collected",
      paymentStatus: "unpaid",
      payOnline: true,
      lines: [{ name, quantity: 1, unitCents: s.priceCents, taxRateBasisPoints: s.rateBasisPoints, modifiers: [] }],
      totalCents: breakdown.totalCents,
      taxBreakdown: breakdown.rates,
      member: member.id,
      customerName: member.name,
      customerEmail: member.email,
      idempotencyKey: randomUUID(),
      publicToken: randomBytes(24).toString("base64url"),
      statusChangedAt: new Date().toISOString(),
    } as never,
  });
  const account = `${baseUrl}/${locale}/${locale === "es" ? "cuenta" : "account"}`;
  try {
    const session = await createCheckoutSession({
      orderId: order.id,
      label: order.label ?? "",
      lines: [{ name, quantity: 1, unitCents: s.priceCents }],
      email: member.email,
      successUrl: `${account}?fundador=1`,
      cancelUrl: account,
      locale,
      kind: "founding",
    });
    return { ok: true, url: session.url };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/**
 * Stripe confirmed the founding fee: payment + invoice (via markOnlinePaid),
 * then the member's founding number from a locked sequence. Idempotent.
 */
export async function completeFounding(payload: Payload, orderId: number, providerRef: string, amountCents?: number) {
  const order = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!order || order.kind !== "membership" || !order.member) return false;
  await markOnlinePaid(payload, orderId, providerRef, amountCents, { notify: false });
  const paid = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true });
  if (paid.paymentStatus !== "paid") return false;
  const memberId = typeof paid.member === "object" ? paid.member!.id : (paid.member as number);

  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  let number: number | null = null;
  try {
    const members = table(payload, "members");
    await query(payload, sql`select id from ${members} where id = ${memberId} for update`, req);
    const m = await payload.findByID({ collection: "members", id: memberId, req, depth: 0, overrideAccess: true });
    const cap = (await payload.findGlobal({ slug: "business", req, overrideAccess: true })).foundingCap ?? 50;
    const founders = (await payload.count({ collection: "members", req, overrideAccess: true, where: { tier: { equals: "founding" } } })).totalDocs;
    if (m.tier === "founding" && m.foundingOrder === orderId) {
      // Stripe delivered the same payment again: the place is already given.
      await commitTransaction(req);
      return true;
    }
    if (m.tier === "founding" || founders >= cap) {
      // Paid but no place to give (a second payment, or the last place went
      // to a checkout that finished first): flag it for a refund, loudly.
      await payload.update({
        collection: "orders",
        id: orderId,
        req,
        overrideAccess: true,
        data: { note: m.tier === "founding" ? "DEVOLVER: segundo pago de la cuota de socio." : "DEVOLVER: pagada sin plaza libre (cupo completo)." },
      });
      await req.payload.create({
        collection: "audit-log",
        req,
        overrideAccess: true,
        data: { action: "founding.refund-due", entity: "orders", entityId: String(orderId), reason: "Cuota de socio pagada sin plaza: devolver en Stripe." },
      }).catch(() => undefined);
    } else {
      const seq = table(payload, "sequences");
      await query(payload, sql`insert into ${seq} (key, value, updated_at, created_at) values ('founding-number', 0, now(), now()) on conflict (key) do nothing`, req);
      const rows = await query(payload, sql`update ${seq} set value = value + 1 where key = 'founding-number' returning value`, req);
      number = Number(rows[0].value);
      await payload.update({
        collection: "members",
        id: memberId,
        req,
        overrideAccess: true,
        data: { tier: "founding", foundingNumber: number, foundingSince: new Date().toISOString(), foundingOrder: orderId },
      });
    }
    await commitTransaction(req);
  } catch (err) {
    await killTransaction(req);
    throw err;
  }
  if (number != null) {
    const m = await payload.findByID({ collection: "members", id: memberId, depth: 0, overrideAccess: true });
    const es = (m.locale ?? "es") === "es";
    await sendEmail(
      m.email,
      es ? `Socio fundador nº ${number} · maisha matcha` : `Founding member no. ${number} · maisha matcha`,
      emailFrame(
        es ? `Socio fundador nº ${number}` : `Founding member no. ${number}`,
        `<p>${es ? `Gracias, ${escapeHtml(m.name)}. Tu plaza queda guardada.` : `Thank you, ${escapeHtml(m.name)}. Your place is kept.`}</p>`,
      ),
    ).catch(() => undefined);
  }
  return true;
}

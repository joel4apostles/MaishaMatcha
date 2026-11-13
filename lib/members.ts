import type { Payload, PayloadRequest } from "payload";
import { emailFrame, escapeHtml, sendEmail } from "@/lib/email";
import { deriveKey, signToken, verifyToken } from "@/lib/pos/token";
import { appSecret } from "@/lib/secret";
import { priceLine, type CatalogItem, type LineInput } from "@/lib/pos/pricing";

/**
 * Customer accounts, passwordless. A sign-in link is a signed, short-lived
 * token carrying the email; the account is created the first time the link
 * is opened (so typing someone else's address creates nothing). Sessions
 * are signed cookies bound to the member's sessionVersion.
 */
const LINK_MINUTES = 20;
export const SESSION_DAYS = 60;
const UNSUB_DAYS = 800;

type Loc = "es" | "en";
type LinkPayload = { exp: number; p: "signin"; e: string; n?: string; l: Loc; next?: string };
type SessionPayload = { exp: number; p: "member"; mid: number; v: number };
type UnsubPayload = { exp: number; p: "unsub"; mid: number };
type ConfirmPayload = { exp: number; p: "optin"; mid: number };
const CONFIRM_DAYS = 30;

const nowS = () => Math.floor(Date.now() / 1000);
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const normEmail = (e: string) => e.trim().toLowerCase();

/** Only same-site relative paths survive as "come back here" targets. */
export function safeNext(next: string | null | undefined): string | undefined {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return undefined;
  return next.slice(0, 200);
}

/** Members' links and sessions have their own key, derived from the app secret. */
const membersKey = () => deriveKey(appSecret(), "members");

export function signInToken(email: string, locale: Loc, name?: string, next?: string, now = nowS()) {
  return signToken({ exp: now + LINK_MINUTES * 60, p: "signin", e: normEmail(email), n: name?.trim().slice(0, 80) || undefined, l: locale, next: safeNext(next) }, membersKey());
}

export function readSignInToken(token: string | null | undefined, now = nowS()) {
  const p = verifyToken<LinkPayload>(token, membersKey(), now);
  return p && p.p === "signin" && typeof p.e === "string" ? p : null;
}

export async function sendSignInLink(email: string, locale: Loc, name?: string, next?: string) {
  const url = `${site()}/${locale === "en" ? "en/account/sign-in" : "es/cuenta/entrar"}?t=${encodeURIComponent(signInToken(email, locale, name, next))}`;
  const es = locale === "es";
  return sendEmail(
    normEmail(email),
    es ? "Tu enlace para entrar · maisha matcha" : "Your sign-in link · maisha matcha",
    emailFrame(
      es ? "Entrar en tu cuenta" : "Sign in to your account",
      `<p>${es ? "Abre este enlace para entrar. Caduca en 20 minutos." : "Open this link to sign in. It expires in 20 minutes."}</p>
       <p><a style="color:#1C1B18" href="${escapeHtml(url)}">${es ? "Entrar" : "Sign in"}</a></p>
       <p style="font-size:13px;opacity:0.7">${es ? "Si no lo pediste, ignora este mensaje." : "If you did not ask for it, ignore this message."}</p>`,
    ),
  );
}

/** Open a sign-in link: find or create the account, return it. */
export async function consumeSignIn(payload: Payload, token: string, now = nowS()) {
  const p = readSignInToken(token, now);
  if (!p) return null;
  const found = await payload.find({ collection: "members", overrideAccess: true, depth: 0, limit: 1, where: { email: { equals: p.e } } });
  let member = found.docs[0];
  if (member?.status === "cancelled") return null;
  if (!member) {
    member = await payload.create({
      collection: "members",
      overrideAccess: true,
      data: { name: p.n || p.e.split("@")[0], email: p.e, tier: "customer", status: "active", locale: p.l, emailOptIn: false },
    });
  }
  await payload.update({ collection: "members", id: member.id, overrideAccess: true, data: { lastSignInAt: new Date(now * 1000).toISOString() } });
  return { member, locale: p.l, next: p.next };
}

export function sessionToken(member: { id: number; sessionVersion?: number | null }, now = nowS()) {
  return signToken({ exp: now + SESSION_DAYS * 86400, p: "member", mid: member.id, v: member.sessionVersion ?? 0 }, membersKey());
}

export async function memberFromSession(payload: Payload, token: string | null | undefined, now = nowS()) {
  const p = verifyToken<SessionPayload>(token, membersKey(), now);
  if (!p || p.p !== "member") return null;
  // sessionVersion is hidden from API reads, so read it with showHiddenFields.
  const m = await payload.findByID({ collection: "members", id: p.mid, depth: 0, overrideAccess: true, showHiddenFields: true }).catch(() => null);
  if (!m || m.status === "cancelled" || (m.sessionVersion ?? 0) !== p.v) return null;
  return m;
}

export function unsubscribeToken(memberId: number, now = nowS()) {
  return signToken({ exp: now + UNSUB_DAYS * 86400, p: "unsub", mid: memberId }, membersKey());
}

export function unsubscribeUrl(memberId: number) {
  return `${site()}/api/members/unsubscribe?t=${encodeURIComponent(unsubscribeToken(memberId))}`;
}

/**
 * Double opt-in for the waiting list (security review 2026-11-13): a sign-up
 * is stored with letters OFF; only the owner of the inbox, clicking the link
 * in the confirmation email, switches them on (and the time is kept).
 */
export function confirmToken(memberId: number, now = nowS()) {
  return signToken({ exp: now + CONFIRM_DAYS * 86400, p: "optin", mid: memberId }, membersKey());
}

export function confirmUrl(memberId: number) {
  return `${site()}/api/members/confirm?t=${encodeURIComponent(confirmToken(memberId))}`;
}

export async function confirmOptIn(payload: Payload, token: string | null | undefined) {
  const p = verifyToken<ConfirmPayload>(token, membersKey());
  if (!p || p.p !== "optin") return false;
  const m = await payload.findByID({ collection: "members", id: p.mid, depth: 0, overrideAccess: true }).catch(() => null);
  if (!m || m.status === "cancelled") return false;
  if (!m.emailOptIn) await payload.update({ collection: "members", id: m.id, overrideAccess: true, data: { emailOptIn: true, emailOptInAt: new Date().toISOString() } });
  return true;
}

export async function unsubscribe(payload: Payload, token: string | null | undefined) {
  const p = verifyToken<UnsubPayload>(token, membersKey());
  if (!p || p.p !== "unsub") return false;
  await payload.update({ collection: "members", id: p.mid, overrideAccess: true, data: { emailOptIn: false, emailOptInAt: null } }).catch(() => null);
  return true;
}

/** Sign out on every device. */
export async function revokeSessions(payload: Payload, memberId: number) {
  const m = await payload.findByID({ collection: "members", id: memberId, depth: 0, overrideAccess: true, showHiddenFields: true });
  await payload.update({ collection: "members", id: memberId, overrideAccess: true, data: { sessionVersion: (m.sessionVersion ?? 0) + 1 } });
}

/**
 * GDPR erasure. Orders and invoices are kept (tax law) but unlinked and
 * stripped of contact details and delivery addresses; RSVPs go. Runs from
 * the members beforeDelete hook, so the member's own page and an owner's
 * delete in the admin erase exactly the same (security review 2026-11-09).
 */
export async function scrubMemberData(payload: Payload, memberId: number, req?: PayloadRequest) {
  const m = await payload.findByID({ collection: "members", id: memberId, depth: 0, overrideAccess: true, req }).catch(() => null);
  if (!m) return;
  const orders = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 5000,
    req,
    where: { or: [{ member: { equals: memberId } }, { customerEmail: { equals: m.email } }] },
  });
  const noAddress = { name: null, phone: null, line1: null, line2: null, postalCode: null, city: null, province: null };
  for (const o of orders.docs) {
    await payload.update({
      collection: "orders",
      id: o.id,
      overrideAccess: true,
      req,
      data: { member: null, customerEmail: null, customerPhone: null, customerName: (o.customerName ?? "").split(" ")[0] || null, shipTo: noAddress },
    });
  }
  await payload.delete({ collection: "rsvps", overrideAccess: true, req, where: { member: { equals: memberId } } });
}

/** The member's own "delete my account": the hook does the scrub. */
export async function eraseMember(payload: Payload, memberId: number) {
  await payload.delete({ collection: "members", id: memberId, overrideAccess: true });
}

/** The member's own web orders, newest first. */
export async function memberOrders(payload: Payload, member: { id: number; email: string }) {
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 20,
    sort: "-createdAt",
    where: {
      and: [
        { channel: { equals: "online" } },
        { or: [{ member: { equals: member.id } }, { customerEmail: { equals: member.email } }] },
      ],
    },
  });
  return docs.map((o) => ({
    label: o.label ?? "",
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalCents: o.totalCents,
    createdAt: o.createdAt,
    token: o.publicToken ?? null,
    membership: o.kind === "membership" || o.kind === "subscription",
    kind: o.kind ?? "sale",
  }));
}

/**
 * "Lo de siempre": the member's last online sale that was not cancelled,
 * rebuilt as order lines against today's catalog. Lines whose product or
 * options no longer exist (or are sold out) are dropped; prices always come
 * from the catalog, never from the old order.
 */
export async function usualOrder(payload: Payload, member: { id: number; email: string }, catalog: CatalogItem[]): Promise<LineInput[]> {
  const { docs } = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    sort: "-createdAt",
    where: {
      and: [
        { channel: { equals: "online" } },
        { kind: { not_equals: "membership" } },
        { kind: { not_equals: "subscription" } },
        { status: { not_equals: "cancelled" } },
        { or: [{ member: { equals: member.id } }, { customerEmail: { equals: member.email } }] },
      ],
    },
  });
  return docs[0] ? usualLines(docs[0].lines ?? [], catalog) : [];
}

type StoredLine = { menuItem?: number | { id: number } | null; quantity: number; modifiers?: unknown };

export function usualLines(lines: StoredLine[], catalog: CatalogItem[]): LineInput[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return lines.flatMap((l) => {
    const id = typeof l.menuItem === "object" && l.menuItem ? l.menuItem.id : l.menuItem;
    if (typeof id !== "number" || !byId.has(id)) return [];
    const keys = Array.isArray(l.modifiers)
      ? l.modifiers.flatMap((m) => (m && typeof m === "object" && typeof (m as { key?: unknown }).key === "string" ? [(m as { key: string }).key] : []))
      : [];
    const line = { menuItemId: id, quantity: Math.min(Math.max(1, l.quantity), 20), modifierKeys: keys };
    return priceLine(byId, line).ok ? [line] : [];
  });
}

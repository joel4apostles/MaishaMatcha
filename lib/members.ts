import type { Payload } from "payload";
import { emailFrame, escapeHtml, sendEmail } from "@/lib/email";
import { signToken, verifyToken } from "@/lib/pos/token";
import { appSecret } from "@/lib/secret";

/**
 * Customer accounts, passwordless. A sign-in link is a signed, short-lived
 * token carrying the email; the account is created the first time the link
 * is opened (so typing someone else's address creates nothing). Sessions
 * are signed cookies bound to the member's sessionVersion.
 */
export const LINK_MINUTES = 20;
export const SESSION_DAYS = 60;
const UNSUB_DAYS = 800;

type Loc = "es" | "en";
type LinkPayload = { exp: number; p: "signin"; e: string; n?: string; l: Loc; next?: string };
type SessionPayload = { exp: number; p: "member"; mid: number; v: number };
type UnsubPayload = { exp: number; p: "unsub"; mid: number };

const nowS = () => Math.floor(Date.now() / 1000);
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const normEmail = (e: string) => e.trim().toLowerCase();

/** Only same-site relative paths survive as "come back here" targets. */
export function safeNext(next: string | null | undefined): string | undefined {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return undefined;
  return next.slice(0, 200);
}

export function signInToken(email: string, locale: Loc, name?: string, next?: string, now = nowS()) {
  return signToken({ exp: now + LINK_MINUTES * 60, p: "signin", e: normEmail(email), n: name?.trim().slice(0, 80) || undefined, l: locale, next: safeNext(next) }, appSecret());
}

export function readSignInToken(token: string | null | undefined, now = nowS()) {
  const p = verifyToken<LinkPayload>(token, appSecret(), now);
  return p && p.p === "signin" && typeof p.e === "string" ? p : null;
}

export async function sendSignInLink(email: string, locale: Loc, name?: string, next?: string) {
  const url = `${site()}/api/members/sign-in?t=${encodeURIComponent(signInToken(email, locale, name, next))}`;
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
  return signToken({ exp: now + SESSION_DAYS * 86400, p: "member", mid: member.id, v: member.sessionVersion ?? 0 }, appSecret());
}

export async function memberFromSession(payload: Payload, token: string | null | undefined, now = nowS()) {
  const p = verifyToken<SessionPayload>(token, appSecret(), now);
  if (!p || p.p !== "member") return null;
  // sessionVersion is hidden from API reads, so read it with showHiddenFields.
  const m = await payload.findByID({ collection: "members", id: p.mid, depth: 0, overrideAccess: true, showHiddenFields: true }).catch(() => null);
  if (!m || m.status === "cancelled" || (m.sessionVersion ?? 0) !== p.v) return null;
  return m;
}

export function unsubscribeToken(memberId: number, now = nowS()) {
  return signToken({ exp: now + UNSUB_DAYS * 86400, p: "unsub", mid: memberId }, appSecret());
}

export function unsubscribeUrl(memberId: number) {
  return `${site()}/api/members/unsubscribe?t=${encodeURIComponent(unsubscribeToken(memberId))}`;
}

export async function unsubscribe(payload: Payload, token: string | null | undefined) {
  const p = verifyToken<UnsubPayload>(token, appSecret());
  if (!p || p.p !== "unsub") return false;
  await payload.update({ collection: "members", id: p.mid, overrideAccess: true, data: { emailOptIn: false } }).catch(() => null);
  return true;
}

/** Sign out on every device. */
export async function revokeSessions(payload: Payload, memberId: number) {
  const m = await payload.findByID({ collection: "members", id: memberId, depth: 0, overrideAccess: true, showHiddenFields: true });
  await payload.update({ collection: "members", id: memberId, overrideAccess: true, data: { sessionVersion: (m.sessionVersion ?? 0) + 1 } });
}

/**
 * GDPR erasure from the member's own page. Orders and invoices are kept
 * (tax law) but unlinked and stripped of contact details; RSVPs go.
 */
export async function eraseMember(payload: Payload, memberId: number) {
  const m = await payload.findByID({ collection: "members", id: memberId, depth: 0, overrideAccess: true });
  const orders = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    limit: 5000,
    where: { or: [{ member: { equals: memberId } }, { customerEmail: { equals: m.email } }] },
  });
  for (const o of orders.docs) {
    await payload.update({
      collection: "orders",
      id: o.id,
      overrideAccess: true,
      data: { member: null, customerEmail: null, customerPhone: null, customerName: (o.customerName ?? "").split(" ")[0] || null },
    });
  }
  await payload.delete({ collection: "rsvps", overrideAccess: true, where: { member: { equals: memberId } } });
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
    membership: o.kind === "membership",
  }));
}

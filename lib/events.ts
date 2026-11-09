import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import { query, sql, table } from "@/cms/db";
import { events as fallbackEvents } from "@/content/events";

/**
 * Events from the CMS, with seats. Booking locks the event row so the last
 * seat cannot be sold twice. Members-only events are for founding members
 * and subscribers whose monthly fee is paid up (founder, 2026-11-09).
 */
export const EVENT_KINDS = ["tasting", "cupping", "workshop", "ceremony", "gathering"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** Who may book a members-only event: a founder, or a subscriber in good standing. */
export const mayBookMembersOnly = (m: { tier: string; subscriptionStatus?: string | null }) =>
  m.tier === "founding" || m.subscriptionStatus === "active";

export type PublicEvent = {
  id: number | string;
  title: string;
  when: string;
  description: string;
  membersOnly: boolean;
  kind: EventKind | null;
  bookable: boolean;
  remaining: number | null;
  startsAt: string | null;
};

const rid = (v: unknown) => (typeof v === "object" && v !== null ? (v as { id: number }).id : (v as number));

async function seatsTaken(payload: Payload, eventIds: number[], req?: Parameters<typeof payload.find>[0]["req"]) {
  if (!eventIds.length) return new Map<number, number>();
  const { docs } = await payload.find({
    collection: "rsvps",
    req,
    overrideAccess: true,
    depth: 0,
    limit: 10000,
    where: { and: [{ event: { in: eventIds } }, { status: { equals: "going" } }] },
  });
  const taken = new Map<number, number>();
  for (const r of docs) taken.set(rid(r.event), (taken.get(rid(r.event)) ?? 0) + r.seats);
  return taken;
}

const isBookable = (e: { startsAt?: string | null; capacity?: number | null }, now: Date) =>
  Boolean(e.startsAt && e.capacity && new Date(e.startsAt) > now);

/** CMS events; if the database is unreachable, the static list (not bookable). */
export async function listEvents(payload: Payload | null, locale: "es" | "en", now = new Date()): Promise<PublicEvent[]> {
  if (!payload) return fallback(locale);
  try {
    const { docs } = await payload.find({ collection: "events", overrideAccess: true, depth: 0, limit: 50, locale, sort: "order" });
    if (!docs.length) return fallback(locale);
    const taken = await seatsTaken(payload, docs.map((d) => d.id));
    return docs
      .filter((d) => !d.startsAt || new Date(d.startsAt) > new Date(now.getTime() - 86400000))
      .map((d) => ({
        id: d.id,
        title: d.title,
        when: d.when,
        description: d.description,
        membersOnly: Boolean(d.membersOnly),
        kind: (d.kind as EventKind | null | undefined) ?? null,
        startsAt: d.startsAt ?? null,
        bookable: isBookable(d, now),
        remaining: d.capacity ? Math.max(0, d.capacity - (taken.get(d.id) ?? 0)) : null,
      }));
  } catch {
    return fallback(locale);
  }
}

function fallback(locale: "es" | "en"): PublicEvent[] {
  return fallbackEvents.map((e) => ({
    id: e.id,
    title: e.title[locale],
    when: e.when[locale],
    description: e.description[locale],
    membersOnly: e.membersOnly,
    kind: null,
    bookable: false,
    remaining: null,
    startsAt: null,
  }));
}

export type RsvpResult = { ok: true; seats: number } | { ok: false; error: "not-bookable" | "members-only" | "full" | "invalid" };

export async function rsvp(
  payload: Payload,
  member: { id: number; tier: string; status: string; subscriptionStatus?: string | null },
  eventId: number,
  seats: number,
  now = new Date(),
): Promise<RsvpResult> {
  if (!Number.isInteger(seats) || seats < 0 || seats > 2) return { ok: false, error: "invalid" };
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    await query(payload, sql`select id from ${table(payload, "events")} where id = ${eventId} for update`, req);
    const event = await payload.findByID({ collection: "events", id: eventId, req, depth: 0, overrideAccess: true }).catch(() => null);
    const fail = async (error: Exclude<RsvpResult, { ok: true }>["error"]) => {
      await killTransaction(req);
      return { ok: false as const, error };
    };
    if (!event || !isBookable(event, now)) return fail("not-bookable");
    if (event.membersOnly && !mayBookMembersOnly(member)) return fail("members-only");
    if (member.status !== "active") return fail("invalid");

    const existing = (
      await payload.find({ collection: "rsvps", req, overrideAccess: true, depth: 0, limit: 1, where: { and: [{ event: { equals: eventId } }, { member: { equals: member.id } }] } })
    ).docs[0];
    if (seats > 0) {
      const others = (await seatsTaken(payload, [eventId], req)).get(eventId) ?? 0;
      const mine = existing?.status === "going" ? existing.seats : 0;
      if (others - mine + seats > (event.capacity ?? 0)) return fail("full");
    }
    const data = { seats: Math.max(1, seats), status: seats > 0 ? ("going" as const) : ("cancelled" as const) };
    if (existing) await payload.update({ collection: "rsvps", id: existing.id, req, overrideAccess: true, data });
    else if (seats > 0) await payload.create({ collection: "rsvps", req, overrideAccess: true, data: { ...data, event: eventId, member: member.id } });
    await commitTransaction(req);
    return { ok: true, seats };
  } catch (err) {
    await killTransaction(req);
    throw err;
  }
}

/** Seats this member holds, by event id. */
export async function memberRsvps(payload: Payload, memberId: number) {
  const { docs } = await payload.find({
    collection: "rsvps",
    overrideAccess: true,
    depth: 0,
    limit: 100,
    where: { and: [{ member: { equals: memberId } }, { status: { equals: "going" } }] },
  });
  return new Map(docs.map((r) => [rid(r.event), r.seats]));
}

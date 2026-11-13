import type { Payload } from "payload";

export type WaitlistEntry = { name: string; email: string; locale: "es" | "en" };

/**
 * Keep a waiting-list sign-up in our own database, before any email is sent,
 * so nobody is lost when the email service is missing or down. A new person
 * becomes a member with tier "waitlist" and letters OFF: anyone can type an
 * address, so consent counts only once the inbox owner clicks the confirm
 * link in the confirmation email (double opt-in, lib/members.ts
 * confirmOptIn, security review 2026-11-13). Erasure is the usual member delete.
 *
 * An address that already exists is left exactly as it is: the form proves
 * nothing about who typed it, so it must never switch letters back on for
 * someone who unsubscribed (they do that from their own account page).
 */
export async function joinWaitlist(payload: Payload, entry: WaitlistEntry): Promise<{ status: "created" | "exists"; id: number }> {
  const email = entry.email.trim().toLowerCase();
  const existing = async () =>
    (await payload.find({ collection: "members", overrideAccess: true, depth: 0, limit: 1, where: { email: { equals: email } } })).docs[0];

  const found = await existing();
  if (found) return { status: "exists", id: found.id };
  try {
    const m = await payload.create({
      collection: "members",
      overrideAccess: true,
      data: { name: entry.name, email, tier: "waitlist", status: "active", locale: entry.locale, emailOptIn: false },
    });
    return { status: "created", id: m.id };
  } catch (error) {
    // Two sign-ups for the same address at once: the unique email wins once.
    const raced = await existing();
    if (raced) return { status: "exists", id: raced.id };
    throw error;
  }
}

import type { Payload } from "payload";

export type WaitlistEntry = { name: string; email: string; locale: "es" | "en" };

/**
 * Keep a waiting-list sign-up in our own database, before any email is sent,
 * so nobody is lost when the email service is missing or down. A new person
 * becomes a member with tier "waitlist" and the email consent they just gave
 * (the form's "Acepto recibir noticias" box), so the owner can write to them
 * later through the email letters, which carry one-click unsubscribe;
 * erasure is the usual member delete.
 *
 * An address that already exists is left exactly as it is: the form proves
 * nothing about who typed it, so it must never switch letters back on for
 * someone who unsubscribed (they do that from their own account page).
 */
export async function joinWaitlist(payload: Payload, entry: WaitlistEntry): Promise<"created" | "exists"> {
  const email = entry.email.trim().toLowerCase();
  const exists = async () =>
    (await payload.find({ collection: "members", overrideAccess: true, depth: 0, limit: 1, where: { email: { equals: email } } })).totalDocs > 0;

  if (await exists()) return "exists";
  try {
    await payload.create({
      collection: "members",
      overrideAccess: true,
      data: { name: entry.name, email, tier: "waitlist", status: "active", locale: entry.locale, emailOptIn: true },
    });
    return "created";
  } catch (error) {
    // Two sign-ups for the same address at once: the unique email wins once.
    if (await exists()) return "exists";
    throw error;
  }
}

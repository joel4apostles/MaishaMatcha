"use server";

import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { verifiedBackOffice } from "@/lib/auth/roles";
import { markBoxCollected, markBoxShipped } from "@/lib/premium";

/**
 * The admin's two buttons on "Cajas del mes". Owner or manager, signed in
 * with the authenticator code; the order id is only a pointer, the change
 * itself is a conditional update in lib/premium.ts (exactly once).
 */
async function staffId() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return { payload, id: verifiedBackOffice(user, "owner", "manager") ? (user!.id as number) : null };
}

export async function markShippedAction(orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) return { ok: false as const };
  const { payload, id } = await staffId();
  if (!id) return { ok: false as const };
  return { ok: await markBoxShipped(payload, orderId, id) };
}

export async function markCollectedAction(orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) return { ok: false as const };
  const { payload, id } = await staffId();
  if (!id) return { ok: false as const };
  return { ok: await markBoxCollected(payload, orderId, id) };
}

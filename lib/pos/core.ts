import type { Payload } from "payload";
import { writeAudit } from "@/cms/audit";
import { query, sql, table } from "@/cms/db";
import { isActiveStaff, type Role } from "@/lib/auth/roles";
import { verifyPin } from "./pin";
import { sha256, signToken, verifyToken } from "./token";

/**
 * Counter authentication logic, free of cookies and request objects so it
 * can be tested directly (lib/pos/server.ts adds the cookies).
 */
export const MAX_PIN_FAILURES = 5;
export const LOCK_MINUTES = 15;
export const SESSION_SECONDS = 12 * 60 * 60;

export type PosStaff = { id: number; name: string; role: Role };
export type PosDevice = { id: number; name: string };

export type PinResult =
  | { ok: true; staffId: number; deviceId: number; pinVersion: string }
  | { ok: false; error: "wrong-pin"; left: number }
  | { ok: false; error: "locked"; minutes: number }
  | { ok: false; error: "no-device" | "unknown-staff" | "invalid" };

type SessionPayload = { uid: number; did: number; pv: string; exp: number };

/** Short fingerprint of the stored PIN hash: changing a PIN ends sessions. */
const pinVersion = (pinHash: string) => sha256(pinHash).slice(0, 16);

export async function findDevice(payload: Payload, token: string | undefined): Promise<PosDevice | null> {
  if (!token) return null;
  const { docs } = await payload.find({
    collection: "pos-devices",
    overrideAccess: true,
    limit: 1,
    depth: 0,
    where: { and: [{ tokenHash: { equals: sha256(token) } }, { active: { equals: true } }] },
  });
  return docs[0] ? { id: docs[0].id, name: docs[0].name } : null;
}

/** Active staff who have a PIN: the names shown on a registered tablet. */
export async function listPinStaff(payload: Payload): Promise<PosStaff[]> {
  const { docs } = await payload.find({
    collection: "users",
    overrideAccess: true,
    showHiddenFields: true,
    limit: 100,
    depth: 0,
    sort: "name",
    where: { and: [{ active: { not_equals: false } }, { pinHash: { exists: true } }] },
  });
  return docs.filter(isActiveStaff).map((u) => ({ id: u.id, name: u.name, role: u.role }));
}

/**
 * One PIN attempt. The attempt is RESERVED with a single atomic UPDATE
 * before the PIN is checked: parallel guesses each consume one of the five
 * allowed attempts, and once five are used (or the user is locked) no
 * further request even reaches scrypt.
 */
export async function attemptPin(
  payload: Payload,
  input: { deviceId: number; userId: number; pin: string; now?: Date; purpose?: "login" | "approval" },
): Promise<PinResult> {
  const now = input.now ?? new Date();
  const approval = input.purpose === "approval";
  const user = await payload
    .findByID({ collection: "users", id: input.userId, overrideAccess: true, showHiddenFields: true, depth: 0 })
    .catch(() => null);
  if (!user || !isActiveStaff(user) || !user.pinHash) return { ok: false, error: "unknown-staff" };

  const users = table(payload, "users");
  const reserved = await query(
    payload,
    sql`update ${users}
        set pin_failed_count = coalesce(pin_failed_count, 0) + 1
        where id = ${input.userId}
          and coalesce(pin_failed_count, 0) < ${MAX_PIN_FAILURES}
          and (pin_locked_until is null or pin_locked_until <= ${now.toISOString()})
        returning pin_failed_count`,
  );
  if (reserved.length === 0) {
    const fresh = await payload.findByID({
      collection: "users",
      id: input.userId,
      overrideAccess: true,
      showHiddenFields: true,
      depth: 0,
    });
    const until = fresh.pinLockedUntil ? new Date(fresh.pinLockedUntil).getTime() : now.getTime();
    return { ok: false, error: "locked", minutes: Math.max(1, Math.ceil((until - now.getTime()) / 60000)) };
  }
  const attempts = Number(reserved[0].pin_failed_count);

  if (!(await verifyPin(input.pin, user.pinHash))) {
    const lock = attempts >= MAX_PIN_FAILURES;
    if (lock) {
      await query(
        payload,
        sql`update ${users}
            set pin_locked_until = ${new Date(now.getTime() + LOCK_MINUTES * 60000).toISOString()},
                pin_failed_count = 0
            where id = ${input.userId}`,
      );
    }
    await writeAudit({ payload }, {
      action: lock ? "pos.login.locked" : approval ? "pos.approval.failed" : "pos.login.failed",
      entity: "users",
      entityId: user.id,
      actorId: user.id,
      deviceId: input.deviceId,
    });
    return lock
      ? { ok: false, error: "locked", minutes: LOCK_MINUTES }
      : { ok: false, error: "wrong-pin", left: MAX_PIN_FAILURES - attempts };
  }

  await query(
    payload,
    sql`update ${users} set pin_failed_count = 0, pin_locked_until = null where id = ${input.userId}`,
  );
  if (!approval) {
    await payload.update({
      collection: "pos-devices",
      id: input.deviceId,
      overrideAccess: true,
      data: { lastSeenAt: now.toISOString() },
    });
  }
  await writeAudit({ payload }, {
    action: approval ? "pos.approval" : "pos.login",
    entity: "users",
    entityId: user.id,
    actorId: user.id,
    deviceId: input.deviceId,
  });
  return { ok: true, staffId: user.id, deviceId: input.deviceId, pinVersion: pinVersion(user.pinHash) };
}

export function issueSession(
  key: string,
  s: { staffId: number; deviceId: number; pinVersion: string },
  now = new Date(),
): string {
  const exp = Math.floor(now.getTime() / 1000) + SESSION_SECONDS;
  return signToken({ uid: s.staffId, did: s.deviceId, pv: s.pinVersion, exp }, key);
}

/**
 * A session is valid only while: the signature and expiry hold, the device
 * cookie still names the same active device, the person is still active,
 * and their PIN has not changed since they signed in.
 */
export async function resolveSession(
  payload: Payload,
  key: string,
  sessionToken: string | undefined,
  device: PosDevice | null,
  now = new Date(),
): Promise<{ staff: PosStaff; device: PosDevice } | null> {
  const session = verifyToken<SessionPayload>(sessionToken, key, Math.floor(now.getTime() / 1000));
  if (!session || !device || device.id !== session.did) return null;
  const user = await payload
    .findByID({ collection: "users", id: session.uid, overrideAccess: true, showHiddenFields: true, depth: 0 })
    .catch(() => null);
  if (!user || !isActiveStaff(user) || !user.pinHash) return null;
  if (pinVersion(user.pinHash) !== session.pv) return null;
  return { staff: { id: user.id, name: user.name, role: user.role }, device };
}

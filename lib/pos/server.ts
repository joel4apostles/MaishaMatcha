import { cookies, headers } from "next/headers";
import { getPayload, type Payload } from "payload";
import config from "@payload-config";
import { writeAudit } from "@/cms/audit";
import { hasRole, isActiveStaff, type Role } from "@/lib/auth/roles";
import { appSecret } from "@/lib/secret";
import { verifyPin } from "./pin";
import { deriveKey, newDeviceToken, sha256, signToken, verifyToken } from "./token";

/**
 * Counter authentication, server only.
 *
 * 1. The owner signs in to /admin on the tablet once and registers it. The
 *    tablet gets a long random device cookie; only its hash is stored.
 * 2. Staff then sign in with name + PIN, which is only accepted on an
 *    active registered device. Five wrong PINs lock that person for 15
 *    minutes. Every login, failure and lock is audited.
 * 3. The POS session is a signed cookie bound to the person AND the device,
 *    re-checked on every request (deactivating either revokes it at once).
 */
const DEVICE_COOKIE = "maisha_device";
const SESSION_COOKIE = "maisha_pos";
const SESSION_SECONDS = 12 * 60 * 60;
const DEVICE_SECONDS = 400 * 24 * 60 * 60;
const MAX_PIN_FAILURES = 5;
const LOCK_MINUTES = 15;

export type PosStaff = { id: number; name: string; role: Role };
export type PosDevice = { id: number; name: string };
type SessionPayload = { uid: number; did: number; exp: number };

const sessionKey = () => deriveKey(appSecret(), "pos-session");
const secureCookies = () => process.env.NODE_ENV === "production";

export const payloadClient = (): Promise<Payload> => getPayload({ config });

/** The owner signed in to /admin in this browser, or null. */
export async function backOfficeOwner() {
  const payload = await payloadClient();
  const { user } = await payload.auth({ headers: await headers() });
  return user && hasRole(user, "owner") ? user : null;
}

export async function currentDevice(): Promise<PosDevice | null> {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token) return null;
  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "pos-devices",
    overrideAccess: true,
    limit: 1,
    where: { and: [{ tokenHash: { equals: sha256(token) } }, { active: { equals: true } }] },
  });
  const d = docs[0];
  return d ? { id: d.id as number, name: d.name } : null;
}

export async function registerDevice(name: string): Promise<PosDevice> {
  const owner = await backOfficeOwner();
  if (!owner) throw new Error("not-owner");
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error("name-required");

  const payload = await payloadClient();
  const token = newDeviceToken();
  const device = await payload.create({
    collection: "pos-devices",
    overrideAccess: true,
    data: { name: clean, tokenHash: sha256(token), registeredBy: owner.id, active: true },
  });
  (await cookies()).set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: DEVICE_SECONDS,
  });
  await writeAudit({ payload }, {
    action: "pos.device.register",
    entity: "pos-devices",
    entityId: device.id,
    actorId: owner.id,
    deviceId: device.id,
  });
  return { id: device.id as number, name: device.name };
}

/** Active staff with a PIN, for the name picker on a registered device. */
export async function pinStaff(): Promise<PosStaff[]> {
  if (!(await currentDevice())) return [];
  const payload = await payloadClient();
  const { docs } = await payload.find({
    collection: "users",
    overrideAccess: true,
    showHiddenFields: true,
    limit: 50,
    sort: "name",
    where: { active: { not_equals: false } },
  });
  return docs
    .filter((u) => (u as { pinHash?: string }).pinHash && isActiveStaff(u))
    .map((u) => ({ id: u.id as number, name: u.name, role: u.role as Role }));
}

export type PinResult =
  | { ok: true }
  | { ok: false; error: "no-device" | "wrong-pin" | "locked" | "unknown-staff"; minutes?: number; left?: number };

export async function loginWithPin(userId: number, pin: string): Promise<PinResult> {
  const device = await currentDevice();
  if (!device) return { ok: false, error: "no-device" };
  const payload = await payloadClient();

  const user = (await payload
    .findByID({ collection: "users", id: userId, overrideAccess: true, showHiddenFields: true })
    .catch(() => null)) as
    | (Record<string, unknown> & { id: number; role?: string; active?: boolean; pinHash?: string; pinFailedCount?: number; pinLockedUntil?: string })
    | null;
  if (!user || !isActiveStaff(user) || !user.pinHash) return { ok: false, error: "unknown-staff" };

  const lockedUntil = user.pinLockedUntil ? new Date(user.pinLockedUntil).getTime() : 0;
  if (lockedUntil > Date.now()) {
    return { ok: false, error: "locked", minutes: Math.ceil((lockedUntil - Date.now()) / 60000) };
  }

  if (!(await verifyPin(pin, user.pinHash))) {
    const failures = (user.pinFailedCount ?? 0) + 1;
    const lock = failures >= MAX_PIN_FAILURES;
    await payload.update({
      collection: "users",
      id: user.id,
      overrideAccess: true,
      data: {
        pinFailedCount: lock ? 0 : failures,
        pinLockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : user.pinLockedUntil ?? null,
      } as never,
    });
    await writeAudit({ payload }, {
      action: lock ? "pos.login.locked" : "pos.login.failed",
      entity: "users",
      entityId: user.id,
      actorId: user.id,
      deviceId: device.id,
    });
    return lock
      ? { ok: false, error: "locked", minutes: LOCK_MINUTES }
      : { ok: false, error: "wrong-pin", left: MAX_PIN_FAILURES - failures };
  }

  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: true,
    data: { pinFailedCount: 0, pinLockedUntil: null } as never,
  });
  await payload.update({
    collection: "pos-devices",
    id: device.id,
    overrideAccess: true,
    data: { lastSeenAt: new Date().toISOString() },
  });
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  (await cookies()).set(SESSION_COOKIE, signToken({ uid: user.id, did: device.id, exp }, sessionKey()), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  await writeAudit({ payload }, {
    action: "pos.login",
    entity: "users",
    entityId: user.id,
    actorId: user.id,
    deviceId: device.id,
  });
  return { ok: true };
}

/** The signed-in counter user on this device, re-validated every request. */
export async function currentPosSession(): Promise<{ staff: PosStaff; device: PosDevice } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifyToken<SessionPayload>(token, sessionKey());
  if (!session) return null;
  const device = await currentDevice();
  if (!device || device.id !== session.did) return null;
  const payload = await payloadClient();
  const user = await payload
    .findByID({ collection: "users", id: session.uid, overrideAccess: true })
    .catch(() => null);
  if (!user || !isActiveStaff(user)) return null;
  return { staff: { id: user.id as number, name: user.name, role: user.role as Role }, device };
}

export async function logoutPos(): Promise<void> {
  const session = await currentPosSession();
  (await cookies()).delete(SESSION_COOKIE);
  if (session) {
    await writeAudit({ payload: await payloadClient() }, {
      action: "pos.logout",
      entity: "users",
      entityId: session.staff.id,
      actorId: session.staff.id,
      deviceId: session.device.id,
    });
  }
}

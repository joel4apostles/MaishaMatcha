import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getPayload, type Payload } from "payload";
import config from "@payload-config";
import { writeAudit } from "@/cms/audit";
import { hasRole } from "@/lib/auth/roles";
import { appSecret } from "@/lib/secret";
import {
  SESSION_SECONDS,
  attemptPin,
  findDevice,
  issueSession,
  listPinStaff,
  resolveSession,
  type PinResult,
  type PosDevice,
  type PosStaff,
} from "./core";
import { deriveKey, newDeviceToken, sha256 } from "./token";

/**
 * Counter authentication: the cookie layer over lib/pos/core.ts.
 *
 * 1. The owner signs in to /admin on the tablet once and registers it. The
 *    tablet gets a long random device cookie; only its hash is stored.
 * 2. Staff sign in with name + PIN, accepted only on an active registered
 *    device; five wrong PINs lock that person for 15 minutes.
 * 3. The POS session is a signed cookie bound to person, device and PIN
 *    version, re-checked on every request.
 */
const DEVICE_COOKIE = "maisha_device";
const SESSION_COOKIE = "maisha_pos";
const DEVICE_SECONDS = 400 * 24 * 60 * 60;

export type { PinResult, PosDevice, PosStaff };

const sessionKey = () => deriveKey(appSecret(), "pos-session");
const cookieBase = () =>
  ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" }) as const;

export const payloadClient = (): Promise<Payload> => getPayload({ config });

/** The owner signed in to /admin in this browser, or null. */
export async function backOfficeOwner() {
  const payload = await payloadClient();
  const { user } = await payload.auth({ headers: await headers() });
  return user && user.collection === "users" && hasRole(user, "owner") ? user : null;
}

/** Cached per request: pages call it directly and through the session. */
export const currentDevice = cache(async (): Promise<PosDevice | null> => {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  return findDevice(await payloadClient(), token);
});

export type RegisterResult = { ok: true; device: PosDevice } | { ok: false; reason: "not-owner" | "name" };

export async function registerDevice(name: string): Promise<RegisterResult> {
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, reason: "name" };
  const owner = await backOfficeOwner();
  if (!owner) return { ok: false, reason: "not-owner" };

  const payload = await payloadClient();
  const token = newDeviceToken();
  const device = await payload.create({
    collection: "pos-devices",
    overrideAccess: true,
    data: { name: clean, tokenHash: sha256(token), registeredBy: owner.id, active: true },
  });
  (await cookies()).set(DEVICE_COOKIE, token, { ...cookieBase(), maxAge: DEVICE_SECONDS });
  await writeAudit({ payload }, {
    action: "pos.device.register",
    entity: "pos-devices",
    entityId: device.id,
    actorId: owner.id,
    deviceId: device.id,
  });
  return { ok: true, device: { id: device.id, name: device.name } };
}

export async function pinStaff(): Promise<PosStaff[]> {
  if (!(await currentDevice())) return [];
  return listPinStaff(await payloadClient());
}

export async function loginWithPin(userId: number, pin: string): Promise<PinResult> {
  const device = await currentDevice();
  if (!device) return { ok: false, error: "no-device" };
  const result = await attemptPin(await payloadClient(), { deviceId: device.id, userId, pin });
  if (result.ok) {
    (await cookies()).set(SESSION_COOKIE, issueSession(sessionKey(), result), {
      ...cookieBase(),
      maxAge: SESSION_SECONDS,
    });
  }
  return result;
}

export const currentPosSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolveSession(await payloadClient(), sessionKey(), token, await currentDevice());
});

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

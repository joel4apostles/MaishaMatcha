import { beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";
import {
  LOCK_MINUTES,
  MAX_PIN_FAILURES,
  attemptPin,
  findDevice,
  issueSession,
  listPinStaff,
  resolveSession,
  type PosDevice,
} from "@/lib/pos/core";
import { newDeviceToken, sha256 } from "@/lib/pos/token";
import { boot, staff, type Staff } from "./harness";

/**
 * Counter sign-in, end to end against Postgres: device gating, PIN
 * lockout (including parallel guesses), lock expiry, audit trail and
 * session revocation.
 */
const KEY = "test-session-key";
let payload: Payload;
let device: PosDevice;
let deviceToken: string;
let ana: Staff, bruno: Staff;

async function auditCount(action: string, userId: number) {
  const res = await payload.find({
    collection: "audit-log",
    where: { and: [{ action: { equals: action } }, { entityId: { equals: String(userId) } }] },
    limit: 0,
  });
  return res.totalDocs;
}

beforeAll(async () => {
  payload = await boot();
  await staff(payload, "owner@test.local", "owner", "Owner");
  ana = await staff(payload, "ana@test.local", "barista", "Ana", "4819");
  bruno = await staff(payload, "bruno@test.local", "barista", "Bruno", "5927");
  await staff(payload, "nopin@test.local", "barista", "Sin PIN");
  deviceToken = newDeviceToken();
  const d = await payload.create({
    collection: "pos-devices",
    overrideAccess: true,
    data: { name: "Barra test", tokenHash: sha256(deviceToken), active: true },
  });
  device = { id: d.id, name: d.name };
});

describe("devices and staff picker", () => {
  it("recognises a registered device only by its token", async () => {
    expect(await findDevice(payload, deviceToken)).toEqual(device);
    expect(await findDevice(payload, newDeviceToken())).toBeNull();
    expect(await findDevice(payload, undefined)).toBeNull();
  });

  it("lists active staff with a PIN, nobody else", async () => {
    const names = (await listPinStaff(payload)).map((s) => s.name);
    expect(names).toContain("Ana");
    expect(names).not.toContain("Sin PIN");
  });
});

describe("PIN attempts", () => {
  it("signs in with the right PIN and audits it with the device", async () => {
    const r = await attemptPin(payload, { deviceId: device.id, userId: ana.id, pin: "4819" });
    expect(r.ok).toBe(true);
    const log = await payload.find({
      collection: "audit-log",
      where: { and: [{ action: { equals: "pos.login" } }, { entityId: { equals: String(ana.id) } }] },
      depth: 0,
    });
    expect(log.docs[0]?.device).toBe(device.id);
  });

  it("counts down, locks after five, refuses even the right PIN, and unlocks later", async () => {
    const now = new Date();
    for (let i = 1; i < MAX_PIN_FAILURES; i++) {
      const r = await attemptPin(payload, { deviceId: device.id, userId: ana.id, pin: "1111", now });
      expect(r).toEqual({ ok: false, error: "wrong-pin", left: MAX_PIN_FAILURES - i });
    }
    const fifth = await attemptPin(payload, { deviceId: device.id, userId: ana.id, pin: "1111", now });
    expect(fifth).toEqual({ ok: false, error: "locked", minutes: LOCK_MINUTES });
    const right = await attemptPin(payload, { deviceId: device.id, userId: ana.id, pin: "4819", now });
    expect(right.ok).toBe(false);
    expect(await auditCount("pos.login.locked", ana.id)).toBe(1);

    const later = new Date(now.getTime() + (LOCK_MINUTES + 1) * 60000);
    const after = await attemptPin(payload, { deviceId: device.id, userId: ana.id, pin: "4819", now: later });
    expect(after.ok).toBe(true);
  });

  it("lets no more than five parallel guesses reach the PIN check", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        attemptPin(payload, { deviceId: device.id, userId: bruno.id, pin: "2580" }),
      ),
    );
    const checked = (await auditCount("pos.login.failed", bruno.id)) + (await auditCount("pos.login.locked", bruno.id));
    expect(checked).toBeLessThanOrEqual(MAX_PIN_FAILURES);
    expect(results.filter((r) => !r.ok && r.error === "wrong-pin").length).toBeLessThan(MAX_PIN_FAILURES);
    const right = await attemptPin(payload, { deviceId: device.id, userId: bruno.id, pin: "5927" });
    expect(right).toMatchObject({ ok: false, error: "locked" });
  });
});

describe("sessions", () => {
  async function signIn(pin = "4819") {
    const r = await attemptPin(payload, { deviceId: device.id, userId: ana.id, pin });
    if (!r.ok) throw new Error("sign-in failed: " + JSON.stringify(r));
    return issueSession(KEY, r);
  }

  it("resolves a fresh session to the person and device", async () => {
    const token = await signIn();
    const s = await resolveSession(payload, KEY, token, device);
    expect(s?.staff.name).toBe("Ana");
  });

  it("is bound to its device", async () => {
    const token = await signIn();
    expect(await resolveSession(payload, KEY, token, { id: device.id + 999, name: "otra" })).toBeNull();
    expect(await resolveSession(payload, KEY, token, null)).toBeNull();
  });

  it("ends when the PIN changes", async () => {
    const token = await signIn();
    await payload.update({ collection: "users", id: ana.id, overrideAccess: true, data: { pin: "7316" } as never });
    expect(await resolveSession(payload, KEY, token, device)).toBeNull();
    await payload.update({ collection: "users", id: ana.id, overrideAccess: true, data: { pin: "4819" } as never });
  });

  it("ends when the person is deactivated", async () => {
    const token = await signIn();
    await payload.update({ collection: "users", id: ana.id, overrideAccess: true, data: { active: false } });
    expect(await resolveSession(payload, KEY, token, device)).toBeNull();
    await payload.update({ collection: "users", id: ana.id, overrideAccess: true, data: { active: true } });
  });

  it("ends when the device is deactivated", async () => {
    const token = await signIn();
    await payload.update({ collection: "pos-devices", id: device.id, overrideAccess: true, data: { active: false } });
    expect(await findDevice(payload, deviceToken)).toBeNull();
    expect(await resolveSession(payload, KEY, token, await findDevice(payload, deviceToken))).toBeNull();
    await payload.update({ collection: "pos-devices", id: device.id, overrideAccess: true, data: { active: true } });
  });

  it("expires after twelve hours", async () => {
    const token = await signIn();
    const later = new Date(Date.now() + 13 * 60 * 60 * 1000);
    expect(await resolveSession(payload, KEY, token, device, later)).toBeNull();
  });
});

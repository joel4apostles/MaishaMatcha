import { describe, expect, it } from "vitest";
import { hashPin, isTrivialPin, pinProblem, verifyPin } from "@/lib/pos/pin";
import { deriveKey, signToken, verifyToken } from "@/lib/pos/token";
import { canUseBackOffice, hasRole, isActiveStaff, verifiedBackOffice } from "@/lib/auth/roles";

describe("PINs", () => {
  it("hashes and verifies a valid PIN", async () => {
    const stored = await hashPin("4819");
    expect(stored).toMatch(/^scrypt\$/);
    expect(stored).not.toContain("4819");
    expect(await verifyPin("4819", stored)).toBe(true);
    expect(await verifyPin("4818", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPin("4819")).not.toEqual(await hashPin("4819"));
  });

  it("refuses malformed and trivial PINs", async () => {
    expect(pinProblem("12")).not.toBeNull();
    expect(pinProblem("1234567")).not.toBeNull();
    expect(pinProblem("12a4")).not.toBeNull();
    for (const pin of ["0000", "1234", "4321", "987654", "111111"]) {
      expect(isTrivialPin(pin)).toBe(true);
    }
    expect(isTrivialPin("4819")).toBe(false);
    await expect(hashPin("1234")).rejects.toThrow();
  });

  it("never verifies against a missing or corrupt hash", async () => {
    expect(await verifyPin("4819", null)).toBe(false);
    expect(await verifyPin("4819", "plain$text")).toBe(false);
    expect(await verifyPin("48 19", await hashPin("4819"))).toBe(false);
  });
});

describe("signed tokens", () => {
  const secret = deriveKey("test-secret-test-secret-test-secret", "pos");
  const now = 1_800_000_000;

  it("round-trips a payload before expiry", () => {
    const token = signToken({ uid: 7, did: 3, exp: now + 60 }, secret);
    expect(verifyToken(token, secret, now)).toMatchObject({ uid: 7, did: 3 });
  });

  it("rejects expired, tampered, or foreign tokens", () => {
    const token = signToken({ uid: 7, exp: now + 60 }, secret);
    expect(verifyToken(token, secret, now + 61)).toBeNull();

    const [body, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: 1, exp: now + 60 })).toString("base64url");
    expect(verifyToken(`${forged}.${mac}`, secret, now)).toBeNull();
    expect(verifyToken(`${body}.${mac}x`, secret, now)).toBeNull();
    expect(verifyToken(token, deriveKey("other-secret-other-secret-other", "pos"), now)).toBeNull();
    expect(verifyToken(`${token}.extra`, secret, now)).toBeNull();
    expect(verifyToken(undefined, secret, now)).toBeNull();
  });

  it("derives different keys per purpose", () => {
    expect(deriveKey("s", "pos")).not.toEqual(deriveKey("s", "device"));
  });
});

describe("roles", () => {
  const owner = { role: "owner", active: true, collection: "users" };
  const manager = { role: "manager", active: true };
  const barista = { role: "barista", active: true };

  it("grants back office to owner and manager only", () => {
    expect(canUseBackOffice(owner)).toBe(true);
    expect(canUseBackOffice(manager)).toBe(true);
    expect(canUseBackOffice(barista)).toBe(false);
    expect(canUseBackOffice(null)).toBe(false);
  });

  it("treats deactivated or unknown accounts as no one", () => {
    expect(isActiveStaff({ ...owner, active: false })).toBe(false);
    expect(hasRole({ role: "admin", active: true }, "owner")).toBe(false);
    expect(hasRole({ ...owner, collection: "customers" }, "owner")).toBe(false);
  });
});

describe("verifiedBackOffice", () => {
  const owner = { role: "owner", collection: "users" };
  it("needs the role AND the authenticator code", () => {
    expect(verifiedBackOffice({ ...owner, _strategy: "totp" } as never)).toBe(true);
    expect(verifiedBackOffice({ ...owner, _strategy: "local-jwt" } as never)).toBe(false);
    expect(verifiedBackOffice(owner)).toBe(false);
    expect(verifiedBackOffice({ role: "barista", collection: "users", _strategy: "totp" } as never)).toBe(false);
    expect(verifiedBackOffice({ role: "manager", collection: "users", _strategy: "totp" } as never, "owner")).toBe(false);
  });
});

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

/**
 * Staff PINs: 4 to 6 digits, stored only as a salted scrypt hash. A PIN is a
 * small secret, so it is only accepted on a registered counter device and
 * attempts lock out (see lib/pos/server.ts). Trivial PINs are refused.
 */
export const PIN_PATTERN = /^\d{4,6}$/;

const KEY_LENGTH = 32;

function scrypt(pin: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(pin, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** All one digit (0000) or a straight run up or down (1234, 987654). */
export function isTrivialPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

export function pinProblem(pin: string): string | null {
  if (!PIN_PATTERN.test(pin)) return "El PIN debe tener de 4 a 6 cifras.";
  if (isTrivialPin(pin)) return "Ese PIN es demasiado fácil de adivinar.";
  return null;
}

export async function hashPin(pin: string): Promise<string> {
  const problem = pinProblem(pin);
  if (problem) throw new Error(problem);
  const salt = randomBytes(16);
  const key = await scrypt(pin, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPin(
  pin: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored || !PIN_PATTERN.test(pin)) return false;
  const [alg, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scrypt(pin, Buffer.from(salt, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Compact signed tokens for the POS cookies (HMAC-SHA256, base64url).
 * Format: base64url(json).base64url(mac). Expiry is inside the payload.
 */
export type SignedPayload = { exp: number } & Record<string, unknown>;

const b64 = (buf: Buffer) => buf.toString("base64url");

export function signToken(payload: SignedPayload, secret: string): string {
  const body = b64(Buffer.from(JSON.stringify(payload)));
  const mac = b64(createHmac("sha256", secret).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyToken<T extends SignedPayload>(
  token: string | null | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): T | null {
  if (!token) return null;
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Random device credential; only its SHA-256 is stored. */
export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** A purpose-bound key derived from the app secret. */
export function deriveKey(secret: string, purpose: string): string {
  return createHmac("sha256", secret).update(`maisha:${purpose}`).digest("hex");
}

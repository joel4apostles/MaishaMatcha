import { randomBytes } from "node:crypto";

/**
 * The app secret that signs admin sessions (Payload) and POS cookies.
 *
 * Local development may use a fixed dev string. On Vercel a missing
 * PAYLOAD_SECRET must never fall back to a known value (sessions would be
 * forgeable), and must not crash the deploy either: we use a random
 * per-instance secret and warn loudly. Sessions then only survive within one
 * instance, which makes the misconfiguration obvious without exposing it.
 */
let ephemeral: string | undefined;

export function appSecret(): string {
  const fromEnv = process.env.PAYLOAD_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  // Anything that runs as production (Vercel, next start, Docker) or tests
  // never uses the public dev string, nor a short secret.
  const strict =
    Boolean(process.env.VERCEL) ||
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "test";
  if (!strict) return fromEnv || "maisha-local-dev-secret-not-for-production";

  if (!ephemeral) {
    ephemeral = randomBytes(48).toString("base64url");
    if (process.env.NODE_ENV !== "test") {
      console.error(
        "[maisha] PAYLOAD_SECRET is missing or shorter than 32 characters. " +
          "Using a random per-instance secret: logins will not persist. " +
          "Set PAYLOAD_SECRET (32+ characters) in the environment.",
      );
    }
  }
  return ephemeral;
}

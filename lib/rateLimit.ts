/**
 * Naive in-memory rate limit: N requests per window per key (IP).
 * Process-local only — resets on redeploy and is per-instance. Adequate for a
 * low-volume waitlist; replace with a shared store if traffic grows.
 */
const hits = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const LIMIT = 5;

export function rateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

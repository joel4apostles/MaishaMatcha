import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe over plain HTTPS (no SDK): hosted Checkout for web orders, and
 * webhook signature verification. Card data never touches our servers.
 * Enabled only when STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set.
 */
export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

function form(data: Record<string, string | number>) {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export async function createCheckoutSession(input: {
  orderId: number;
  label: string;
  lines: { name: string; quantity: number; unitCents: number }[];
  email?: string | null;
  successUrl: string;
  cancelUrl: string;
  locale: "es" | "en";
  /** What the webhook should do on payment: a web order or a founding membership. */
  kind?: "order" | "founding";
}): Promise<{ id: string; url: string }> {
  const data: Record<string, string | number> = {
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    locale: input.locale,
    "metadata[orderId]": input.orderId,
    "payment_intent_data[metadata][orderId]": input.orderId,
    client_reference_id: String(input.orderId),
    "metadata[kind]": input.kind ?? "order",
  };
  if (input.email) data.customer_email = input.email;
  input.lines.forEach((l, i) => {
    data[`line_items[${i}][quantity]`] = l.quantity;
    data[`line_items[${i}][price_data][currency]`] = "eur";
    data[`line_items[${i}][price_data][unit_amount]`] = l.unitCents;
    data[`line_items[${i}][price_data][product_data][name]`] = l.name;
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `order-${input.orderId}`,
    },
    body: form(data),
  });
  if (!res.ok) throw new Error(`stripe ${res.status}`);
  const json = (await res.json()) as { id: string; url: string };
  return { id: json.id, url: json.url };
}

/**
 * Verify a Stripe-Signature header (t=...,v1=...) against the raw body.
 * Rejects stale timestamps (default 5 minutes) to stop replays.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSeconds = 300, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = Number(parts.t);
  const sigs = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!Number.isFinite(t) || sigs.length === 0) return false;
  if (Math.abs(now / 1000 - t) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  return sigs.some((s) => {
    const given = Buffer.from(s, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

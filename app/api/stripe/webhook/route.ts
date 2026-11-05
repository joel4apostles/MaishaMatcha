import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { markOnlinePaid } from "@/lib/online";
import { verifyStripeSignature } from "@/lib/stripe";

/**
 * Stripe webhook: the ONLY place a web order becomes paid. Verifies the
 * signature on the raw body (and the timestamp, against replays) before
 * reading anything. Idempotent: Stripe retries are harmless.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    type: string;
    data: { object: { metadata?: { orderId?: string }; payment_status?: string; payment_intent?: string; id: string } };
  };
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const orderId = Number(session.metadata?.orderId);
    if (session.payment_status === "paid" && Number.isInteger(orderId)) {
      const payload = await getPayload({ config });
      await markOnlinePaid(payload, orderId, session.payment_intent ?? session.id);
    }
  }
  return NextResponse.json({ received: true });
}

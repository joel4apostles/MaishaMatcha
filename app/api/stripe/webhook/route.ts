import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { cancelUnpaidOnline, markOnlinePaid } from "@/lib/online";
import { verifyStripeSignature } from "@/lib/stripe";
import { completeFounding } from "@/lib/founding";
import { onPremiumCheckout, onPremiumInvoicePaid, onPremiumSubscription } from "@/lib/premium";

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
  // Shapes vary across Stripe API versions: read defensively.
  const event = JSON.parse(raw) as { type: string; data: { object: Record<string, unknown> & { id: string } } };
  const obj = event.data.object as never as {
    id: string;
    mode?: string;
    metadata?: { orderId?: string; kind?: string; memberId?: string };
    payment_status?: string;
    payment_intent?: string;
    amount_total?: number;
    customer?: string | null;
    subscription?: string | null;
  };
  const payload = await getPayload({ config });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (obj.metadata?.kind === "premium") {
        await onPremiumCheckout(payload, obj);
        break;
      }
      const orderId = Number(obj.metadata?.orderId);
      if (obj.payment_status === "paid" && Number.isInteger(orderId)) {
        if (obj.metadata?.kind === "founding") await completeFounding(payload, orderId, obj.payment_intent ?? obj.id, obj.amount_total);
        else await markOnlinePaid(payload, orderId, obj.payment_intent ?? obj.id, obj.amount_total);
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const orderId = Number(obj.metadata?.orderId);
      if (Number.isInteger(orderId)) await cancelUnpaidOnline(payload, orderId);
      break;
    }
    case "invoice.paid":
      await onPremiumInvoicePaid(payload, event.data.object as never);
      break;
    case "customer.subscription.updated":
      await onPremiumSubscription(payload, event.data.object as never);
      break;
    case "customer.subscription.deleted":
      await onPremiumSubscription(payload, event.data.object as never, true);
      break;
  }
  return NextResponse.json({ received: true });
}

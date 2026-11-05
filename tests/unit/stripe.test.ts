import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "@/lib/stripe";

const secret = "whsec_test";
const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const sign = (t: number, b = body, s = secret) => createHmac("sha256", s).update(`${t}.${b}`).digest("hex");

describe("Stripe webhook signatures", () => {
  const now = 1_800_000_000_000;
  const t = Math.floor(now / 1000);

  it("accepts a genuine signature", () => {
    expect(verifyStripeSignature(body, `t=${t},v1=${sign(t)}`, secret, 300, now)).toBe(true);
  });

  it("rejects tampering, wrong secrets, replays and junk", () => {
    expect(verifyStripeSignature(body + " ", `t=${t},v1=${sign(t)}`, secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${t},v1=${sign(t, body, "other")}`, secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${t - 1000},v1=${sign(t - 1000)}`, secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(body, null, secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(body, "garbage", secret, 300, now)).toBe(false);
  });
});

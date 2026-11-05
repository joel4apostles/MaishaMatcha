import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { orderByToken } from "@/lib/online";
import { rateLimit } from "@/lib/rateLimit";

/** Public, token-gated order status for the customer's page (polling). */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const ip = (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!rateLimit(`status:${ip}`, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const { token } = await params;
  const order = await orderByToken(await getPayload({ config }), token);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}

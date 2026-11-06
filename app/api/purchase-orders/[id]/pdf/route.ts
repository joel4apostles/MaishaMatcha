import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { hasRole } from "@/lib/auth/roles";
import { purchaseOrderPdfFor } from "@/lib/inventory";

/** Staff (owner or manager, signed in to /admin) download a purchase order as PDF. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!hasRole(user, "owner", "manager")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const pdf = await purchaseOrderPdfFor(payload, id).catch(() => null);
  if (!pdf) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename.replace(/[^a-z0-9.-]/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

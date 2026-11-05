import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { hasRole } from "@/lib/auth/roles";
import { invoicesCsv, ivaCsv, ivaSummary } from "@/lib/reports";

/**
 * Accountant exports (owner and manager only, admin session):
 *   /api/reports/invoices?from=2026-11-01&to=2026-12-01
 *   /api/reports/iva?from=2026-10-01&to=2027-01-01
 * Semicolon CSV, UTF-8 with BOM so Excel in Spain opens it correctly.
 */
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user || !hasRole(user, "owner", "manager")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { kind } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DATE.test(from) || !DATE.test(to) || from >= to) {
    return NextResponse.json({ error: "from and to as YYYY-MM-DD, from before to" }, { status: 400 });
  }
  const range = [`${from}T00:00:00+01:00`, `${to}T00:00:00+01:00`] as const;
  let csv: string;
  if (kind === "invoices") csv = await invoicesCsv(payload, ...range);
  else if (kind === "iva") csv = ivaCsv(await ivaSummary(payload, ...range));
  else return NextResponse.json({ error: "unknown report" }, { status: 404 });

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="maisha-${kind}-${from}-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

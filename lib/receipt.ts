import type { Payload } from "payload";
import { emailFrame, escapeHtml, sendEmail } from "@/lib/email";
import { formatEuro } from "@/lib/money";

/**
 * The emailed copy of a ticket (or of its full invoice). The address is used
 * once to send and never stored.
 */
export async function emailReceipt(payload: Payload, orderId: number, to: string) {
  const order = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!order || order.paymentStatus === "unpaid") return { ok: false as const, error: "not-paid" };
  const [{ docs: invoices }, business] = await Promise.all([
    payload.find({ collection: "invoices", overrideAccess: true, depth: 0, limit: 20, sort: "issuedAt", where: { order: { equals: orderId } } }),
    payload.findGlobal({ slug: "business", overrideAccess: true, locale: "es" }),
  ]);
  const invoice = invoices.find((i) => i.type === "F3") ?? invoices.find((i) => i.type === "F2");
  if (!invoice) return { ok: false as const, error: "not-paid" };
  const rates = (invoice.taxBreakdown as { rateBasisPoints: number; baseCents: number; taxCents: number }[] | null) ?? [];
  const lines = (order.lines ?? [])
    .map((l) => `<tr><td>${l.quantity} × ${escapeHtml(l.name)}</td><td style="text-align:right">${formatEuro(l.unitCents * l.quantity)}</td></tr>`)
    .join("");
  const iva = rates
    .map((r) => `<tr><td>IVA ${r.rateBasisPoints / 100} %</td><td style="text-align:right">Base ${formatEuro(r.baseCents)} · Cuota ${formatEuro(r.taxCents)}</td></tr>`)
    .join("");
  const customer =
    invoice.type === "F3" && invoice.customer?.name
      ? `<p>Destinatario: ${escapeHtml(invoice.customer.name)} · ${escapeHtml(invoice.customer.taxId ?? "")}<br>${escapeHtml(invoice.customer.address ?? "")}</p>`
      : "";
  const issued = new Date(invoice.issuedAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
  const title = invoice.type === "F3" ? `Factura ${invoice.fullNumber}` : `Ticket ${invoice.fullNumber}`;
  const r = await sendEmail(
    to,
    `${title} · maisha matcha`,
    emailFrame(
      title,
      `<p>${escapeHtml(business.legalName || business.tradeName || "maisha matcha")} · NIF ${escapeHtml(business.nif || "pendiente")}<br>${escapeHtml(business.address || "")}</p>
       <p>${escapeHtml(issued)}</p>${customer}
       <table style="width:100%;border-collapse:collapse;font-size:14px">${lines}
       <tr><td style="padding-top:8px;border-top:1px solid #B08D57">Total</td><td style="padding-top:8px;border-top:1px solid #B08D57;text-align:right">${formatEuro(invoice.totalCents)}</td></tr>${iva}</table>
       ${invoice.qrUrl ? `<p style="font-size:13px"><a style="color:#1C1B18" href="${escapeHtml(invoice.qrUrl)}">Verificar en la Agencia Tributaria</a></p>` : ""}`,
    ),
  );
  return r.sent ? { ok: true as const } : { ok: false as const, error: r.status === "no-key" ? "no-email" : "send-failed" };
}

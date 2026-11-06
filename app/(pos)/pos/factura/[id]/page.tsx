import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import qrcode from "qrcode-generator";
import { getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/pos/PrintButton";
import { EmailReceipt } from "@/components/pos/EmailReceipt";
import { formatEuro } from "@/lib/money";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/**
 * A full invoice (F3, factura completa) issued on request for a ticket:
 * names the customer, cites the simplified ticket it replaces, A4-printable.
 */
export default async function FullInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentPosSession();
  if (!session) redirect("/pos");
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) notFound();
  const payload = await payloadClient();
  const invoice = await payload.findByID({ collection: "invoices", id: invoiceId, depth: 1, overrideAccess: true }).catch(() => null);
  if (!invoice || invoice.type !== "F3" || typeof invoice.order !== "object" || !invoice.order) notFound();
  const order = invoice.order;
  const replaced = typeof invoice.replaces === "object" && invoice.replaces ? invoice.replaces.fullNumber : "";
  const business = await payload.findGlobal({ slug: "business", overrideAccess: true, locale: "es" });
  const t = await getTranslations({ locale: "es", namespace: "pos.invoice" });
  const rates = (invoice.taxBreakdown as { rateBasisPoints: number; baseCents: number; taxCents: number }[] | null) ?? [];
  let qrSvg: string | null = null;
  if (invoice.qrUrl) {
    const qr = qrcode(0, "M");
    qr.addData(invoice.qrUrl);
    qr.make();
    qrSvg = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 print:p-0">
      <div className="mb-8 flex gap-3 print:hidden">
        <PrintButton label={t("print")} />
        <Link href="/pos/pedidos" className="inline-flex min-h-[48px] items-center rounded-[2px] border border-sumi/55 px-6 text-sm">
          {t("back")}
        </Link>
      </div>
      <article className="text-sm leading-relaxed text-sumi">
        <header className="flex flex-wrap justify-between gap-6">
          <div>
            <p className="font-serif text-2xl">{business.tradeName || "maisha matcha"}</p>
            <p>{business.legalName}</p>
            <p>{business.nif ? `NIF ${business.nif}` : t("pendingNif")}</p>
            <p>{business.address}</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl">{t("title")}</p>
            <p className="tabular-nums">{invoice.fullNumber}</p>
            <p>{new Date(invoice.issuedAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}</p>
          </div>
        </header>
        <section className="mt-8 border-t border-sumi/30 pt-4">
          <p className="text-eyebrow uppercase text-sumi/70">{t("customer")}</p>
          <p className="mt-1">{invoice.customer?.name}</p>
          <p>{invoice.customer?.taxId}</p>
          <p>{invoice.customer?.address}</p>
        </section>
        <table className="mt-8 w-full border-t border-sumi/30">
          <thead>
            <tr className="text-left text-eyebrow uppercase text-sumi/70">
              <th className="py-2 font-normal">{t("concept")}</th>
              <th className="py-2 text-right font-normal">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {(order.lines ?? []).map((l, i) => (
              <tr key={i} className="border-t border-sumi/15">
                <td className="py-2">
                  {l.quantity} × {l.name}
                </td>
                <td className="py-2 text-right tabular-nums">{formatEuro(l.unitCents * l.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="mt-6 ml-auto w-full max-w-sm">
          <tbody>
            {rates.map((r) => (
              <tr key={r.rateBasisPoints}>
                <td>
                  {t("base")} {r.rateBasisPoints / 100} %
                </td>
                <td className="text-right tabular-nums">{formatEuro(r.baseCents)}</td>
                <td className="pl-4">IVA</td>
                <td className="text-right tabular-nums">{formatEuro(r.taxCents)}</td>
              </tr>
            ))}
            <tr className="border-t border-sumi/30 text-base">
              <td colSpan={3} className="pt-2">
                {t("total")}
              </td>
              <td className="pt-2 text-right font-medium tabular-nums">{formatEuro(invoice.totalCents)}</td>
            </tr>
          </tbody>
        </table>
        {replaced ? <p className="mt-8 text-sumi/80">{t("replaces", { number: replaced })}</p> : null}
        {qrSvg ? (
          <figure className="mt-6 flex items-center gap-4 text-xs">
            {/* Deterministic QR from our own invoice record; no user input. */}
            <div className="h-24 w-24 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <figcaption>{invoice.aeatStatus === "accepted" ? `VERI*FACTU · ${t("qr")}` : t("qr")}</figcaption>
          </figure>
        ) : null}
      </article>
      <EmailReceipt orderId={order.id} />
    </div>
  );
}

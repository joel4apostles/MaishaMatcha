import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import qrcode from "qrcode-generator";
import { getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/pos/PrintButton";
import { formatEuro } from "@/lib/money";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/**
 * The customer's ticket (factura simplificada), sized for an 80mm receipt
 * printer: print from the browser. Carries the AEAT verification QR.
 */
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentPosSession();
  if (!session) redirect("/pos");
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const payload = await payloadClient();
  const order = await payload.findByID({ collection: "orders", id: orderId, depth: 1, overrideAccess: true }).catch(() => null);
  if (!order) notFound();
  const [{ docs: invoices }, { docs: payments }, business] = await Promise.all([
    payload.find({ collection: "invoices", where: { order: { equals: orderId } }, limit: 1, depth: 0, overrideAccess: true }),
    payload.find({ collection: "payments", where: { order: { equals: orderId } }, limit: 5, depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: "business", overrideAccess: true, locale: "es" }),
  ]);
  const invoice = invoices[0];
  const t = await getTranslations({ locale: "es", namespace: "pos.ticket" });

  let qrSvg: string | null = null;
  if (invoice?.qrUrl) {
    const qr = qrcode(0, "M");
    qr.addData(invoice.qrUrl);
    qr.make();
    qrSvg = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  }
  const issued = new Date(invoice?.issuedAt ?? order.createdAt);
  const staffName = typeof order.staff === "object" && order.staff ? order.staff.name : "";
  const rates = (order.taxBreakdown as { rateBasisPoints: number; baseCents: number; taxCents: number }[] | null) ?? [];
  const cash = payments.find((p) => p.method === "cash");

  return (
    <div className="mx-auto w-full max-w-[22rem] px-4 py-8 print:max-w-none print:p-0 print:text-[12px]">
      <div className="mb-6 flex gap-3 print:hidden">
        <PrintButton label={t("print")} />
        <Link href="/pos" className="inline-flex min-h-[48px] items-center rounded-[2px] border border-sumi/55 px-6 text-sm">
          {t("back")}
        </Link>
      </div>

      <article className="font-sans text-sm leading-relaxed text-sumi">
        <header className="text-center">
          <p className="font-serif text-xl">{business.tradeName || "maisha matcha"}</p>
          <p>{business.legalName}</p>
          <p>
            {business.nif ? `NIF ${business.nif}` : t("pendingNif")}
          </p>
          <p>{business.address}</p>
        </header>

        <p className="mt-4 border-t border-dashed border-sumi/40 pt-3 text-center uppercase tracking-wide">{t("title")}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-2">
          <dt>{t("number")}</dt>
          <dd className="text-right">{invoice?.fullNumber ?? "—"}</dd>
          <dt>{t("date")}</dt>
          <dd className="text-right">{issued.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</dd>
          <dt>{t("staff")}</dt>
          <dd className="text-right">{staffName}</dd>
        </dl>

        <ul className="mt-3 border-t border-dashed border-sumi/40 pt-3">
          {(order.lines ?? []).map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-0.5">
              <span>
                {l.quantity} × {l.name}
                {((l.modifiers as { label: string }[] | null) ?? []).length ? (
                  <span className="block text-xs text-sumi/75">
                    {((l.modifiers as { label: string }[]) ?? []).map((m) => m.label).join(" · ")}
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums">{formatEuro(l.unitCents * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex justify-between border-t border-dashed border-sumi/40 pt-3 text-base">
          <span>{t("total")}</span>
          <span className="font-medium tabular-nums">{formatEuro(order.totalCents)}</span>
        </div>
        <p className="text-xs text-sumi/75">{t("ivaIncluded")}</p>
        <table className="mt-2 w-full text-xs">
          <tbody>
            {rates.map((r) => (
              <tr key={r.rateBasisPoints}>
                <td>IVA {r.rateBasisPoints / 100} %</td>
                <td className="text-right">
                  {t("base")} {formatEuro(r.baseCents)}
                </td>
                <td className="text-right">
                  {t("quota")} {formatEuro(r.taxCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {cash ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-2 border-t border-dashed border-sumi/40 pt-3">
            <dt>{t("tendered")}</dt>
            <dd className="text-right tabular-nums">{formatEuro(cash.tenderedCents ?? 0)}</dd>
            <dt>{t("change")}</dt>
            <dd className="text-right tabular-nums">{formatEuro(cash.changeCents ?? 0)}</dd>
          </dl>
        ) : payments[0] ? (
          <p className="mt-3 border-t border-dashed border-sumi/40 pt-3">{t("card")}</p>
        ) : null}

        {qrSvg ? (
          <figure className="mt-5 flex flex-col items-center gap-2 text-center text-xs">
            {/* Deterministic QR from our own invoice record; no user input. */}
            <div className="h-28 w-28 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            {/* The VERI*FACTU legend is only printed once the record is really
                accepted by the AEAT: never claim compliance not yet in place. */}
            <figcaption>
              {invoice?.aeatStatus === "accepted" ? `VERI*FACTU · ${t("qr")}` : t("qr")}
            </figcaption>
          </figure>
        ) : null}

        {business.receiptFooter ? <p className="mt-4 text-center text-xs">{business.receiptFooter}</p> : null}
      </article>
    </div>
  );
}

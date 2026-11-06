"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fullInvoiceAction, refundOrderAction, voidOrderAction } from "@/app/(pos)/pos/sale-actions";
import { formatEuro } from "@/lib/money";
import type { PosStaff } from "@/lib/pos/core";
import type { shiftOrders } from "@/lib/pos/sales";

type Row = Awaited<ReturnType<typeof shiftOrders>>[number];
const ERRORS = ["already-full", "reason-required", "over-limit", "approval-failed", "bad-amount", "not-paid", "paid"];
const toCents = (v: string) => Math.round(Number(v.replace(",", ".") || "NaN") * 100);

/** This shift's orders; tap one to void it (unpaid) or refund it (paid). */
export function OrdersList({ rows, approvers }: { rows: Row[]; approvers: PosStaff[] }) {
  const t = useTranslations("pos.orders");
  const router = useRouter();
  const [open, setOpen] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approverId, setApproverId] = useState<number | null>(approvers[0]?.id ?? null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [invoiceMsg, setInvoiceMsg] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const requestFull = (form: FormData) =>
    start(async () => {
      if (!open) return;
      setInvoiceMsg(null);
      const r = await fullInvoiceAction(open.id, {
        name: String(form.get("name") ?? ""),
        taxId: String(form.get("taxId") ?? ""),
        address: String(form.get("address") ?? ""),
      }).catch(() => ({ ok: false as const, error: "generic" }));
      if (r.ok) setInvoiceId(r.invoiceId);
      else setInvoiceMsg(t(`fullErrors.${["bad-tax-id", "missing-customer", "already-full", "refunded", "not-paid", "invalid"].includes(r.error) ? r.error : "generic"}` as "fullErrors.generic"));
    });
  const [pending, start] = useTransition();

  const choose = (r: Row) => {
    setInvoiceId(null);
    setInvoiceMsg(null);
    setOpen(r);
    setReason("");
    setAmount(((r.totalCents - r.refundedCents) / 100).toFixed(2).replace(".", ","));
    setNeedsApproval(false);
    setPin("");
    setMessage(null);
  };
  const explain = (e: string) => t(`errors.${ERRORS.includes(e) ? e : "generic"}` as "errors.generic");

  const submit = () =>
    start(async () => {
      if (!open) return;
      if (open.paymentStatus === "unpaid") {
        const r = await voidOrderAction(open.id, reason);
        if (r.ok) {
          setMessage(t("doneVoid"));
          router.refresh();
        } else setMessage(explain(r.error));
        return;
      }
      const cents = toCents(amount);
      const r = await refundOrderAction({
        orderId: open.id,
        amountCents: cents,
        reason,
        ...(needsApproval && approverId ? { approverId, approverPin: pin } : {}),
      });
      if (r.ok) {
        setMessage(t("doneRefund", { amount: formatEuro(r.refundedCents), invoice: r.invoiceNumber }));
        router.refresh();
      } else {
        if (r.error === "over-limit") setNeedsApproval(true);
        setMessage(explain(r.error));
      }
    });

  const statusLabel = (r: Row) => (r.status === "cancelled" ? t("cancelled") : t(r.paymentStatus as "paid"));

  return (
    <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section>
        <h1 className="font-serif text-[2rem] font-light">{t("title")}</h1>
        {rows.length === 0 ? <p className="mt-6 text-sumi/75">{t("empty")}</p> : null}
        <ul className="mt-6 border-t border-wood/30">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => choose(r)}
                aria-pressed={open?.id === r.id}
                className={`flex min-h-[64px] w-full items-center justify-between gap-4 border-b border-wood/30 px-2 py-3 text-left ${open?.id === r.id ? "bg-sumi/[0.05]" : ""}`}
              >
                <span className="min-w-0">
                  <span className="font-serif text-xl font-light">{r.label}</span>
                  <span className="ml-3 text-sm text-sumi/70">
                    {new Date(r.createdAt).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-sumi/75">{r.summary}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block tabular-nums">{formatEuro(r.totalCents)}</span>
                  <span className="block text-sm text-sumi/70">{statusLabel(r)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {open ? (
        <section aria-label={open.label} className="lg:border-l lg:border-wood/30 lg:pl-8">
          <p className="text-eyebrow uppercase text-sumi/70">{statusLabel(open)}</p>
          <p className="mt-2 font-serif text-[2rem] font-light">
            {open.label} · {formatEuro(open.totalCents)}
          </p>
          {open.status === "cancelled" || open.paymentStatus === "refunded" ? null : (
            <form
              className="mt-6 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {open.paymentStatus !== "unpaid" ? (
                <div>
                  <label htmlFor="refund-amount" className="block text-sm text-sumi/80">
                    {t("amount")}
                  </label>
                  <input
                    id="refund-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ""))}
                    className="mt-2 min-h-[56px] w-40 rounded-[2px] border border-wood/50 bg-transparent px-4 font-serif text-xl tabular-nums"
                  />
                  <p className="mt-1.5 text-sm text-sumi/70">{t("remaining", { amount: formatEuro(open.totalCents - open.refundedCents) })}</p>
                </div>
              ) : null}
              <div>
                <label htmlFor="refund-reason" className="block text-sm text-sumi/80">
                  {t("reason")}
                </label>
                <input
                  id="refund-reason"
                  value={reason}
                  maxLength={300}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  className="mt-2 min-h-[56px] w-full rounded-[2px] border border-wood/50 bg-transparent px-4 text-base placeholder:text-sumi/45"
                />
              </div>
              {needsApproval ? (
                <fieldset className="space-y-3 border-t border-wood/30 pt-4">
                  <legend className="text-sm text-sumi">{t("approval")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {approvers.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={approverId === a.id}
                        onClick={() => setApproverId(a.id)}
                        className={`min-h-[48px] rounded-[2px] border px-4 ${approverId === a.id ? "border-sumi bg-sumi text-washi" : "border-wood/45"}`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                  <label htmlFor="approver-pin" className="block text-sm text-sumi/80">
                    {t("approverPin")}
                  </label>
                  <input
                    id="approver-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="min-h-[56px] w-40 rounded-[2px] border border-wood/50 bg-transparent px-4 text-xl tracking-[0.4em]"
                  />
                </fieldset>
              ) : null}
              <p role="status" className="min-h-[1.5rem] text-sm text-sumi">
                {message}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={pending || !reason.trim()}
                  className="min-h-[56px] rounded-[2px] bg-sumi px-8 font-medium text-washi disabled:opacity-35"
                >
                  {open.paymentStatus === "unpaid" ? t("confirmVoid") : t("confirmRefund", { amount: amount ? `${amount} €` : "" })}
                </button>
                <button type="button" onClick={() => setOpen(null)} className="min-h-[56px] px-4 text-sm underline decoration-wood/60 underline-offset-4">
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
          {open.paymentStatus === "paid" && open.status !== "cancelled" && open.refundedCents === 0 ? (
            <details className="mt-8 border-t border-wood/30 pt-5">
              <summary className="flex min-h-[48px] cursor-pointer items-center text-sm underline decoration-wood/60 underline-offset-4">{t("fullInvoice")}</summary>
              {invoiceId ? (
                <Link href={`/pos/factura/${invoiceId}`} className="mt-4 inline-flex min-h-[56px] items-center rounded-[2px] bg-sumi px-8 font-medium text-washi">
                  {t("openInvoice")}
                </Link>
              ) : (
                <form action={requestFull} className="mt-4 space-y-4">
                  {[
                    { name: "name", label: t("customerName"), auto: "organization" },
                    { name: "taxId", label: t("customerTaxId"), auto: "off" },
                    { name: "address", label: t("customerAddress"), auto: "street-address" },
                  ].map((f) => (
                    <div key={f.name}>
                      <label htmlFor={`fi-${f.name}`} className="block text-sm text-sumi/80">
                        {f.label}
                      </label>
                      <input
                        id={`fi-${f.name}`}
                        name={f.name}
                        required
                        autoComplete={f.auto}
                        autoCapitalize={f.name === "taxId" ? "characters" : "words"}
                        className="mt-2 min-h-[56px] w-full rounded-[2px] border border-wood/50 bg-transparent px-4 text-base"
                      />
                    </div>
                  ))}
                  <p role="status" className="min-h-[1.5rem] text-sm text-sumi">
                    {invoiceMsg}
                  </p>
                  <button type="submit" disabled={pending} className="min-h-[56px] rounded-[2px] bg-sumi px-8 font-medium text-washi disabled:opacity-35">
                    {t("issueFull")}
                  </button>
                </form>
              )}
            </details>
          ) : null}
          {open.status === "cancelled" || open.paymentStatus === "refunded" ? (
            <Link href={`/pos/ticket/${open.id}`} className="mt-6 inline-flex min-h-[48px] items-center text-sm underline decoration-wood/60 underline-offset-4">
              Ticket
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

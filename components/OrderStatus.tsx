"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Eyebrow } from "@/components/Eyebrow";
import { formatEuro } from "@/lib/money";

type Status = "received" | "preparing" | "ready" | "collected" | "cancelled";
export type PublicOrder = {
  label: string;
  status: string;
  paymentStatus: string;
  payOnline: boolean;
  pickupAt: string | null;
  table?: number | null;
  totalCents: number;
  firstName: string;
  lines: { name: string; quantity: number; modifiers: string[] }[];
};
const STEPS: Status[] = ["received", "preparing", "ready", "collected"];
const FINAL = new Set(["collected", "cancelled"]);

/** The customer's live order page: polls quietly until the order is done. */
export function OrderStatus({ token, initial }: { token: string; initial: PublicOrder }) {
  const t = useTranslations("order.status");
  const locale = useLocale();
  const [order, setOrder] = useState(initial);

  useEffect(() => {
    if (FINAL.has(order.status)) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      const r = await fetch(`/api/order-status/${token}`, { cache: "no-store" }).catch(() => null);
      if (r?.ok) setOrder(await r.json());
    }, 10_000);
    return () => clearInterval(id);
  }, [order.status, token]);

  const status = (STEPS.includes(order.status as Status) || order.status === "cancelled" ? order.status : "received") as Status;
  const step = STEPS.indexOf(status);
  const time = order.pickupAt
    ? new Date(order.pickupAt).toLocaleString(locale === "es" ? "es-ES" : "en-GB", { timeZone: "Europe/Madrid", weekday: "long", hour: "2-digit", minute: "2-digit" })
    : null;
  const awaiting = order.payOnline && order.paymentStatus !== "paid" && status !== "cancelled";

  return (
    <div className="max-w-xl">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-5 font-serif text-display font-light">{t("title", { label: order.label })}</h1>
      <p role="status" aria-live="polite" className="mt-6 text-lg">
        {awaiting ? t("awaiting") : t(status)}
      </p>
      {status !== "cancelled" ? (
        <ol className="mt-8 grid grid-cols-4 gap-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <li key={s} className={`h-px ${i <= step && !awaiting ? "bg-sumi" : "bg-wood/35"}`} />
          ))}
        </ol>
      ) : null}
      {order.table ? (
        <p className="mt-8 text-sumi/80">{t("atTable", { table: order.table })}</p>
      ) : time ? (
        <p className="mt-8 text-sumi/80">{t("pickup", { time })}</p>
      ) : null}
      <ul className="mt-6 border-t border-wood/25">
        {order.lines.map((l, i) => (
          <li key={i} className="border-b border-wood/25 py-3">
            <p>
              {l.quantity} × {l.name}
            </p>
            {l.modifiers.length ? <p className="text-sm text-sumi/70">{l.modifiers.join(" · ")}</p> : null}
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-baseline justify-between">
        <span className="text-sumi/80">{order.paymentStatus === "paid" ? t("paid") : t("unpaid")}</span>
        <span className="font-serif text-2xl tabular-nums">{formatEuro(order.totalCents, locale as "es" | "en")}</span>
      </p>
      {!FINAL.has(status) ? <p className="mt-10 text-sm text-sumi/70">{t("live")}</p> : null}
    </div>
  );
}

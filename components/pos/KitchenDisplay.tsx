"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { advanceOrderAction, kitchenQueueAction } from "@/app/(pos)/pos/sale-actions";
import type { kitchenQueue } from "@/lib/pos/sales";

type Order = Awaited<ReturnType<typeof kitchenQueue>>[number];
const LATE_MS = 6 * 60 * 1000;
const POLL_MS = 4000;

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Mock 4: the bar's queue. Polls every 4 s (no paid realtime service);
 * counter and web orders share it. Late orders turn ink, never red.
 */
export function KitchenDisplay({ initial }: { initial: Order[] }) {
  const t = useTranslations("pos.kds");
  const [orders, setOrders] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await kitchenQueueAction();
      if (r.ok) {
        setOrders(r.orders);
        setOffline(false);
      }
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [refresh]);

  const move = async (id: number, to: "preparing" | "ready" | "collected") => {
    setBusy(id);
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: to, statusChangedAt: new Date().toISOString() } : o)));
    try {
      await advanceOrderAction(id, to);
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const columns = [
    { status: "received" as const, title: t("received"), next: "preparing" as const, action: t("start") },
    { status: "preparing" as const, title: t("preparing"), next: "ready" as const, action: t("done") },
    { status: "ready" as const, title: t("ready"), next: "collected" as const, action: t("collected") },
  ];

  return (
    <div className="flex w-full flex-col">
      {offline ? (
        <p role="status" className="mb-4 rounded-[2px] bg-sumi px-4 py-3 text-sm text-washi">
          {t("offline")}
        </p>
      ) : null}
      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} aria-label={col.title} className="flex flex-col gap-4">
              <h2 className="text-[13px] font-medium uppercase tracking-[0.15em] text-sumi/70">
                {col.title} · {list.length}
              </h2>
              {list.length === 0 ? <p className="text-sm text-sumi/60">{t("empty")}</p> : null}
              {list.map((o) => {
                const age = now - new Date(col.status === "ready" ? o.statusChangedAt : o.createdAt).getTime();
                const late = col.status !== "ready" && age > LATE_MS;
                return (
                  <article
                    key={o.id}
                    className={`flex flex-col gap-3 rounded-[2px] border px-5 py-4 ${late ? "border-sumi" : "border-wood/50"} ${col.status === "ready" ? "bg-matcha/10" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-serif text-[1.6rem] font-light">
                        {o.label}
                        {o.callName ? <span className="ml-3">{o.callName}</span> : null}
                      </span>
                      <span
                        className={`rounded-[2px] px-2 py-0.5 text-[15px] tabular-nums ${late ? "bg-sumi text-washi" : ""}`}
                      >
                        {mmss(age)}
                        {late ? ` · ${t("late")}` : ""}
                      </span>
                    </div>
                    <p className="text-sm text-sumi/75">
                      {[
                        o.channel === "online" ? (o.table ? t("table", { table: o.table }) : t("web")) : null,
                        o.pickupAt && !o.table
                          ? t("pickupAt", { time: new Date(o.pickupAt).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }) })
                          : null,
                        o.service === "takeaway" ? t("takeaway") : t("here"),
                        o.staffName,
                        o.paid ? null : t("unpaid"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <ul className="flex flex-col gap-2 text-lg">
                      {o.lines.map((l, i) => (
                        <li key={i}>
                          {l.quantity} × {l.name}
                          {l.modifiers.length || l.grams || l.note ? (
                            <span className="mt-0.5 block text-[15px] text-sumi/75">
                              {[...l.modifiers, l.grams ? `${String(l.grams).replace(".", ",")} g` : null, l.note ? `"${l.note}"` : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {o.note ? <p className="text-sm italic text-sumi/80">{o.note}</p> : null}
                    <button
                      type="button"
                      disabled={busy === o.id}
                      onClick={() => move(o.id, col.next)}
                      className={`min-h-[56px] rounded-[2px] text-base font-medium disabled:opacity-50 ${
                        col.status === "received" ? "border border-sumi" : col.status === "preparing" ? "bg-sumi text-washi" : "border border-sumi/55"
                      }`}
                    >
                      {col.action}
                    </button>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

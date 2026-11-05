"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { chargeAction } from "@/app/(pos)/pos/sale-actions";
import { formatEuro, taxBreakdown } from "@/lib/money";
import { changeBreakdown, quickTenders, type CatalogItem } from "@/lib/pos/pricing";
import { OptionsSheet, type DraftLine } from "./OptionsSheet";
import { enqueue, markFailed, readQueue, remove } from "./offlineQueue";

type Mode = "order" | "cash" | "card" | "done";
type Done = { label: string; invoiceNumber: string | null; changeCents: number; orderId: number | null; queued?: boolean };
const BUSINESS_ERRORS = ["invalid", "missing-required", "unavailable-item", "unavailable-option", "short-cash", "no-shift"];

const newKey = () => crypto.randomUUID();
const uid = () => Math.random().toString(36).slice(2);

const lineUnit = (l: DraftLine) =>
  l.item.priceCents +
  l.item.groups
    .flatMap((g) => g.options)
    .filter((o) => l.modifierKeys.includes(o.key))
    .reduce((s, o) => s + o.priceDeltaCents, 0);

const lineSummary = (l: DraftLine) =>
  [
    ...l.item.groups.flatMap((g) => g.options).filter((o) => l.modifierKeys.includes(o.key)).map((o) => o.label),
    l.grams ? `${String(l.grams).replace(".", ",")} g` : null,
    l.note ? `"${l.note}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * The counter (mocks 1 to 3): carta on the left, the ticket on the right,
 * then cash or card. Prices shown here are for the eye only: the server
 * re-prices every line when charging. One idempotency key per ticket, so a
 * retried "Cobrar" can never create or charge a second order.
 */
export function Till({ catalog }: { catalog: CatalogItem[] }) {
  const t = useTranslations("pos.till");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [service, setService] = useState<"here" | "takeaway">("here");
  const [sheet, setSheet] = useState<DraftLine | null>(null);
  const [mode, setMode] = useState<Mode>("order");
  const [tendered, setTendered] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [key, setKey] = useState(newKey);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);

  // Offline queue: cash sales kept on the tablet sync when the network
  // returns. Idempotency keys make every retry safe.
  const flush = useCallback(async () => {
    for (const sale of readQueue()) {
      try {
        const r = await chargeAction({ ...sale, method: "cash", note: null });
        if (r.ok || r.error === "already-paid") remove(sale.idempotencyKey);
        else if (BUSINESS_ERRORS.includes(r.error)) markFailed(sale.idempotencyKey, r.error);
      } catch {
        break; // Still offline: try again later.
      }
    }
    setQueued(readQueue().length);
  }, []);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) flush();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = setInterval(flush, 20000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      clearInterval(timer);
    };
  }, [flush]);

  const categories = useMemo(() => [...new Set(catalog.map((i) => i.category))], [catalog]);
  const total = lines.reduce((s, l) => s + lineUnit(l) * l.quantity, 0);
  const tax = useMemo(
    () => taxBreakdown(lines.map((l) => ({ grossCents: lineUnit(l) * l.quantity, rateBasisPoints: l.item.taxRateBasisPoints }))),
    [lines],
  );
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const tenderedCents = Math.round(Number(tendered.replace(",", ".") || "0") * 100);

  const tap = (item: CatalogItem) => {
    if (!item.available) return;
    const draft: DraftLine = { uid: uid(), item, quantity: 1, modifierKeys: [], grams: item.defaultGrams, note: "" };
    // Preselect the first option of each required single-choice group.
    for (const g of item.groups) if (g.required && g.selection === "single") draft.modifierKeys.push(g.options.find((o) => o.available)?.key ?? "");
    draft.modifierKeys = draft.modifierKeys.filter(Boolean);
    if (item.groups.length === 0 && !item.defaultGrams) {
      setLines((ls) => [...ls, draft]);
    } else {
      setSheet(draft);
    }
  };

  const reset = useCallback(() => {
    setLines([]);
    setService("here");
    setMode("order");
    setTendered("");
    setError(null);
    setDone(null);
    setKey(newKey());
  }, []);

  const charge = async (method: "cash" | "card_terminal") => {
    setBusy(true);
    setError(null);
    try {
      const r = await chargeAction({
        idempotencyKey: key,
        service,
        method,
        tenderedCents: method === "cash" ? tenderedCents : undefined,
        lines: lines.map((l) => ({
          menuItemId: l.item.id,
          quantity: l.quantity,
          modifierKeys: l.modifierKeys,
          grams: l.grams,
          note: l.note || null,
        })),
      });
      if (r.ok) {
        setDone({ label: r.label, invoiceNumber: r.invoiceNumber, changeCents: r.changeCents, orderId: r.orderId });
        setMode("done");
        setOnline(true);
      } else {
        const errors = ["no-shift", "no-session", "invalid", "missing-required", "unavailable-item", "unavailable-option", "short-cash", "already-paid"];
        setError(t(`errors.${errors.includes(r.error) ? r.error : "generic"}` as "errors.generic"));
      }
    } catch {
      // Network failure. Cash can be kept on the tablet; card cannot.
      if (method === "cash") {
        enqueue({
          idempotencyKey: key,
          service,
          tenderedCents,
          totalCents: total,
          queuedAt: new Date().toISOString(),
          lines: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity, modifierKeys: l.modifierKeys, grams: l.grams, note: l.note || null })),
        });
        setQueued(readQueue().length);
        setOnline(false);
        setDone({ label: "", invoiceNumber: null, changeCents: tenderedCents - total, orderId: null, queued: true });
        setMode("done");
      } else {
        setOnline(false);
        setError(t("errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  };

  const banner =
    !online || queued > 0 ? (
      <div role="status" className="col-span-full mb-2 flex flex-wrap items-center justify-between gap-4 rounded-[2px] bg-sumi px-5 py-3 text-[15px] text-washi">
        <span>{online ? t("syncing") : t("offline")}</span>
        {queued > 0 ? <span className="whitespace-nowrap">{t("queued", { count: queued })}</span> : null}
      </div>
    ) : null;

  // ---------------------------------------------------------------- done
  if (mode === "done" && done) {
    return (
      <div className="mx-auto w-full max-w-xl py-10 text-center">
        {banner}
        <p className="text-eyebrow uppercase text-sumi/70">{t("paidTitle")}</p>
        <p className="mt-4 font-serif text-[2.5rem] font-light leading-tight">{formatEuro(total)}</p>
        <p className="mt-3 text-sumi/80">
          {done.queued ? t("savedOffline") : t("paidLine", { label: done.label, invoice: done.invoiceNumber ?? "" })}
        </p>
        {done.changeCents > 0 ? (
          <p className="mt-6 font-serif text-[2rem] font-light">{t("changeLine", { change: formatEuro(done.changeCents) })}</p>
        ) : null}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {done.orderId ? (
          <Link
            href={`/pos/ticket/${done.orderId}`}
            className="inline-flex min-h-[56px] items-center rounded-[2px] border border-sumi/55 px-8 text-sm font-medium"
          >
            {t("printTicket")}
          </Link>
          ) : null}
          <button type="button" onClick={reset} autoFocus className="min-h-[56px] rounded-[2px] bg-sumi px-10 text-sm font-medium text-washi">
            {t("newOrder")}
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------- cash / card
  if (mode === "cash" || mode === "card") {
    const change = tenderedCents - total;
    const press = (k: string) =>
      setTendered((v) => (k === "del" ? v.slice(0, -1) : k === "," ? (v.includes(",") ? v : `${v || "0"},`) : (v.split(",")[1]?.length ?? 0) >= 2 ? v : v + k));
    return (
      <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2">
        {banner}
        <section className="flex flex-col">
          <button type="button" onClick={() => setMode("order")} className="self-start text-sm underline decoration-wood/60 underline-offset-4 min-h-[44px]">
            {t("backToOrder")}
          </button>
          <p className="mt-6 text-eyebrow uppercase text-sumi/70">{t("total")}</p>
          <p className="mt-2 font-serif text-[3.5rem] font-light leading-none tabular-nums">{formatEuro(total)}</p>
          {mode === "cash" ? (
            <>
              <p className="mt-10 text-eyebrow uppercase text-sumi/70">{t("tendered")}</p>
              <p className="mt-2 font-serif text-[3rem] font-light leading-none tabular-nums" aria-live="polite">
                {tendered ? `${tendered} €` : "—"}
              </p>
              <div className="mt-auto border-t border-wood/35 pt-6">
                <p className="text-eyebrow uppercase text-sumi/70">{t("change")}</p>
                <p className="mt-2 font-serif text-[3.5rem] leading-none tabular-nums" aria-live="polite">
                  {change >= 0 && tendered ? formatEuro(change) : "—"}
                </p>
                {change > 0 && tendered ? (
                  <p className="mt-3 text-sm text-sumi/75">
                    {changeBreakdown(change)
                      .map((d) => `${d.count} × ${formatEuro(d.cents)}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-8 max-w-[40ch] leading-relaxed text-sumi/85">{t("cardBody", { total: formatEuro(total) })}</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          {mode === "cash" ? (
            <>
              <div className="grid grid-cols-4 gap-2.5">
                {quickTenders(total).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTendered((v / 100).toFixed(2).replace(".", ","))}
                    className="min-h-[56px] rounded-[2px] border border-wood/45 text-base"
                  >
                    {v === total ? t("exact") : formatEuro(v)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "del"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    aria-label={k === "del" ? t("clear") : undefined}
                    className={`min-h-[64px] rounded-[2px] text-2xl ${k === "del" ? "text-base text-sumi/70" : "border border-wood/45"}`}
                  >
                    {k === "del" ? t("clear") : k}
                  </button>
                ))}
              </div>
              <p role="status" className="min-h-[1.5rem] text-sm text-sumi">
                {error}
              </p>
              <button
                type="button"
                disabled={busy || !tendered || change < 0}
                onClick={() => charge("cash")}
                className="mt-auto min-h-[72px] rounded-[2px] bg-sumi text-lg font-medium text-washi disabled:opacity-35"
              >
                {t("charge")}
              </button>
            </>
          ) : (
            <>
              <p role="status" className="min-h-[1.5rem] text-sm text-sumi">
                {error}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => charge("card_terminal")}
                className="mt-auto min-h-[72px] rounded-[2px] bg-sumi text-lg font-medium text-washi disabled:opacity-35"
              >
                {t("cardConfirm")}
              </button>
            </>
          )}
        </section>
      </div>
    );
  }

  // --------------------------------------------------------------- order
  return (
    <div className="grid w-full grid-cols-1 content-start gap-8 lg:grid-cols-[11rem_minmax(0,1fr)_22rem]">
      {banner}
      <nav aria-label={t("categories")} className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {categories.map((c) => (
          <a
            key={c}
            href={`#cat-${encodeURIComponent(c)}`}
            className="inline-flex min-h-[48px] shrink-0 items-center rounded-[2px] px-4 text-[15px] text-sumi/80 hover:bg-sumi/[0.06]"
          >
            {c}
          </a>
        ))}
      </nav>

      <section aria-label={t("categories")} className="min-w-0 space-y-8">
        {categories.map((c) => (
          <div key={c} id={`cat-${encodeURIComponent(c)}`} className="scroll-mt-24">
            <p className="text-eyebrow uppercase text-sumi/70">{c}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {catalog
                .filter((i) => i.category === c)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => tap(item)}
                    disabled={!item.available}
                    className={`flex min-h-[104px] flex-col justify-between rounded-[2px] border px-5 py-4 text-left transition-colors ${
                      item.available ? "border-wood/45 hover:border-sumi/50 active:bg-sumi/[0.04]" : "border-dashed border-wood/45 text-sumi/50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-sumi/15" style={{ backgroundColor: item.color }} />
                      <span className="font-serif text-[1.375rem] font-light leading-tight">{item.name}</span>
                    </span>
                    <span className="text-sm text-sumi/70">{item.available ? formatEuro(item.priceCents) : t("soldOut")}</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </section>

      <aside aria-label={t("ticket")} className="flex flex-col border-t border-wood/35 pt-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[1.75rem] font-light">{t("ticket")}</h2>
          <span className="text-sm text-sumi/70">{t("items", { count })}</span>
        </div>
        <div role="group" className="mt-4 grid grid-cols-2 rounded-[2px] border border-wood/45">
          {(["here", "takeaway"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={service === s}
              onClick={() => setService(s)}
              className={`min-h-[44px] text-sm ${service === s ? "bg-sumi text-washi" : ""}`}
            >
              {t(s)}
            </button>
          ))}
        </div>

        <ul className="mt-4 flex-1 overflow-y-auto">
          {lines.length === 0 ? <li className="py-6 text-sm text-sumi/70">{t("empty")}</li> : null}
          {lines.map((l) => (
            <li key={l.uid} className="flex items-start justify-between gap-3 border-b border-wood/25 py-3">
              <button type="button" onClick={() => setSheet(l)} className="min-w-0 text-left">
                <span className="block text-[17px]">
                  {l.quantity} × {l.item.name}
                </span>
                <span className="mt-0.5 block text-sm text-sumi/70">{lineSummary(l)}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-[17px] tabular-nums">{formatEuro(lineUnit(l) * l.quantity)}</span>
                <button
                  type="button"
                  aria-label={t("remove", { name: l.item.name })}
                  onClick={() => setLines((ls) => ls.filter((x) => x.uid !== l.uid))}
                  className="flex h-11 w-11 items-center justify-center text-sumi/60 hover:text-sumi"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d="M4 4l12 12M16 4L4 16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-sumi/70">
          {t("base", {
            base: formatEuro(tax.rates.reduce((s, r) => s + r.baseCents, 0)),
            tax: formatEuro(tax.rates.reduce((s, r) => s + r.taxCents, 0)),
          })}
        </p>
        <div className="mt-1 flex items-baseline justify-between">
          <span>{t("total")}</span>
          <span className="font-serif text-[2.5rem] font-light tabular-nums">{formatEuro(total)}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={lines.length === 0}
            onClick={() => {
              setTendered("");
              setError(null);
              setMode("cash");
            }}
            className="min-h-[64px] rounded-[2px] border border-sumi/55 font-medium disabled:opacity-35"
          >
            {t("cash")}
          </button>
          <button
            type="button"
            disabled={lines.length === 0 || !online}
            onClick={() => {
              setError(null);
              setMode("card");
            }}
            className="min-h-[64px] rounded-[2px] bg-sumi font-medium text-washi disabled:opacity-35"
          >
            {t("card")}
          </button>
        </div>
      </aside>

      {sheet ? (
        <OptionsSheet
          draft={sheet}
          onCancel={() => setSheet(null)}
          onConfirm={(line) => {
            setLines((ls) => (ls.some((x) => x.uid === line.uid) ? ls.map((x) => (x.uid === line.uid ? line : x)) : [...ls, line]));
            setSheet(null);
          }}
        />
      ) : null}
    </div>
  );
}

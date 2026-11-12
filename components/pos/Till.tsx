"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { chargeAction } from "@/app/(pos)/pos/sale-actions";
import { formatEuro, taxBreakdown } from "@/lib/money";
import { changeBreakdown, quickTenders, type CatalogItem } from "@/lib/pos/pricing";
import type { Favourite } from "@/lib/pos/sales";
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
 * The counter (Barra v2, mock 5, 2026-11-12): the most ordered drinks in
 * one tap, the carta as coloured cards filtered by category, the options in
 * place beside the live order (OptionsSheet), then cash or card. Prices shown here are for the eye only: the server
 * re-prices every line when charging. One idempotency key per ticket, so a
 * retried "Cobrar" can never create or charge a second order.
 */
export function Till({ catalog, favourites = [] }: { catalog: CatalogItem[]; favourites?: Favourite[] }) {
  const t = useTranslations("pos.till");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [service, setService] = useState<"here" | "takeaway">("here");
  const [callName, setCallName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sheet, setSheet] = useState<DraftLine | null>(null);
  const [mode, setMode] = useState<Mode>("order");
  const [tendered, setTendered] = useState("");
  // Split: the part paid on the card terminal; the rest is cash.
  const [cardPart, setCardPart] = useState("");
  const [splitting, setSplitting] = useState(false);
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
        const r = await chargeAction({ ...sale, customerName: sale.customerName ?? null, method: "cash", note: null });
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
  const cardCents = splitting ? Math.round(Number(cardPart.replace(",", ".") || "0") * 100) : 0;
  const cashDue = total - cardCents;
  const splitValid = !splitting || (cardCents > 0 && cardCents < total);

  // Favourites still on the carta with every option available.
  const quick = useMemo(
    () =>
      favourites
        .map((f) => {
          const item = catalog.find((i) => i.id === f.menuItemId);
          if (!item || !item.available) return null;
          const options = item.groups.flatMap((g) => g.options);
          if (!f.modifierKeys.every((k) => options.some((o) => o.key === k && o.available))) return null;
          const unit = item.priceCents + options.filter((o) => f.modifierKeys.includes(o.key)).reduce((s, o) => s + o.priceDeltaCents, 0);
          const labels = options.filter((o) => f.modifierKeys.includes(o.key)).map((o) => o.label);
          const milk = options.find((o) => f.modifierKeys.includes(o.key) && o.hue && item.groups.some((g) => g.slug === "leche" && g.options.includes(o)));
          return { key: `${f.menuItemId}|${f.modifierKeys.join(",")}`, item, modifierKeys: f.modifierKeys, unit, label: [item.name, ...labels].join(" · "), milk: milk?.hue ?? item.color };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [favourites, catalog],
  );

  const addQuick = (q: (typeof quick)[number]) =>
    setLines((ls) => {
      const same = ls.find((l) => l.item.id === q.item.id && !l.note && l.grams === q.item.defaultGrams && [...l.modifierKeys].sort().join(",") === q.modifierKeys.join(","));
      return same
        ? ls.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l))
        : [...ls, { uid: uid(), item: q.item, quantity: 1, modifierKeys: q.modifierKeys, grams: q.item.defaultGrams, note: "" }];
    });

  const bump = (lineUid: string, delta: number) =>
    setLines((ls) => ls.map((l) => (l.uid === lineUid ? { ...l, quantity: Math.min(50, l.quantity + delta) } : l)).filter((l) => l.quantity > 0));

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
    setCallName("");
    setCategory(null);
    setMode("order");
    setTendered("");
    setCardPart("");
    setSplitting(false);
    setError(null);
    setDone(null);
    setKey(newKey());
  }, []);

  const charge = async (choice: "cash" | "card_terminal") => {
    const method = choice === "cash" && splitting ? "split" : choice;
    setBusy(true);
    setError(null);
    try {
      const r = await chargeAction({
        idempotencyKey: key,
        service,
        customerName: callName.trim() || null,
        method,
        tenderedCents: method === "card_terminal" ? undefined : tenderedCents,
        cardCents: method === "split" ? cardCents : undefined,
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
        const errors = ["no-shift", "no-session", "invalid", "missing-required", "unavailable-item", "unavailable-option", "short-cash", "already-paid", "bad-split"];
        setError(t(`errors.${errors.includes(r.error) ? r.error : "generic"}` as "errors.generic"));
      }
    } catch {
      // Network failure. Cash can be kept on the tablet; card (or a split) cannot.
      if (method === "cash") {
        enqueue({
          idempotencyKey: key,
          service,
          customerName: callName.trim() || null,
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
    const change = tenderedCents - cashDue;
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
              {/* Split: part on the card terminal, the rest in cash. */}
              <div className="mt-6">
                {splitting ? (
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label htmlFor="card-part" className="block text-eyebrow uppercase text-sumi/70">
                        {t("cardPart")}
                      </label>
                      <input
                        id="card-part"
                        inputMode="decimal"
                        autoComplete="off"
                        value={cardPart}
                        onChange={(e) => setCardPart(e.target.value.replace(/[^0-9,.]/g, ""))}
                        className="mt-2 min-h-[56px] w-40 rounded-[2px] border border-wood/50 bg-transparent px-4 font-serif text-xl tabular-nums"
                      />
                    </div>
                    <p className="pb-3 text-sumi/80">
                      {splitValid && cardCents ? t("cashPart", { amount: formatEuro(cashDue) }) : t("splitHint")}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSplitting(false);
                        setCardPart("");
                        setTendered("");
                      }}
                      className="min-h-[44px] pb-2 text-sm underline decoration-wood/60 underline-offset-4"
                    >
                      {t("splitCancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!online}
                    onClick={() => {
                      setSplitting(true);
                      setTendered("");
                    }}
                    className="min-h-[44px] text-sm underline decoration-wood/60 underline-offset-4 disabled:opacity-35"
                  >
                    {t("split")}
                  </button>
                )}
              </div>
              <p className="mt-8 text-eyebrow uppercase text-sumi/70">{t("tendered")}</p>
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
                {quickTenders(splitValid && cashDue > 0 ? cashDue : total).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTendered((v / 100).toFixed(2).replace(".", ","))}
                    className="min-h-[56px] rounded-[2px] border border-wood/45 text-base"
                  >
                    {v === (splitting ? cashDue : total) ? t("exact") : formatEuro(v)}
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
                disabled={busy || !tendered || change < 0 || !splitValid}
                onClick={() => charge("cash")}
                className="mt-auto min-h-[72px] rounded-[2px] bg-sumi text-lg font-medium text-washi disabled:opacity-35"
              >
                {splitting && cardCents > 0 ? t("chargeSplit", { card: formatEuro(cardCents) }) : t("charge")}
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
  const shown = category ? catalog.filter((i) => i.category === category) : catalog;
  const tab = (on: boolean) =>
    `inline-flex min-h-[48px] items-center rounded-[2px] border px-4 text-[15px] transition-colors ${on ? "border-sumi bg-sumi text-washi" : "border-wood/45 hover:border-sumi/50"}`;
  return (
    <div className="grid w-full grid-cols-1 content-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
      {banner}
      <div className="flex min-w-0 flex-col gap-6">
        {sheet ? (
          <OptionsSheet
            key={sheet.uid}
            draft={sheet}
            onCancel={() => setSheet(null)}
            onConfirm={(line) => {
              setLines((ls) => (ls.some((x) => x.uid === line.uid) ? ls.map((x) => (x.uid === line.uid ? line : x)) : [...ls, line]));
              setSheet(null);
            }}
          />
        ) : (
          <>
            <nav aria-label={t("categories")} className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={tab(category === null)}>
                {t("all")}
              </button>
              {categories.map((c) => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={tab(category === c)}>
                  {c}
                </button>
              ))}
            </nav>

            {quick.length > 0 && category === null ? (
              <section aria-labelledby="fav-title">
                <p id="fav-title" className="text-eyebrow uppercase text-sumi/70">
                  {t("favourites")}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                  {quick.map((q) => (
                    <button
                      key={q.key}
                      type="button"
                      onClick={() => addQuick(q)}
                      className="flex min-h-[72px] items-center gap-3 rounded-[2px] border border-wood/45 bg-matcha/[0.06] px-3.5 text-left transition-colors hover:border-sumi/50 active:bg-matcha/15"
                    >
                      <span aria-hidden="true" className="flex h-11 w-3.5 shrink-0 flex-col overflow-hidden rounded-[2px] ring-1 ring-inset ring-sumi/15">
                        <span className="flex-[3]" style={{ backgroundColor: q.item.color }} />
                        <span className="flex-[2]" style={{ backgroundColor: q.milk }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium leading-snug">{q.label}</span>
                        <span className="block text-sm text-sumi/70 tabular-nums">{formatEuro(q.unit)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-label={t("categories")} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((item) => {
                const simple = item.groups.length === 0 && !item.defaultGrams;
                const hint = simple ? t("oneTap") : (item.groups.find((g) => g.required)?.options.map((o) => o.label).join(" o ") ?? "");
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => tap(item)}
                    disabled={!item.available}
                    className={`flex min-h-[108px] items-stretch gap-3.5 rounded-[2px] border p-3 pr-4 text-left transition-colors ${
                      item.available ? "border-wood/45 hover:border-sumi/50 active:bg-sumi/[0.04]" : "border-dashed border-wood/45 text-sumi/50"
                    }`}
                  >
                    <span aria-hidden="true" className="w-8 shrink-0 rounded-[2px] ring-1 ring-inset ring-sumi/15" style={{ backgroundColor: item.color }} />
                    <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-sumi/70">{item.category}</span>
                      <span className="font-serif text-[1.4rem] font-light leading-tight">{item.name}</span>
                      <span className="flex justify-between gap-2 text-sm text-sumi/70">
                        <span className="truncate">{item.available ? hint : t("soldOut")}</span>
                        <span className="text-sumi tabular-nums">{formatEuro(item.priceCents)}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>
          </>
        )}
      </div>

      <aside aria-label={t("ticket")} className="flex flex-col border-t border-wood/35 pt-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <label className="flex flex-col gap-1.5 text-sm text-sumi/75">
          {t("callName")}
          <input
            value={callName}
            onChange={(e) => setCallName(e.target.value.replace(/[^\p{L} .'-]/gu, "").slice(0, 40))}
            placeholder={t("callNameHint")}
            autoComplete="off"
            className="min-h-[48px] rounded-[2px] border border-wood/50 bg-transparent px-4 text-[17px] text-sumi placeholder:text-sumi/45 focus:border-sumi/70"
          />
        </label>
        <div role="group" className="mt-3 grid grid-cols-2 rounded-[2px] border border-wood/45">
          {(["here", "takeaway"] as const).map((sv) => (
            <button
              key={sv}
              type="button"
              aria-pressed={service === sv}
              onClick={() => setService(sv)}
              className={`min-h-[44px] text-sm ${service === sv ? "bg-sumi text-washi" : ""}`}
            >
              {t(sv)}
            </button>
          ))}
        </div>

        <ul className="mt-3 flex-1 overflow-y-auto">
          {lines.length === 0 ? <li className="py-6 text-sm text-sumi/70">{t("empty")}</li> : null}
          {lines.map((l) => (
            <li key={l.uid} className="flex items-center gap-2.5 border-b border-wood/25 py-2.5">
              <span aria-hidden="true" className="h-9 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: l.item.color }} />
              <button type="button" onClick={() => setSheet(l)} aria-label={t("lineOptions", { name: l.item.name })} className="min-w-0 flex-1 text-left">
                <span className="block text-base leading-snug">{l.item.name}</span>
                <span className="mt-0.5 block text-[13px] text-sumi/70">{lineSummary(l)}</span>
              </button>
              <button type="button" aria-label={l.quantity === 1 ? t("remove", { name: l.item.name }) : t("less")} onClick={() => bump(l.uid, -1)} className="h-11 w-11 shrink-0 rounded-[2px] border border-wood/45 text-lg">
                −
              </button>
              <span className="w-5 text-center tabular-nums" aria-live="polite">
                {l.quantity}
              </span>
              <button type="button" aria-label={t("more")} onClick={() => bump(l.uid, 1)} className="h-11 w-11 shrink-0 rounded-[2px] border border-wood/45 text-lg">
                +
              </button>
              <span className="w-16 shrink-0 text-right tabular-nums">{formatEuro(lineUnit(l) * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex justify-between gap-3 text-sm text-sumi/70">
          <span>
            {t("base", {
              base: formatEuro(tax.rates.reduce((s2, r) => s2 + r.baseCents, 0)),
              tax: formatEuro(tax.rates.reduce((s2, r) => s2 + r.taxCents, 0)),
            })}
          </span>
          <span>{t("items", { count })}</span>
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
    </div>
  );
}

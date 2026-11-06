"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { backEnterTicketAction, receiveScannedAction } from "@/app/(pos)/pos/scan-actions";
import { formatEuro } from "@/lib/money";
import type { CatalogItem } from "@/lib/pos/pricing";
import { suggestDelivery, suggestTicket } from "@/lib/scan";

export type ScanPo = {
  id: number;
  label: string;
  supplier: string;
  lines: { index: number; name: string; orderedPacks: number; receivedPacks: number }[];
};

// Text recognition runs in the browser (photos never leave the tablet),
// entirely from files on this site (public/vendor/tesseract): nothing
// executable comes from a CDN on the counter (strict CSP on /pos).
const VENDOR = "/vendor/tesseract";
type TessOpts = {
  logger?: (m: { status: string; progress: number }) => void;
  workerPath: string;
  corePath: string;
  langPath: string;
};
type Tess = { recognize: (img: File, lang: string, opts: TessOpts) => Promise<{ data: { text: string } }> };

function loadTesseract(): Promise<Tess> {
  const w = window as unknown as { Tesseract?: Tess };
  if (w.Tesseract) return Promise.resolve(w.Tesseract);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${VENDOR}/tesseract.min.js`;
    s.onload = () => (w.Tesseract ? resolve(w.Tesseract) : reject(new Error("tesseract")));
    s.onerror = () => reject(new Error("tesseract"));
    document.head.appendChild(s);
  });
}

const box = "min-h-[56px] rounded-[2px] border border-wood/50 bg-transparent px-4 text-base";
const primary = "min-h-[64px] rounded-[2px] bg-sumi px-8 text-lg font-medium text-washi disabled:opacity-35";
const tab = (on: boolean) => `min-h-[48px] rounded-[2px] border px-5 ${on ? "border-sumi bg-sumi text-washi" : "border-wood/45"}`;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
type TicketLine = { uid: string; menuItemId: number; quantity: number; modifierKeys: string[] };

export function Scanner({ orders, canReceive, hasShift, catalog }: { orders: ScanPo[]; canReceive: boolean; hasShift: boolean; catalog: CatalogItem[] }) {
  const t = useTranslations("pos.scan");
  const [mode, setMode] = useState<"delivery" | "ticket">(canReceive ? "delivery" : "ticket");
  const [poId, setPoId] = useState<number | null>(orders[0]?.id ?? null);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [packs, setPacks] = useState<Record<number, string>>({});
  const [ticket, setTicket] = useState<TicketLine[]>([]);
  const [paperDate, setPaperDate] = useState(today);
  const [method, setMethod] = useState<"cash" | "card_terminal">("cash");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const po = orders.find((o) => o.id === poId) ?? null;
  const items = new Map(catalog.map((i) => [i.id, i]));

  // Required single-choice options: first available, or the one the paper names.
  const defaultsFor = (item: CatalogItem, line: string) =>
    item.groups
      .filter((g) => g.required && g.selection === "single")
      .map((g) => (g.options.find((o) => o.available && line.toLowerCase().includes(o.label.toLowerCase())) ?? g.options.find((o) => o.available))?.key)
      .filter((k): k is string => Boolean(k));

  async function read(file: File) {
    setMsg("");
    setProgress(0);
    try {
      const tess = await loadTesseract();
      const { data } = await tess.recognize(file, "spa+eng", {
        workerPath: `${VENDOR}/worker.min.js`,
        corePath: `${VENDOR}/tesseract-core-simd-lstm.wasm.js`,
        langPath: VENDOR,
        logger: (m) => m.status === "recognizing text" && setProgress(Math.round(m.progress * 100)),
      });
      setText(data.text);
      apply(data.text);
    } catch {
      setMsg(t("ocrFailed"));
    } finally {
      setProgress(null);
    }
  }

  function apply(raw: string) {
    if (mode === "delivery" && po) {
      const s = suggestDelivery(raw, po.lines.map((l) => ({ index: l.index, name: l.name, orderedPacks: l.orderedPacks - l.receivedPacks })));
      setPacks(Object.fromEntries(s.map((x) => [x.index, x.packs != null ? String(x.packs) : ""])));
    } else {
      const s = suggestTicket(raw, catalog.map((i) => ({ id: i.id, name: i.name })));
      setTicket(
        s.map((x) => {
          const item = items.get(x.menuItemId)!;
          return { uid: crypto.randomUUID(), menuItemId: x.menuItemId, quantity: x.quantity, modifierKeys: defaultsFor(item, x.line) };
        }),
      );
    }
  }

  const confirmDelivery = () =>
    start(async () => {
      if (!po) return;
      const r = await receiveScannedAction({
        idempotencyKey: key,
        poId: po.id,
        packs: po.lines.map((l) => ({ index: l.index, packs: Math.max(0, Number(packs[l.index] || 0)) })),
      }).catch(() => ({ ok: false as const, error: "generic" }));
      if (r.ok) {
        setMsg(t("received"));
        setPacks({});
        setKey(crypto.randomUUID());
      } else setMsg(t(`errors.${["forbidden", "not-open", "nothing", "invalid", "over-ordered"].includes(r.error) ? r.error : "generic"}` as "errors.generic"));
    });

  const ticketTotal = ticket.reduce((s, l) => {
    const item = items.get(l.menuItemId);
    if (!item) return s;
    const delta = item.groups.flatMap((g) => g.options).filter((o) => l.modifierKeys.includes(o.key)).reduce((a, o) => a + o.priceDeltaCents, 0);
    return s + (item.priceCents + delta) * l.quantity;
  }, 0);

  const confirmTicket = () =>
    start(async () => {
      const r = await backEnterTicketAction({
        idempotencyKey: key,
        paperDate,
        method,
        lines: ticket.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, modifierKeys: l.modifierKeys })),
      }).catch(() => ({ ok: false as const, error: "generic" }));
      if (r.ok) {
        setMsg(t("entered", { total: formatEuro(r.totalCents) }));
        setTicket([]);
        setText("");
        setKey(crypto.randomUUID());
      } else setMsg(t(`errors.${["no-shift", "invalid", "missing-required", "unavailable-item"].includes(r.error) ? r.error : "generic"}` as "errors.generic"));
    });

  return (
    <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2">
      <section>
        <h1 className="font-serif text-[2rem] font-light">{t("title")}</h1>
        <p className="mt-2 max-w-[48ch] text-sumi/80">{t("intro")}</p>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t("title")}>
          {canReceive ? (
            <button type="button" aria-pressed={mode === "delivery"} onClick={() => setMode("delivery")} className={tab(mode === "delivery")}>
              {t("delivery")}
            </button>
          ) : null}
          <button type="button" aria-pressed={mode === "ticket"} onClick={() => setMode("ticket")} className={tab(mode === "ticket")}>
            {t("ticket")}
          </button>
        </div>

        {mode === "delivery" ? (
          orders.length ? (
            <div className="mt-6">
              <label htmlFor="scan-po" className="block text-sm text-sumi/80">
                {t("whichOrder")}
              </label>
              <select id="scan-po" value={poId ?? ""} onChange={(e) => setPoId(Number(e.target.value))} className={`${box} mt-2 w-full cursor-pointer`}>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} · {o.supplier}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="mt-6 text-sumi/80">{t("noOrders")}</p>
          )
        ) : !hasShift ? (
          <p className="mt-6 text-sumi/80">{t("errors.no-shift")}</p>
        ) : null}

        {(mode === "delivery" && po) || (mode === "ticket" && hasShift) ? (
          <div className="mt-8">
            <label className={`${primary} inline-flex cursor-pointer items-center justify-center`}>
              {progress != null ? t("reading", { progress }) : t("takePhoto")}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={progress != null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void read(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="mt-3 text-sm text-sumi/70">{t("privacy")}</p>
          </div>
        ) : null}

        {text ? (
          <details className="mt-8">
            <summary className="flex min-h-[44px] cursor-pointer items-center text-sm underline decoration-wood/60 underline-offset-4">{t("rawText")}</summary>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                apply(e.target.value);
              }}
              rows={10}
              className="mt-2 w-full rounded-[2px] border border-wood/50 bg-transparent p-3 font-mono text-sm"
            />
          </details>
        ) : null}
      </section>

      <section aria-live="polite">
        <h2 className="font-serif text-2xl font-light">{t("check")}</h2>
        <p className="mt-2 text-sm text-sumi/75">{t("checkHint")}</p>

        {mode === "delivery" && po ? (
          <div className="mt-6">
            <ul className="border-t border-wood/30">
              {po.lines.map((l) => (
                <li key={l.index} className="flex items-center justify-between gap-4 border-b border-wood/30 py-3">
                  <span>
                    {l.name}
                    <span className="block text-sm text-sumi/70">{t("ordered", { ordered: l.orderedPacks, received: l.receivedPacks })}</span>
                  </span>
                  <input
                    aria-label={t("packsFor", { name: l.name })}
                    inputMode="numeric"
                    value={packs[l.index] ?? ""}
                    placeholder="0"
                    onChange={(e) => setPacks((p) => ({ ...p, [l.index]: e.target.value.replace(/\D/g, "") }))}
                    className={`${box} w-24 text-right tabular-nums`}
                  />
                </li>
              ))}
            </ul>
            <button type="button" disabled={pending || !Object.values(packs).some((v) => Number(v) > 0)} onClick={confirmDelivery} className={`${primary} mt-6`}>
              {t("confirmDelivery")}
            </button>
          </div>
        ) : null}

        {mode === "ticket" && hasShift ? (
          <div className="mt-6">
            <ul className="border-t border-wood/30">
              {ticket.map((l) => {
                const item = items.get(l.menuItemId)!;
                return (
                  <li key={l.uid} className="flex flex-wrap items-center gap-3 border-b border-wood/30 py-3">
                    <select
                      aria-label={t("item")}
                      value={l.menuItemId}
                      onChange={(e) => {
                        const next = items.get(Number(e.target.value))!;
                        setTicket((ts) => ts.map((x) => (x.uid === l.uid ? { ...x, menuItemId: next.id, modifierKeys: defaultsFor(next, "") } : x)));
                      }}
                      className={`${box} min-w-0 flex-1 cursor-pointer`}
                    >
                      {catalog.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    {item.groups
                      .filter((g) => g.required && g.selection === "single")
                      .map((g) => (
                        <select
                          key={g.slug}
                          aria-label={g.label}
                          value={l.modifierKeys.find((k) => g.options.some((o) => o.key === k)) ?? ""}
                          onChange={(e) =>
                            setTicket((ts) =>
                              ts.map((x) =>
                                x.uid === l.uid
                                  ? { ...x, modifierKeys: [...x.modifierKeys.filter((k) => !g.options.some((o) => o.key === k)), e.target.value] }
                                  : x,
                              ),
                            )
                          }
                          className={`${box} cursor-pointer`}
                        >
                          {g.options.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ))}
                    <input
                      aria-label={t("quantity")}
                      inputMode="numeric"
                      value={l.quantity}
                      onChange={(e) => setTicket((ts) => ts.map((x) => (x.uid === l.uid ? { ...x, quantity: Math.max(1, Math.min(20, Number(e.target.value.replace(/\D/g, "")) || 1)) } : x)))}
                      className={`${box} w-20 text-right tabular-nums`}
                    />
                    <button
                      type="button"
                      aria-label={t("remove")}
                      onClick={() => setTicket((ts) => ts.filter((x) => x.uid !== l.uid))}
                      className="min-h-[48px] px-3 text-sm underline decoration-wood/60 underline-offset-4"
                    >
                      {t("remove")}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => catalog[0] && setTicket((ts) => [...ts, { uid: crypto.randomUUID(), menuItemId: catalog[0].id, quantity: 1, modifierKeys: defaultsFor(catalog[0], "") }])}
              className="mt-3 min-h-[48px] text-sm underline decoration-wood/60 underline-offset-4"
            >
              {t("addLine")}
            </button>
            <div className="mt-6 flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="paper-date" className="block text-sm text-sumi/80">
                  {t("paperDate")}
                </label>
                <input id="paper-date" type="date" max={today()} value={paperDate} onChange={(e) => setPaperDate(e.target.value)} className={`${box} mt-2`} />
              </div>
              <div className="flex gap-2" role="group" aria-label={t("paidWith")}>
                {(["cash", "card_terminal"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={tab(method === m)}>
                    {t(m === "cash" ? "cash" : "card")}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-6 flex items-baseline justify-between border-t border-wood/30 pt-4">
              <span>{t("total")}</span>
              <span className="font-serif text-[2rem] font-light tabular-nums">{formatEuro(ticketTotal)}</span>
            </p>
            <button type="button" disabled={pending || ticket.length === 0} onClick={confirmTicket} className={`${primary} mt-4`}>
              {t("confirmTicket")}
            </button>
          </div>
        ) : null}

        <p role="status" className="mt-4 min-h-[1.5rem] text-sm">
          {msg}
        </p>
      </section>
    </div>
  );
}

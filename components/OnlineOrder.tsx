"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { placeOrderAction } from "@/app/[locale]/(site)/pedir/actions";
import { formatEuro } from "@/lib/money";
import { priceLine, type CatalogItem, type LineInput } from "@/lib/pos/pricing";
import type { Slot } from "@/lib/slots";

type Line = { uid: string; item: CatalogItem; quantity: number; modifierKeys: string[] };
const KNOWN = ["closed", "slot-full", "invalid", "rate-limited", "missing-required", "unavailable-item", "unavailable-option"];

const unitOf = (l: Line) =>
  l.item.priceCents +
  l.item.groups.flatMap((g) => g.options).filter((o) => l.modifierKeys.includes(o.key)).reduce((s, o) => s + o.priceDeltaCents, 0);
const summaryOf = (l: Line) =>
  l.item.groups.flatMap((g) => g.options).filter((o) => l.modifierKeys.includes(o.key)).map((o) => o.label).join(" · ");

const field =
  "mt-2 block min-h-[48px] w-full border-b border-wood/40 bg-transparent py-2 text-base text-sumi placeholder:text-sumi/60 focus:border-sumi";

/**
 * The web order, mobile first: carta as hairline rows, options in a sheet,
 * pickup time, details, and pay at pickup or by card (Stripe). Prices shown
 * are for the eye; the server prices the order again.
 */
export function OnlineOrder({
  catalog,
  slots,
  stripe,
  initialLines = [],
}: {
  catalog: CatalogItem[];
  slots: Slot[];
  stripe: boolean;
  initialLines?: LineInput[];
}) {
  const t = useTranslations("order");
  const locale = useLocale() as "es" | "en";
  const [lines, setLines] = useState<Line[]>(() =>
    initialLines.flatMap((l, i) => {
      const item = catalog.find((c) => c.id === l.menuItemId);
      return item ? [{ uid: `recipe-${i}`, item, quantity: l.quantity, modifierKeys: l.modifierKeys }] : [];
    }),
  );
  const [sheet, setSheet] = useState<Line | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(slots.find((s) => s.available)?.start ?? null);
  const [payOnline, setPayOnline] = useState(stripe);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const key = useRef(crypto.randomUUID());
  const checkoutRef = useRef<HTMLDivElement>(null);
  // The phone bar steps aside once the checkout is on screen, so it can
  // never sit over a field (or over the keyboard).
  const [checkoutSeen, setCheckoutSeen] = useState(false);
  useEffect(() => {
    const el = checkoutRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCheckoutSeen(e.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const categories = useMemo(() => [...new Set(catalog.map((i) => i.category))], [catalog]);
  const total = lines.reduce((s, l) => s + unitOf(l) * l.quantity, 0);
  const days = useMemo(() => [...new Set(slots.map((s) => s.day))], [slots]);
  const todayMadrid = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()), []);

  const open = (item: CatalogItem) => {
    if (!item.available) return;
    const keys = item.groups.filter((g) => g.required && g.selection === "single").map((g) => g.options.find((o) => o.available)?.key ?? "").filter(Boolean);
    const draft = { uid: crypto.randomUUID(), item, quantity: 1, modifierKeys: keys };
    if (item.groups.length === 0) setLines((ls) => [...ls, draft]);
    else {
      setMissing(null);
      setSheet(draft);
    }
  };

  const toggle = (slug: string, key2: string) => {
    if (!sheet) return;
    const g = sheet.item.groups.find((x) => x.slug === slug)!;
    const inGroup = new Set(g.options.map((o) => o.key));
    const others = sheet.modifierKeys.filter((k) => !inGroup.has(k));
    const cur = sheet.modifierKeys.filter((k) => inGroup.has(k));
    const next =
      g.selection === "single"
        ? cur.includes(key2) && !g.required
          ? others
          : [...others, key2]
        : cur.includes(key2)
          ? [...others, ...cur.filter((k) => k !== key2)]
          : [...others, ...cur, key2];
    setSheet({ ...sheet, modifierKeys: next });
  };

  const confirm = () => {
    if (!sheet) return;
    const r = priceLine(new Map([[sheet.item.id, sheet.item]]), { menuItemId: sheet.item.id, quantity: sheet.quantity, modifierKeys: sheet.modifierKeys });
    if (!r.ok) {
      const g = sheet.item.groups.find((x) => x.required && !x.options.some((o) => sheet.modifierKeys.includes(o.key)));
      setMissing(g ? t("chooseRequired", { group: g.label.toLowerCase() }) : null);
      return;
    }
    setLines((ls) => [...ls, sheet]);
    setSheet(null);
  };

  const submit = (form: FormData) =>
    start(async () => {
      setError(null);
      if (!slot) return;
      try {
        const r = await placeOrderAction({
          idempotencyKey: key.current,
          locale,
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? "") || null,
          note: String(form.get("note") ?? "") || null,
          pickupAt: slot,
          payOnline,
          lines: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity, modifierKeys: l.modifierKeys })),
        });
        if (r.ok) window.location.assign(r.redirect);
        else setError(t(`errors.${KNOWN.includes(r.error) ? r.error : "generic"}` as "errors.generic"));
      } catch {
        setError(t("errors.generic"));
      }
    });

  return (
    <div className="grid grid-cols-1 gap-14 pb-24 md:grid-cols-[minmax(0,1fr)_22rem] md:gap-16 md:pb-0">
      <div className="space-y-12">
        {categories.map((c) => (
          <section key={c} aria-labelledby={`oc-${c}`}>
            <h2 id={`oc-${c}`} className="text-eyebrow font-medium uppercase text-sumi/70">
              {c}
            </h2>
            <ul className="mt-4 border-t border-wood/25">
              {catalog
                .filter((i) => i.category === c)
                .map((item) => (
                  <li key={item.id} className="border-b border-wood/25">
                    <button
                      type="button"
                      disabled={!item.available}
                      onClick={() => open(item)}
                      className="flex min-h-[64px] w-full items-center justify-between gap-4 py-4 text-left disabled:opacity-55"
                    >
                      <span className="flex items-center gap-3 font-serif text-xl font-light">
                        <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full ring-1 ring-sumi/20" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="shrink-0 text-sumi/80 tabular-nums">
                        {item.available ? formatEuro(item.priceCents, locale) : t("soldOut")}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      <div ref={checkoutRef} id="tu-pedido" className="scroll-mt-24 md:sticky md:top-24 md:self-start">
        <h2 className="font-serif text-2xl font-light">{t("yourOrder")}</h2>
        {lines.length === 0 ? <p className="mt-3 text-sumi/70">{t("empty")}</p> : null}
        <ul className="mt-3">
          {lines.map((l) => (
            <li key={l.uid} className="flex items-start justify-between gap-3 border-b border-wood/25 py-3">
              <div className="min-w-0">
                <p>
                  {l.quantity} × {l.item.name}
                </p>
                {summaryOf(l) ? <p className="text-sm text-sumi/70">{summaryOf(l)}</p> : null}
              </div>
              <div className="flex shrink-0 items-center">
                <span className="tabular-nums">{formatEuro(unitOf(l) * l.quantity, locale)}</span>
                <button
                  type="button"
                  aria-label={t("remove", { name: l.item.name })}
                  onClick={() => setLines((ls) => ls.filter((x) => x.uid !== l.uid))}
                  className="flex h-11 w-11 items-center justify-center text-sumi/60"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d="M4 4l12 12M16 4L4 16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
        {lines.length ? (
          <>
            <p className="mt-4 flex items-baseline justify-between">
              <span>{t("total")}</span>
              <span className="font-serif text-2xl tabular-nums">{formatEuro(total, locale)}</span>
            </p>

            <form action={submit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="o-slot" className="text-eyebrow uppercase text-sumi/70">
                  {t("pickup")}
                </label>
                {slots.some((x) => x.available) ? (
                  <select
                    id="o-slot"
                    value={slot ?? ""}
                    onChange={(e) => setSlot(e.target.value)}
                    className={`${field} cursor-pointer tabular-nums`}
                  >
                    {days.map((d) => (
                      <optgroup key={d} label={d === todayMadrid ? t("today") : t("tomorrow")}>
                        {slots
                          .filter((x) => x.day === d)
                          .map((x) => (
                            <option key={x.start} value={x.start} disabled={!x.available}>
                              {(d === todayMadrid ? t("today") : t("tomorrow")) + ", " + x.label + (x.available ? "" : ` · ${t("full")}`)}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <p className="mt-3 text-sumi/80">{t("noSlots")}</p>
                )}
              </div>

              <div>
                <label htmlFor="o-name" className="text-eyebrow uppercase text-sumi/70">
                  {t("name")}
                </label>
                <input id="o-name" name="name" required autoComplete="name" autoCapitalize="words" enterKeyHint="next" className={field} />
              </div>
              <div>
                <label htmlFor="o-email" className="text-eyebrow uppercase text-sumi/70">
                  {t("email")}
                </label>
                <input id="o-email" name="email" type="email" inputMode="email" required autoComplete="email" enterKeyHint="next" aria-describedby="o-email-hint" className={field} />
                <p id="o-email-hint" className="mt-1.5 text-sm text-sumi/70">
                  {t("emailHint")}
                </p>
              </div>
              <div>
                <label htmlFor="o-phone" className="text-eyebrow uppercase text-sumi/70">
                  {t("phone")}
                </label>
                <input id="o-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" className={field} />
              </div>
              <div>
                <label htmlFor="o-note" className="text-eyebrow uppercase text-sumi/70">
                  {t("note")}
                </label>
                <input id="o-note" name="note" maxLength={140} enterKeyHint="done" className={field} />
              </div>

              {stripe ? (
                <fieldset className="space-y-2">
                  {[
                    { v: true, label: t("payOnline") },
                    { v: false, label: t("payAtPickup") },
                  ].map((o) => (
                    <label key={String(o.v)} className="flex min-h-[44px] cursor-pointer items-center gap-3">
                      <input type="radio" name="pay" checked={payOnline === o.v} onChange={() => setPayOnline(o.v)} className="size-5 accent-sumi" />
                      {o.label}
                    </label>
                  ))}
                </fieldset>
              ) : null}

              <p role="status" className="min-h-[1.25rem] text-sm text-sumi">
                {error}
              </p>
              <button
                type="submit"
                disabled={pending || !slot}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[2px] bg-sumi px-7 text-sm font-medium tracking-wide text-washi disabled:opacity-40"
              >
                {pending ? t("sending") : payOnline && stripe ? t("submitPay", { total: formatEuro(total, locale) }) : t("submitPickup")}
              </button>
              <p className="text-sm text-sumi/70">{t("legal")}</p>
            </form>
          </>
        ) : null}
      </div>

      {/* Phones: the order stays in reach. */}
      {lines.length && !sheet && !checkoutSeen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-wood/30 bg-washi px-6 py-3 md:hidden">
          <a href="#tu-pedido" className="flex min-h-[48px] items-center justify-between">
            <span>
              {t("yourOrder")} · {lines.reduce((s, l) => s + l.quantity, 0)}
            </span>
            <span className="font-serif text-xl tabular-nums">{formatEuro(total, locale)}</span>
          </a>
        </div>
      ) : null}

      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-sumi/25 sm:items-center sm:p-6" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="o-sheet"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-xl flex-col bg-washi sm:rounded-[2px]"
          >
            <div className="flex items-start justify-between border-b border-wood/30 px-6 pb-3 pt-5">
              <h2 id="o-sheet" className="font-serif text-2xl font-light">
                {sheet.item.name}
              </h2>
              <button type="button" onClick={() => setSheet(null)} aria-label={t("close")} className="flex h-11 w-11 items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" />
                </svg>
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {sheet.item.groups.map((g) => (
                <fieldset key={g.slug}>
                  <legend className="mb-2 text-sm text-sumi/75">
                    {g.label}
                    {g.required ? ` · ${t("required")}` : g.selection === "multiple" ? ` · ${t("multiple")}` : ""}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((o) => {
                      const on = sheet.modifierKeys.includes(o.key);
                      return (
                        <button
                          key={o.key}
                          type="button"
                          disabled={!o.available}
                          aria-pressed={on}
                          onClick={() => toggle(g.slug, o.key)}
                          className={`min-h-[44px] rounded-[2px] border px-3 text-sm ${on ? "border-sumi bg-sumi text-washi" : "border-wood/45"} disabled:border-dashed disabled:opacity-50`}
                        >
                          {o.label}
                          {o.priceDeltaCents ? ` · +${formatEuro(o.priceDeltaCents, locale)}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <p role="status" className="min-h-[1.25rem] text-sm text-sumi">
                {missing}
              </p>
            </div>
            <div className="border-t border-wood/30 px-6 py-4">
              <button
                type="button"
                onClick={confirm}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[2px] bg-sumi text-sm font-medium tracking-wide text-washi"
              >
                {t("add", { price: formatEuro(unitOf(sheet), locale) })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

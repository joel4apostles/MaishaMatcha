"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { placeOrderAction } from "@/app/[locale]/(site)/pedir/actions";
import { BrandMark } from "@/components/BrandMark";
import { formatEuro } from "@/lib/money";
import { priceLine, type CatalogItem, type LineInput } from "@/lib/pos/pricing";
import type { Slot } from "@/lib/slots";
import { Link } from "@/i18n/navigation";
import { productSlug, restoreLines } from "@/lib/shop";
import { Numeral } from "@/components/Numeral";
import { useHumanCheck } from "@/components/HumanCheck";

type Line = { uid: string; item: CatalogItem; quantity: number; modifierKeys: string[] };
/** Section markers, as on the carta: kanji numerals in the brush face. */
const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八"];
const KNOWN = ["closed", "too-many", "too-many-units", "pay-online", "slot-full", "invalid", "rate-limited", "missing-required", "unavailable-item", "unavailable-option", "challenge"];

const unitOf = (l: Line) =>
  l.item.priceCents +
  l.item.groups.flatMap((g) => g.options).filter((o) => l.modifierKeys.includes(o.key)).reduce((s, o) => s + o.priceDeltaCents, 0);
const summaryOf = (l: Line) =>
  l.item.groups.flatMap((g) => g.options).filter((o) => l.modifierKeys.includes(o.key)).map((o) => o.label).join(" · ");

const LATTE_KEYS = new Set(["prep.latte", "prep.te-latte"]);
/** Milk only makes sense in a latte: hide it (and drop it) otherwise. */
const milkApplies = (keys: string[]) => keys.some((k) => LATTE_KEYS.has(k));
const visibleGroups = (l: Line) => l.item.groups.filter((g) => g.slug !== "leche" || milkApplies(l.modifierKeys));

const field =
  "mt-2 block min-h-[48px] w-full border-b border-sumi/50 bg-transparent py-2 text-base text-sumi placeholder:text-sumi/60 focus:border-sumi";

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
  usual = [],
  customer = null,
  variant = "carta",
  table = null,
}: {
  catalog: CatalogItem[];
  slots: Slot[];
  stripe: boolean;
  initialLines?: LineInput[];
  /** "Lo de siempre": a signed-in member's last order, already re-priced. */
  usual?: LineInput[];
  customer?: { name: string; email: string } | null;
  /** "shop": products as photo cards (the tienda); "carta": hairline rows. */
  variant?: "carta" | "shop";
  /** Ordered from a table's QR: no pickup time, served at the table. */
  table?: number | null;
}) {
  const t = useTranslations("order");
  const human = useHumanCheck(useLocale() === "en" ? "en" : "es");
  const locale = useLocale() as "es" | "en";
  const [lines, setLines] = useState<Line[]>(() =>
    initialLines.flatMap((l, i) => {
      const item = catalog.find((c) => c.id === l.menuItemId);
      return item ? [{ uid: `recipe-${i}`, item, quantity: l.quantity, modifierKeys: l.modifierKeys }] : [];
    }),
  );
  // The shop basket follows the visitor between the shop and product pages
  // (this tab only), always re-checked against today's stock and prices.
  const persistKey = variant === "shop" ? "maisha.shop.basket" : null;
  const [restored, setRestored] = useState(persistKey == null);
  const restoreOnce = useRef(false);
  useEffect(() => {
    // Once per mount, even when effects run twice (React strict mode).
    if (!persistKey || restoreOnce.current) return;
    restoreOnce.current = true;
    try {
      const saved = restoreLines(JSON.parse(sessionStorage.getItem(persistKey) ?? "[]"), catalog);
      if (saved.length)
        // Restoring from storage can only happen after mount (no storage on the server).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLines((ls) => {
          const next = [...ls];
          for (const s2 of saved) {
            const item = catalog.find((c) => c.id === s2.menuItemId)!;
            const same = next.findIndex((l) => l.item.id === item.id);
            if (same >= 0) next[same] = { ...next[same], quantity: Math.min(5, next[same].quantity + s2.quantity) };
            else next.push({ uid: crypto.randomUUID(), item, quantity: s2.quantity, modifierKeys: [] });
          }
          return next;
        });
      // A product page sent "?add=": drop it so a reload does not add again.
      if (new URLSearchParams(window.location.search).has("add")) window.history.replaceState(null, "", window.location.pathname + "#tu-pedido");
    } catch {
      // Storage blocked (private mode): the basket simply lives on this page.
    }
    setRestored(true);
  }, [persistKey, catalog]);
  useEffect(() => {
    if (!persistKey || !restored) return;
    try {
      sessionStorage.setItem(persistKey, JSON.stringify(lines.map((l) => ({ id: l.item.id, q: l.quantity }))));
    } catch {
      // ignore
    }
  }, [lines, restored, persistKey]);
  const [sheet, setSheet] = useState<Line | null>(null);
  const usualLines = useMemo(
    () =>
      usual.flatMap((l, i) => {
        const item = catalog.find((c) => c.id === l.menuItemId);
        return item ? [{ uid: `usual-${i}`, item, quantity: l.quantity, modifierKeys: l.modifierKeys }] : [];
      }),
    [usual, catalog],
  );
  const [usualUids, setUsualUids] = useState<string[]>([]);
  const [announce, setAnnounce] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
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
  const usualAdded = usualUids.length > 0 && lines.some((l) => usualUids.includes(l.uid));
  const total = lines.reduce((s, l) => s + unitOf(l) * l.quantity, 0);
  // Shop products are paid online whenever card payment is on.
  const hasShopItem = stripe && lines.some((l) => l.item.shop);
  const days = useMemo(() => [...new Set(slots.map((s) => s.day))], [slots]);
  const todayMadrid = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()), []);

  const open = (item: CatalogItem) => {
    if (!item.available) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const keys = item.groups.filter((g) => g.required && g.selection === "single").map((g) => g.options.find((o) => o.available)?.key ?? "").filter(Boolean);
    const draft = { uid: crypto.randomUUID(), item, quantity: 1, modifierKeys: keys };
    if (item.groups.length === 0) {
      setLines((ls) => {
        // The same plain product twice is one line with quantity 2.
        const same = ls.find((l) => l.item.id === item.id && l.modifierKeys.length === 0);
        return same ? ls.map((l) => (l === same ? { ...l, quantity: Math.min(l.quantity + 1, item.shop ? 5 : 20) } : l)) : [...ls, draft];
      });
      setAnnounce(t("addedLine", { name: item.name, price: formatEuro(item.priceCents, locale) }));
    } else {
      setMissing(null);
      setSheet(draft);
    }
  };

  const closeSheet = () => {
    setSheet(null);
    openerRef.current?.focus();
  };

  // The sheet is a real modal: focus inside, Tab kept in, Escape closes,
  // the page behind does not scroll, focus returns to the row after.
  const sheetOpen = sheet != null;
  useEffect(() => {
    if (!sheetOpen) return;
    const root = dialogRef.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSheet(null);
        openerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex=\"0\"]")];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

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
    let keys = next;
    const milk = sheet.item.groups.find((x) => x.slug === "leche");
    if (milk) {
      const milkKeys = new Set(milk.options.map((o) => o.key));
      if (!milkApplies(keys)) keys = keys.filter((k) => !milkKeys.has(k));
      else if (!keys.some((k) => milkKeys.has(k))) {
        const first = milk.options.find((o) => o.available);
        if (first) keys = [...keys, first.key];
      }
    }
    setSheet({ ...sheet, modifierKeys: keys });
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
    setAnnounce(t("addedLine", { name: sheet.item.name, price: formatEuro(unitOf(sheet) * sheet.quantity, locale) }));
    closeSheet();
  };

  const submit = (form: FormData) =>
    start(async () => {
      setError(null);
      if (!slot && table == null) return;
      try {
        const r = await placeOrderAction({
          idempotencyKey: key.current,
          locale,
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? "") || null,
          note: String(form.get("note") ?? "") || null,
          pickupAt: table == null ? slot : null,
          table,
          payOnline: payOnline || hasShopItem,
          lines: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity, modifierKeys: l.modifierKeys })),
          turnstile: human.token,
        });
        human.reset();
        if (r.ok) {
          if (persistKey) {
            try {
              sessionStorage.removeItem(persistKey);
            } catch {
              // ignore
            }
          }
          window.location.assign(r.redirect);
        }
        else setError(t(`errors.${KNOWN.includes(r.error) ? r.error : "generic"}` as "errors.generic"));
      } catch {
        setError(t("errors.generic"));
      }
    });

  return (
    <div className="grid grid-cols-1 gap-14 pb-24 md:grid-cols-[minmax(0,1fr)_22rem] md:gap-16 md:pb-0">
      <div className="space-y-16">
        {variant === "carta" && usualLines.length ? (
          <section aria-labelledby="oc-usual" className="brand-band rounded-[2px] bg-matcha p-2.5">
            <div className="rounded-[1px] border border-sumi/25 px-6 py-6 sm:px-8">
              <h2 id="oc-usual" className="text-eyebrow uppercase text-sumi/85">{t("usualEyebrow")}</h2>
              <ul className="mt-4 space-y-1.5">
                {usualLines.map((l) => (
                  <li key={l.uid} className="font-serif text-xl font-light text-sumi">
                    {l.quantity > 1 ? `${l.quantity} × ` : ""}
                    {l.item.name}
                    {summaryOf(l) ? <span className="font-sans text-base text-sumi/85"> · {summaryOf(l)}</span> : null}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  disabled={usualAdded}
                  onClick={() => {
                    const added = usualLines.map((l) => ({ ...l, uid: crypto.randomUUID() }));
                    setLines((ls) => [...ls, ...added]);
                    setUsualUids(added.map((l) => l.uid));
                    setAnnounce(t("usualAdded"));
                  }}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-[2px] bg-sumi px-6 text-sm font-medium tracking-wide text-washi disabled:opacity-60"
                >
                  {t("usualAdd", { price: formatEuro(usualLines.reduce((s, l) => s + unitOf(l) * l.quantity, 0), locale) })}
                </button>
                <p role="status" className="text-sm text-sumi">{usualAdded ? t("usualAdded") : ""}</p>
              </div>
            </div>
          </section>
        ) : null}
        {categories.map((c, ci) => (
          <section key={c} aria-labelledby={`oc-${ci}`}>
            <h2 id={`oc-${ci}`} className="flex items-center gap-3 text-eyebrow uppercase text-sumi/70">
              {variant === "carta" ? (
                <Numeral>{NUMERALS[ci] ?? ""}</Numeral>
              ) : null}
              {c}
            </h2>
            {variant === "shop" ? (
              <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
                {catalog
                  .filter((i) => i.category === c)
                  .map((item) => (
                    <li key={item.id} className="group flex flex-col">
                      <Link
                        href={{ pathname: "/tienda/[slug]", params: { slug: productSlug(item.name) } }}
                        aria-label={item.name}
                        className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[2px] bg-sumi/[0.03]"
                      >
                        {item.photo ? (
                          <Image
                            src={item.photo.url}
                            alt={item.photo.alt}
                            fill
                            unoptimized={/^https?:/.test(item.photo.url)}
                            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <BrandMark className="w-10 text-wood/30" />
                        )}
                      </Link>
                      <div className="mt-4 flex items-baseline justify-between gap-4">
                        <h3 className="font-serif text-[1.4rem] font-light leading-tight">
                          <Link href={{ pathname: "/tienda/[slug]", params: { slug: productSlug(item.name) } }} className="hover:underline hover:decoration-wood/60 hover:underline-offset-4">
                            {item.name}
                          </Link>
                        </h3>
                        <span className="shrink-0 text-sumi/80 tabular-nums">{formatEuro(item.priceCents, locale)}</span>
                      </div>
                      {item.description ? <p className="mt-2 text-sm text-sumi/75">{item.description}</p> : null}
                      <button
                        type="button"
                        disabled={!item.available}
                        onClick={() => open(item)}
                        className="mt-4 inline-flex min-h-[44px] w-fit items-center justify-center rounded-[2px] border border-wood/50 px-5 text-sm font-medium text-sumi hover:border-sumi/60 disabled:opacity-50"
                      >
                        {item.available ? t("addShort") : t("soldOut")}
                      </button>
                    </li>
                  ))}
              </ul>
            ) : (
            <ul className="mt-6 border-t border-wood/35">
              {catalog
                .filter((i) => i.category === c)
                .map((item) => (
                  <li key={item.id} className="border-b border-wood/30">
                    <button
                      type="button"
                      disabled={!item.available}
                      onClick={() => open(item)}
                      className="group grid min-h-[72px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 py-5 text-left disabled:opacity-55 sm:gap-x-5"
                    >
                      <span aria-hidden="true" className="size-9 shrink-0 rounded-full ring-1 ring-sumi/15" style={{ backgroundColor: item.color }} />
                      <span className="min-w-0">
                        <span className="block font-serif text-[1.5rem] font-light leading-tight text-sumi">{item.name}</span>
                        {item.description ? <span className="mt-1 block text-sm text-sumi/75">{item.description}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-sumi/85 tabular-nums">{item.available ? formatEuro(item.priceCents, locale) : t("soldOut")}</span>
                        {item.available ? (
                          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border border-sumi/40 text-sumi transition-colors group-hover:border-sumi group-hover:bg-sumi group-hover:text-washi">
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 10h12M10 4v12" /></svg>
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            )}
          </section>
        ))}
      </div>

      <div ref={checkoutRef} id="tu-pedido" className="scroll-mt-24 border-t border-wood/35 pt-8 md:sticky md:top-24 md:self-start md:border md:px-7 md:pb-7">
        <h2 className="font-serif text-[1.75rem] font-light">{t("yourOrder")}</h2>
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
              <div className="flex shrink-0 flex-col items-end">
                <span className="tabular-nums text-sumi/70">{formatEuro(unitOf(l) * l.quantity, locale)}</span>
                <div className="-mr-3 flex items-center">
                  <button
                    type="button"
                    aria-label={l.quantity > 1 ? t("less", { name: l.item.name }) : t("remove", { name: l.item.name })}
                    onClick={() =>
                      setLines((ls) =>
                        l.quantity > 1 ? ls.map((x) => (x.uid === l.uid ? { ...x, quantity: x.quantity - 1 } : x)) : ls.filter((x) => x.uid !== l.uid),
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center text-sumi/80"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M4 10h12" />
                    </svg>
                  </button>
                  <span className="w-5 text-center text-sm tabular-nums" aria-hidden="true">{l.quantity}</span>
                  <button
                    type="button"
                    aria-label={t("more", { name: l.item.name })}
                    disabled={l.quantity >= (l.item.shop ? 5 : 20)}
                    onClick={() => setLines((ls) => ls.map((x) => (x.uid === l.uid ? { ...x, quantity: x.quantity + 1 } : x)))}
                    className="flex h-11 w-11 items-center justify-center text-sumi/80 disabled:opacity-40"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M4 10h12M10 4v12" />
                    </svg>
                  </button>
                </div>
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
              {table != null ? (
                <p className="text-eyebrow uppercase text-sumi/70">{t("tableServed", { table })}</p>
              ) : (
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
              )}

              <div>
                <label htmlFor="o-name" className="text-eyebrow uppercase text-sumi/70">
                  {t("name")}
                </label>
                <input id="o-name" name="name" defaultValue={customer?.name} required autoComplete="name" autoCapitalize="words" enterKeyHint="next" className={field} />
              </div>
              <div>
                <label htmlFor="o-email" className="text-eyebrow uppercase text-sumi/70">
                  {t("email")}
                </label>
                <input id="o-email" name="email" defaultValue={customer?.email} type="email" inputMode="email" required autoComplete="email" enterKeyHint="next" aria-describedby="o-email-hint" className={field} />
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
                      <input
                        type="radio"
                        name="pay"
                        checked={(payOnline || hasShopItem) === o.v}
                        disabled={!o.v && hasShopItem}
                        onChange={() => setPayOnline(o.v)}
                        className="size-5 accent-sumi"
                      />
                      {o.label}
                    </label>
                  ))}
                  {hasShopItem ? <p className="text-sm text-sumi/70">{t("shopPaysOnline")}</p> : null}
                </fieldset>
              ) : null}

              {human.box}
              <p role="status" className="min-h-[1.25rem] text-sm text-sumi">
                {error}
              </p>
              <button
                type="submit"
                disabled={pending || (!slot && table == null)}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[2px] bg-sumi px-7 text-sm font-medium tracking-wide text-washi disabled:opacity-40"
              >
                {pending ? t("sending") : (payOnline || hasShopItem) && stripe ? t("submitPay", { total: formatEuro(total, locale) }) : t("submitPickup")}
              </button>
              <p className="text-sm text-sumi/70">{t("legal")}</p>
            </form>
          </>
        ) : null}
      </div>

      {/* Phones: the order stays in reach. */}
      {lines.length && !sheet && !checkoutSeen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-wood/30 bg-washi px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
          <a href="#tu-pedido" className="flex min-h-[48px] items-center justify-between">
            <span>
              {t("yourOrder")} · {lines.reduce((s, l) => s + l.quantity, 0)}
            </span>
            <span className="font-serif text-xl tabular-nums">{formatEuro(total, locale)}</span>
          </a>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>

      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-sumi/25 sm:items-center sm:p-6" onClick={closeSheet}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="o-sheet"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-xl flex-col bg-washi sm:rounded-[2px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-wood/30 px-6 pb-4 pt-6">
              <div className="flex min-w-0 items-center gap-4">
                <span aria-hidden="true" className="size-10 shrink-0 rounded-full ring-1 ring-sumi/15" style={{ backgroundColor: sheet.item.color }} />
                <div className="min-w-0">
                  <h2 id="o-sheet" className="font-serif text-[1.75rem] font-light leading-tight">
                    {sheet.item.name}
                  </h2>
                  {sheet.item.description ? <p className="mt-1 text-sm text-sumi/75">{sheet.item.description}</p> : null}
                </div>
              </div>
              <button type="button" data-autofocus onClick={closeSheet} aria-label={t("close")} className="flex h-11 w-11 shrink-0 items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" />
                </svg>
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {visibleGroups(sheet).map((g) => (
                <fieldset key={g.slug}>
                  <legend className="mb-3 text-eyebrow uppercase text-sumi/70">
                    {g.label}
                    {g.required ? "" : g.selection === "multiple" ? ` · ${t("multiple")}` : ""}
                  </legend>
                  {g.selection === "single" ? (
                    <div
                      role="radiogroup"
                      aria-label={g.label}
                      className="grid grid-cols-2 gap-2.5"
                      onKeyDown={(e) => {
                        // Arrow keys move the choice, as in a native radio group.
                        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                        if (!step) return;
                        e.preventDefault();
                        const opts = g.options.filter((o) => o.available);
                        const cur = opts.findIndex((o) => sheet.modifierKeys.includes(o.key));
                        const next = opts[(cur + step + opts.length) % opts.length];
                        if (!next) return;
                        toggle(g.slug, next.key);
                        requestAnimationFrame(() => (e.currentTarget.querySelector(`[data-key="${next.key}"]`) as HTMLElement | null)?.focus());
                      }}
                    >
                      {g.options.map((o, oi) => {
                        const on = sheet.modifierKeys.includes(o.key);
                        const anyOn = g.options.some((x) => sheet.modifierKeys.includes(x.key));
                        return (
                          <button
                            key={o.key}
                            data-key={o.key}
                            type="button"
                            role="radio"
                            disabled={!o.available}
                            aria-checked={on}
                            tabIndex={on || (!anyOn && oi === 0) ? 0 : -1}
                            onClick={() => toggle(g.slug, o.key)}
                            className={`flex min-h-[56px] flex-col items-start justify-center rounded-[2px] border px-4 py-2 text-left transition-colors ${on ? "border-sumi bg-sumi text-washi" : "border-sumi/30 text-sumi hover:border-sumi/70"} disabled:border-dashed disabled:opacity-50`}
                          >
                            <span>{o.label}</span>
                            {o.priceDeltaCents ? <span className="text-sm opacity-80 tabular-nums">+{formatEuro(o.priceDeltaCents, locale)}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border-t border-wood/30">
                      {g.options.map((o) => {
                        const on = sheet.modifierKeys.includes(o.key);
                        return (
                          <button
                            key={o.key}
                            type="button"
                            disabled={!o.available}
                            aria-pressed={on}
                            onClick={() => toggle(g.slug, o.key)}
                            className="grid min-h-[52px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-wood/30 text-left disabled:opacity-50"
                          >
                            <span aria-hidden="true" className={`grid size-5 place-items-center rounded-[2px] border ${on ? "border-sumi bg-sumi text-washi" : "border-sumi/45"}`}>
                              {on ? (
                                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 10.5l4 4 8-9" /></svg>
                              ) : null}
                            </span>
                            <span>{o.label}</span>
                            {o.priceDeltaCents ? <span className="text-sm text-sumi/75 tabular-nums">+{formatEuro(o.priceDeltaCents, locale)}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              ))}
              <p role="status" className="min-h-[1.25rem] text-sm text-sumi">
                {missing}
              </p>
            </div>
            <div className="border-t border-wood/30 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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

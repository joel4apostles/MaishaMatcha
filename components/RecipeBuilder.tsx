"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { quietLinkClass } from "@/components/Button";
import { PhotoDrink } from "@/components/PhotoDrink";
import type { Locale } from "@/i18n/routing";
import { itemSlug } from "@/lib/carta";
import { formatEuro } from "@/lib/money";
import {
  DEFAULT_RECIPE,
  type RecipeIds,
  blendColor,
  builderExtras,
  builderMilks,
  builderTeas,
  displayCode,
  fromParam,
  optionSuffix,
  prepOptionsFor,
  priceCents,
  resolveRecipe,
  toParam,
} from "@/lib/recipe";

const optionClass = (selected: boolean) =>
  `option-tile flex min-h-[56px] w-full cursor-pointer flex-col justify-center rounded-[2px] border px-4 py-3 transition-[border-color,background-color] duration-200 ease-out ${
    selected ? "border-sumi/60 bg-matcha/[0.06]" : "border-wood/40 hover:border-wood/70"
  }`;

function Step({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="flex flex-wrap items-baseline gap-x-3 text-eyebrow font-medium uppercase text-sumi/70">
        {title}
        {note ? <span className="normal-case tracking-normal text-sumi/70">{note}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-sumi/10"
      style={{ backgroundColor: color }}
    />
  );
}

/** "Ceremonial premium" from "Ceremonial premium. Dulzor natural, ..." */
const firstClause = (text: string) => text.split(".")[0];

export function RecipeBuilder() {
  const t = useTranslations("create");
  const cta = useTranslations("cta");
  const locale = useLocale() as Locale;
  const [ids, setIds] = useState<RecipeIds>(DEFAULT_RECIPE);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  // The phone price bar steps aside when the card itself or the footer is
  // on screen (never covers the card, the legal links or the locale switch).
  const [barHidden, setBarHidden] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only write to the URL after a real choice: a pristine visit or a shared
  // link must never have its address rewritten out from under it.
  const interacted = useRef(false);

  const choose = (updater: (s: RecipeIds) => RecipeIds) => {
    interacted.current = true;
    setIds(updater);
  };

  // Prefill from a shared link (?r=...). Read after hydration on purpose:
  // the page is statically rendered, so the server never sees the query.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("r");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL, an external system
    if (param) setIds(fromParam(param));
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection, client only
    setCanShare(typeof navigator.share === "function");
    const targets = [document.getElementById("receta"), document.querySelector("footer")].filter(
      (el): el is HTMLElement => el !== null,
    );
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setBarHidden(visible.size > 0);
    });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const recipe = useMemo(() => resolveRecipe(ids), [ids]);
  const price = formatEuro(priceCents(recipe), locale);
  const code = displayCode(recipe);
  const prep = prepOptionsFor(recipe.tea);

  useEffect(() => {
    // Canonical share URL: origin + localized path + the recipe, nothing else.
    const share = `${window.location.origin}${window.location.pathname}?r=${toParam(ids)}`;
    if (interacted.current) window.history.replaceState(null, "", share);

    let cancelled = false;
    import("qrcode-generator")
      .then(({ default: qrcode }) => {
        if (cancelled) return;
        const qr = qrcode(0, "M");
        qr.addData(share);
        qr.make();
        setQrSvg(qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true }));
      })
      .catch(() => {
        // Chunk failed to load: the bordered placeholder stays; code and link still work.
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  async function shareLink() {
    const share = `${window.location.origin}${window.location.pathname}?r=${toParam(ids)}`;
    if (canShare) {
      try {
        await navigator.share({ title: t("cardTitle"), text: displayCode(recipe), url: share });
        return;
      } catch {
        // Share sheet dismissed or unavailable: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable: the URL bar already holds the link.
    }
  }

  const chosen = [
    recipe.tea.name,
    recipe.prep.label[locale],
    recipe.milk?.label[locale],
    ...recipe.extras.map((e) => e.label[locale]),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="recipe-builder grid grid-cols-1 gap-12 pb-24 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:pb-0">
      <div className="space-y-10">
        <Step title={t("stepTea")}>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {builderTeas.map((tea) => {
              const slug = itemSlug(tea);
              return (
                <label key={slug} className={optionClass(ids.tea === slug)}>
                  <input
                    type="radio"
                    name="tea"
                    className="sr-only"
                    checked={ids.tea === slug}
                    onChange={() => choose((s) => ({ ...s, tea: slug }))}
                  />
                  <span className="flex items-center gap-3 font-serif text-xl text-sumi">
                    <Swatch color={tea.color} />
                    {tea.name}
                  </span>
                  <span className="mt-0.5 text-sm text-sumi/70">
                    {firstClause(tea.description[locale])} · {formatEuro(tea.priceCents, locale)}
                  </span>
                </label>
              );
            })}
          </div>
        </Step>

        <Step title={t("stepPrep")}>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["base", "latte"] as const).map((kind) => {
              const option = prep[kind];
              const note = option.note?.[locale];
              return (
                <label key={kind} className={optionClass(ids.prep === kind)}>
                  <input
                    type="radio"
                    name="prep"
                    className="sr-only"
                    checked={ids.prep === kind}
                    onChange={() => choose((s) => ({ ...s, prep: kind }))}
                  />
                  <span className="font-serif text-xl text-sumi">{option.label[locale]}</span>
                  <span className="mt-0.5 text-sm text-sumi/70">
                    {[
                      note,
                      option.priceDeltaCents ? `+${formatEuro(option.priceDeltaCents, locale)}` : null,
                      kind === "latte" ? t("latteNote") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "\u00a0"}
                  </span>
                </label>
              );
            })}
          </div>
        </Step>

        {ids.prep === "latte" ? (
          <Step title={t("stepMilk")}>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {builderMilks.map((milk) => {
                const key = optionSuffix(milk);
                return (
                  <label key={key} className={optionClass(ids.milk === key)}>
                    <input
                      type="radio"
                      name="milk"
                      className="sr-only"
                      checked={ids.milk === key}
                      onChange={() => choose((s) => ({ ...s, milk: key }))}
                    />
                    <span className="font-serif text-xl text-sumi">{milk.label[locale]}</span>
                    {milk.note ? <span className="mt-0.5 text-sm text-sumi/70">{milk.note[locale]}</span> : null}
                  </label>
                );
              })}
            </div>
          </Step>
        ) : null}

        <Step title={t("stepExtras")} note={t("stepExtrasNote")}>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {builderExtras.map((extra) => {
              const key = optionSuffix(extra);
              const on = ids.extras.includes(key);
              return (
                <label key={key} className={optionClass(on)}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() =>
                      choose((s) => ({
                        ...s,
                        extras: builderExtras
                          .map(optionSuffix)
                          .filter((k) => (k === key ? !on : s.extras.includes(k))),
                      }))
                    }
                  />
                  <span className="flex items-center gap-3 font-serif text-xl text-sumi">
                    {extra.hue ? <Swatch color={extra.hue} /> : null}
                    {extra.label[locale]}
                  </span>
                  <span className="mt-0.5 text-sm text-sumi/70">
                    {extra.note ? `${extra.note[locale]} · ` : ""}+{formatEuro(extra.priceDeltaCents, locale)}
                  </span>
                </label>
              );
            })}
          </div>
        </Step>
      </div>

      {/* The living recipe card */}
      <div id="receta" className="scroll-mt-24 md:sticky md:top-24 md:self-start">
        <div className="rounded-[2px] border border-wood/40 p-7 sm:p-9">
          <p className="text-eyebrow uppercase text-sumi/70">{t("cardTitle")}</p>

          <div className="mt-6 flex items-center gap-5">
            {/* The drink, photographic: re-tints live to every choice. */}
            <PhotoDrink color={blendColor(recipe)} className="h-36 w-24 shrink-0" />
            <p className="font-serif text-2xl font-light leading-snug text-sumi">{chosen}</p>
          </div>

          <dl className="mt-7 space-y-2 border-t border-wood/25 pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-eyebrow uppercase text-sumi/70">{t("codeLabel")}</dt>
              <dd className="font-medium tracking-wide text-sumi">{code}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-eyebrow uppercase text-sumi/70">{t("priceLabel")}</dt>
              <dd className="font-serif text-2xl text-sumi tabular-nums">{price}</dd>
            </div>
          </dl>

          <div className="mt-7 flex items-center gap-6 border-t border-wood/25 pt-6">
            {qrSvg ? (
              <div
                aria-hidden="true"
                className="h-24 w-24 shrink-0 [&_svg]:h-full [&_svg]:w-full"
                // Our own deterministic QR SVG output (no user input reaches it).
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div aria-hidden="true" className="h-24 w-24 shrink-0 rounded-[2px] border border-wood/25" />
            )}
            <p className="text-sm text-sumi/75">{t("cardHint")}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={shareLink}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-wood/50 px-6 py-2.5 text-sm font-medium text-sumi transition-colors duration-200 hover:border-sumi/60 active:opacity-75"
            >
              {canShare ? t("shareLink") : t("copyLink")}
            </button>
            <span aria-live="polite" className="text-sm text-sumi/70">
              {copied ? t("copied") : ""}
            </span>
          </div>
        </div>

        <p className="mt-4 text-eyebrow uppercase text-sumi/70">{t("priceNote")}</p>

        <div className="mt-6">
          <a href={`/${locale}#socios`} className={quietLinkClass}>
            {cta("toWaitlist")}
          </a>
        </div>
      </div>

      {/* Phones: the live price stays in reach while choosing. */}
      <div
        aria-hidden={barHidden || undefined}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-wood/30 bg-washi px-6 py-3 transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
          barHidden ? "pointer-events-none translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
          <PhotoDrink color={blendColor(recipe)} className="h-12 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-sumi/75">{code}</p>
            <p className="font-serif text-xl text-sumi tabular-nums" aria-live="polite">
              {price}
            </p>
          </div>
          <a
            href="#receta"
            tabIndex={barHidden ? -1 : undefined}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[2px] bg-sumi px-6 text-sm font-medium tracking-wide text-washi active:opacity-75"
          >
            {t("viewCard")}
          </a>
        </div>
      </div>
    </div>
  );
}

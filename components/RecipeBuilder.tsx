"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { intensities, bases, fruits, temps } from "@/content/recipe";
import { quietLinkClass } from "@/components/Button";
import {
  DEFAULT_RECIPE,
  type RecipeIds,
  resolveRecipe,
  priceCents,
  formatPrice,
  ratioLabel,
  displayCode,
  blendColor,
  toParam,
  fromParam,
} from "@/lib/recipe";

const optionClass = (selected: boolean) =>
  `option-tile flex min-h-[44px] w-full cursor-pointer flex-col justify-center rounded-[2px] border px-4 py-3 transition-[border-color,background-color] duration-200 ease-out ${
    selected
      ? "border-sumi/60 bg-matcha-ink/[0.06]"
      : "border-wood/40 hover:border-wood/70"
  }`;

function StepHeading({ children, note }: { children: string; note?: string }) {
  return (
    <legend className="flex items-baseline gap-3 text-eyebrow font-medium uppercase text-sumi/70">
      {children}
      {note ? <span className="normal-case text-sumi/70">{note}</span> : null}
    </legend>
  );
}

export function RecipeBuilder() {
  const t = useTranslations("create");
  const cta = useTranslations("cta");
  const locale = useLocale();
  const [ids, setIds] = useState<RecipeIds>(DEFAULT_RECIPE);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only write to the URL after a real choice — a pristine visit or a shared
  // link must never have its address rewritten out from under it.
  const interacted = useRef(false);

  const choose = (updater: (s: RecipeIds) => RecipeIds) => {
    interacted.current = true;
    setIds(updater);
  };

  // Prefill from a shared link (?r=...).
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("r");
    if (param) setIds(fromParam(param));
  }, []);

  // Clear any pending copy-confirmation timer on unmount.
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const recipe = useMemo(() => resolveRecipe(ids), [ids]);
  const price = formatPrice(priceCents(recipe));
  const ratio = ratioLabel(recipe);
  const code = displayCode(recipe);
  const color = blendColor(recipe);

  useEffect(() => {
    // Canonical share URL: origin + localized path + the recipe. Nothing else
    // (no stray campaign params inside the QR).
    const share = `${window.location.origin}${window.location.pathname}?r=${toParam(ids)}`;

    if (interacted.current) {
      window.history.replaceState(null, "", share);
    }

    // QR encodes the share URL; generated client-side, on demand.
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
        // Chunk failed to load — the bordered placeholder stays; the code
        // and link still work.
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  async function copyLink() {
    try {
      const share = `${window.location.origin}${window.location.pathname}?r=${toParam(ids)}`;
      await navigator.clipboard.writeText(share);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable — the URL bar already holds the link.
    }
  }

  const chosen = [
    recipe.intensity.label[locale],
    recipe.base.label[locale],
    recipe.fruit?.label[locale],
    recipe.temp.label[locale],
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
      {/* The four choices */}
      <div className="space-y-10">
        <fieldset>
          <StepHeading>{t("stepIntensity")}</StepHeading>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {intensities.map((option) => (
              <label key={option.id} className={optionClass(ids.intensity === option.id)}>
                <input
                  type="radio"
                  name="intensity"
                  className="sr-only"
                  checked={ids.intensity === option.id}
                  onChange={() => choose((s) => ({ ...s, intensity: option.id }))}
                />
                <span className="font-serif text-xl text-sumi">
                  {option.label[locale]}
                </span>
                <span className="mt-0.5 text-sm text-sumi/70">
                  {option.note[locale]} · {option.grams.toString().replace(".", ",")} g
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <StepHeading>{t("stepBase")}</StepHeading>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {bases.map((option) => (
              <label key={option.id} className={optionClass(ids.base === option.id)}>
                <input
                  type="radio"
                  name="base"
                  className="sr-only"
                  checked={ids.base === option.id}
                  onChange={() => choose((s) => ({ ...s, base: option.id }))}
                />
                <span className="font-serif text-xl text-sumi">
                  {option.label[locale]}
                </span>
                <span className="mt-0.5 text-sm text-sumi/70">{option.ml} ml</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <StepHeading note={t("stepFruitNote")}>{t("stepFruit")}</StepHeading>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={optionClass(ids.fruit === null)}>
              <input
                type="radio"
                name="fruit"
                className="sr-only"
                checked={ids.fruit === null}
                onChange={() => choose((s) => ({ ...s, fruit: null }))}
              />
              <span className="font-serif text-xl text-sumi">{t("noFruit")}</span>
            </label>
            {fruits.map((option) => (
              <label key={option.id} className={optionClass(ids.fruit === option.id)}>
                <input
                  type="radio"
                  name="fruit"
                  className="sr-only"
                  checked={ids.fruit === option.id}
                  onChange={() => choose((s) => ({ ...s, fruit: option.id }))}
                />
                <span className="flex items-center gap-3 font-serif text-xl text-sumi">
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-sumi/10"
                    style={{ backgroundColor: option.hue }}
                  />
                  {option.label[locale]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <StepHeading>{t("stepTemp")}</StepHeading>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {temps.map((option) => (
              <label key={option.id} className={optionClass(ids.temp === option.id)}>
                <input
                  type="radio"
                  name="temp"
                  className="sr-only"
                  checked={ids.temp === option.id}
                  onChange={() => choose((s) => ({ ...s, temp: option.id }))}
                />
                <span className="font-serif text-xl text-sumi">
                  {option.label[locale]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* The living recipe card */}
      <div className="md:sticky md:top-24 md:self-start">
        <div className="rounded-[2px] border border-wood/40 p-7 sm:p-9">
          <p className="text-eyebrow uppercase text-sumi/70">{t("cardTitle")}</p>

          <div className="mt-6 flex items-center gap-5">
            {/* The drink, seen from above. */}
            <span
              aria-hidden="true"
              className="h-16 w-16 shrink-0 rounded-full ring-1 ring-sumi/15 transition-colors duration-500 ease-out"
              style={{ backgroundColor: color }}
            />
            <p className="font-serif text-2xl font-light leading-snug text-sumi">
              {chosen}
            </p>
          </div>

          <dl className="mt-7 space-y-2 border-t border-wood/25 pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-eyebrow uppercase text-sumi/70">
                {t("ratioLabel")}
              </dt>
              <dd className="text-sumi/85">{ratio}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-eyebrow uppercase text-sumi/70">
                {t("codeLabel")}
              </dt>
              <dd className="font-medium tracking-wide text-sumi">{code}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-eyebrow uppercase text-sumi/70">
                {t("priceLabel")}
              </dt>
              <dd className="font-serif text-2xl text-sumi">{price}</dd>
            </div>
          </dl>

          <div className="mt-7 flex items-center gap-6 border-t border-wood/25 pt-6">
            {qrSvg ? (
              <div
                aria-hidden="true"
                className="h-24 w-24 shrink-0 [&_svg]:h-full [&_svg]:w-full"
                // Our own deterministic QR SVG output.
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
              onClick={copyLink}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-wood/50 px-6 py-2.5 text-sm font-medium text-sumi transition-colors duration-200 hover:border-sumi/60 active:opacity-75"
            >
              {t("copyLink")}
            </button>
            <span aria-live="polite" className="text-sm text-sumi/70">
              {copied ? t("copied") : ""}
            </span>
          </div>
        </div>

        <p className="mt-4 text-eyebrow uppercase text-sumi/70">
          {t("priceNote")}
        </p>

        {/* The highest-intent moment on the site leads somewhere. */}
        <div className="mt-6">
          <a href={`/${locale}#socios`} className={quietLinkClass}>
            {cta("toWaitlist")}
          </a>
        </div>
      </div>
    </div>
  );
}

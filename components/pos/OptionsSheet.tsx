"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatEuro } from "@/lib/money";
import { priceLine, type CatalogItem } from "@/lib/pos/pricing";
import { drinkBands } from "@/lib/pos/drinkBands";

export type DraftLine = {
  uid: string;
  item: CatalogItem;
  quantity: number;
  modifierKeys: string[];
  grams: number | null;
  note: string;
};

const choice = (on: boolean, disabled = false) =>
  `inline-flex min-h-[56px] items-center gap-2.5 rounded-[2px] border px-4 text-[15px] transition-colors ${
    disabled
      ? "border-dashed border-wood/45 text-sumi/50"
      : on
        ? "border-sumi bg-sumi text-washi"
        : "border-wood/45 hover:border-sumi/50"
  }`;

/**
 * Barra v2 (mock 5, 2026-11-12): the options of one drink open in place of
 * the carta, beside the live order, never over it. On the left the drink as
 * it sits in the cup, its layers changing as options are chosen; on the
 * right the choices, grams, note and quantity. Required single choices come
 * preselected (the first available), so a standard drink is one more tap.
 */
export function OptionsSheet({
  draft,
  onCancel,
  onConfirm,
}: {
  draft: DraftLine;
  onCancel: () => void;
  onConfirm: (line: DraftLine) => void;
}) {
  const t = useTranslations("pos.till");
  const [line, setLine] = useState(draft);
  const [missing, setMissing] = useState<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const item = line.item;

  useEffect(() => {
    backRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const priced = useMemo(
    () =>
      priceLine(new Map([[item.id, item]]), {
        menuItemId: item.id,
        quantity: line.quantity,
        modifierKeys: line.modifierKeys,
        grams: line.grams,
      }),
    [item, line.quantity, line.modifierKeys, line.grams],
  );
  const unit = item.priceCents + item.groups.flatMap((g) => g.options).filter((o) => line.modifierKeys.includes(o.key)).reduce((s, o) => s + o.priceDeltaCents, 0);
  const bands = drinkBands(item, line.modifierKeys);
  const latte = line.modifierKeys.some((k) => /latte/.test(k));

  const toggle = (groupSlug: string, key: string) => {
    setMissing(null);
    const group = item.groups.find((g) => g.slug === groupSlug)!;
    setLine((l) => {
      const inGroup = new Set(group.options.map((o) => o.key));
      const others = l.modifierKeys.filter((k) => !inGroup.has(k));
      const current = l.modifierKeys.filter((k) => inGroup.has(k));
      if (group.selection === "single") {
        const keys = current.includes(key) && !group.required ? others : [...others, key];
        // Choosing latte picks the first milk, so the usual latte is one tap.
        const milk = item.groups.find((g) => g.slug === "leche");
        if (/latte/.test(key) && milk && !milk.options.some((o) => keys.includes(o.key))) {
          const first = milk.options.find((o) => o.available);
          if (first) keys.push(first.key);
        }
        return { ...l, modifierKeys: keys };
      }
      return { ...l, modifierKeys: current.includes(key) ? [...others, ...current.filter((k) => k !== key)] : [...others, ...current, key] };
    });
  };

  const confirm = () => {
    if (!priced.ok) {
      const group = item.groups.find((g) => g.required && !g.options.some((o) => line.modifierKeys.includes(o.key)));
      setMissing(group ? t("chooseRequired", { group: group.label.toLowerCase() }) : null);
      return;
    }
    // A usucha keeps no milk the barista tapped before switching back.
    const milkKeys = new Set(item.groups.find((g) => g.slug === "leche")?.options.map((o) => o.key) ?? []);
    onConfirm(latte ? line : { ...line, modifierKeys: line.modifierKeys.filter((k) => !milkKeys.has(k)) });
  };

  const step = (delta: number) =>
    setLine((l) => ({ ...l, grams: Math.max(0.1, Math.round(((l.grams ?? item.defaultGrams ?? 2) + delta) * 10) / 10) }));

  return (
    <section aria-labelledby="sheet-title" className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between gap-4">
        <button ref={backRef} type="button" onClick={onCancel} className="inline-flex min-h-[48px] items-center gap-2 text-[15px]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M11 3L5 9l6 6" />
          </svg>
          {t("backToMenu")}
        </button>
        <p className="text-eyebrow uppercase text-sumi/70">{item.category}</p>
      </div>

      <div className="mt-4 flex flex-col gap-8 md:flex-row">
        {/* The drink, top to bottom as in the cup. */}
        <figure aria-label={t("drinkPicture")} className="m-0 grid h-[300px] w-full shrink-0 grid-cols-[4rem_minmax(0,1fr)] gap-3.5 md:h-[440px] md:w-[13rem]">
          <div className="flex flex-col overflow-hidden rounded-[2px] ring-1 ring-inset ring-sumi/15">
            {bands.map((b) => (
              <div key={b.id} className="transition-[flex-grow] duration-300 ease-out motion-reduce:transition-none" style={{ flexGrow: b.grow, flexBasis: 0, backgroundColor: b.color }} />
            ))}
          </div>
          <ol className="flex flex-col">
            {bands.map((b) => (
              <li
                key={b.id}
                className="flex min-h-0 items-center border-t border-wood/25 text-eyebrow uppercase leading-snug text-sumi/80 transition-[flex-grow] duration-300 ease-out first:border-t-0 motion-reduce:transition-none"
                style={{ flexGrow: b.grow, flexBasis: 0 }}
              >
                {b.label}
              </li>
            ))}
          </ol>
        </figure>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <h2 id="sheet-title" className="font-serif text-[2.25rem] font-light leading-none">
            {item.name}
          </h2>

          {item.groups.map((group) =>
            // Milk only matters for a latte: the group hides for a usucha.
            group.slug === "leche" && !latte ? null : (
              <fieldset key={group.slug}>
                <legend className="mb-2.5 text-sm text-sumi/75">
                  {group.label}
                  {group.required ? ` · ${t("required")}` : group.selection === "multiple" ? ` · ${t("multiple")}` : ""}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((o) => {
                    const on = line.modifierKeys.includes(o.key);
                    return (
                      <button
                        key={o.key}
                        type="button"
                        aria-pressed={on}
                        disabled={!o.available}
                        onClick={() => toggle(group.slug, o.key)}
                        className={choice(on, !o.available)}
                      >
                        {o.hue ? <span aria-hidden="true" className="size-3 shrink-0 rounded-full ring-1 ring-sumi/20" style={{ backgroundColor: o.hue }} /> : null}
                        {o.label}
                        {!o.available ? ` · ${t("soldOut").toLowerCase()}` : o.priceDeltaCents ? <span className="opacity-75">+{formatEuro(o.priceDeltaCents)}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ),
          )}

          {item.defaultGrams ? (
            <div>
              <p className="mb-2.5 text-sm text-sumi/75" id="grams-label">
                {t("grams", { grams: String(item.defaultGrams).replace(".", ",") })}
              </p>
              <div className="flex items-center gap-2.5" role="group" aria-labelledby="grams-label">
                <button type="button" aria-label={t("gramsLess")} onClick={() => step(-0.1)} className="h-14 w-14 rounded-[2px] border border-wood/45 text-2xl">
                  −
                </button>
                <output className="w-24 text-center font-serif text-2xl tabular-nums" aria-live="polite">
                  {String(line.grams ?? item.defaultGrams).replace(".", ",")} g
                </output>
                <button type="button" aria-label={t("gramsMore")} onClick={() => step(0.1)} className="h-14 w-14 rounded-[2px] border border-wood/45 text-2xl">
                  +
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="line-note" className="mb-2.5 block text-sm text-sumi/75">
              {t("note")}
            </label>
            <input
              id="line-note"
              value={line.note}
              maxLength={140}
              onChange={(e) => setLine((l) => ({ ...l, note: e.target.value }))}
              placeholder={t("notePlaceholder")}
              className="min-h-[52px] w-full rounded-[2px] border border-wood/45 bg-transparent px-4 text-base placeholder:text-sumi/45 focus:border-sumi/70"
            />
          </div>
          <p role="status" className="min-h-[1.25rem] text-sm text-sumi">
            {missing}
          </p>

          {/* Always in reach on a landscape tablet: the row sticks to the bottom. */}
          <div className="sticky bottom-0 mt-auto flex flex-wrap items-center gap-4 border-t border-wood/35 bg-washi py-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label={t("less")}
                onClick={() => setLine((l) => ({ ...l, quantity: Math.max(1, l.quantity - 1) }))}
                className="h-14 w-14 rounded-[2px] border border-wood/45 text-2xl"
              >
                −
              </button>
              <span className="w-8 text-center text-xl tabular-nums" aria-live="polite">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label={t("more")}
                onClick={() => setLine((l) => ({ ...l, quantity: Math.min(50, l.quantity + 1) }))}
                className="h-14 w-14 rounded-[2px] border border-wood/45 text-2xl"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={confirm}
              className="ml-auto min-h-[64px] rounded-[2px] bg-sumi px-10 text-base font-medium text-washi active:opacity-75"
            >
              {t("add", { price: formatEuro(unit * line.quantity) })}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatEuro } from "@/lib/money";
import { priceLine, type CatalogItem } from "@/lib/pos/pricing";

export type DraftLine = {
  uid: string;
  item: CatalogItem;
  quantity: number;
  modifierKeys: string[];
  grams: number | null;
  note: string;
};

const tile = (on: boolean, disabled = false) =>
  `min-h-[56px] rounded-[2px] border px-3 text-[15px] transition-colors ${
    disabled
      ? "border-dashed border-wood/45 text-sumi/50"
      : on
        ? "border-sumi bg-sumi text-washi"
        : "border-wood/45 hover:border-sumi/50"
  }`;

/** Mock 2: the options of one drink, its measured grams, quantity and note. */
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = line.item;

  useEffect(() => {
    closeRef.current?.focus();
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

  const toggle = (groupSlug: string, key: string) => {
    setMissing(null);
    const group = item.groups.find((g) => g.slug === groupSlug)!;
    setLine((l) => {
      const inGroup = new Set(group.options.map((o) => o.key));
      const others = l.modifierKeys.filter((k) => !inGroup.has(k));
      const current = l.modifierKeys.filter((k) => inGroup.has(k));
      if (group.selection === "single") {
        return { ...l, modifierKeys: current.includes(key) && !group.required ? others : [...others, key] };
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
    onConfirm(line);
  };

  const step = (delta: number) =>
    setLine((l) => ({ ...l, grams: Math.max(0.1, Math.round(((l.grams ?? item.defaultGrams ?? 2) + delta) * 10) / 10) }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-sumi/25 sm:items-center sm:p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="flex max-h-[92dvh] w-full max-w-[880px] flex-col rounded-t-[2px] bg-washi sm:rounded-[2px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-wood/35 px-6 pb-4 pt-6 sm:px-10">
          <div>
            <p className="text-eyebrow uppercase text-sumi/70">{item.category}</p>
            <h2 id="sheet-title" className="mt-2 font-serif text-[2rem] font-light leading-tight">
              {item.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            aria-label={t("close")}
            className="flex h-12 w-12 items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-10">
          {item.groups.map((group) => (
            <fieldset key={group.slug}>
              <legend className="mb-2.5 text-sm text-sumi/75">
                {group.label}
                {group.required ? ` · ${t("required")}` : group.selection === "multiple" ? ` · ${t("multiple")}` : ""}
              </legend>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {group.options.map((o) => {
                  const on = line.modifierKeys.includes(o.key);
                  return (
                    <button
                      key={o.key}
                      type="button"
                      aria-pressed={on}
                      disabled={!o.available}
                      onClick={() => toggle(group.slug, o.key)}
                      className={tile(on, !o.available)}
                    >
                      {o.label}
                      {!o.available ? ` · ${t("soldOut").toLowerCase()}` : o.priceDeltaCents ? ` · +${formatEuro(o.priceDeltaCents)}` : ""}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {item.defaultGrams ? (
            <div>
              <p className="mb-2.5 text-sm text-sumi/75" id="grams-label">
                {t("grams", { grams: String(item.defaultGrams).replace(".", ",") })}
              </p>
              <div className="flex items-center gap-2.5" role="group" aria-labelledby="grams-label">
                <button type="button" aria-label={t("gramsLess")} onClick={() => step(-0.1)} className="h-14 w-14 rounded-[2px] border border-wood/45 text-2xl">
                  −
                </button>
                <output className="w-28 text-center font-serif text-2xl tabular-nums" aria-live="polite">
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
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-wood/35 px-6 py-4 sm:px-10">
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
            className="ml-auto min-h-[60px] rounded-[2px] bg-sumi px-10 text-base font-medium text-washi active:opacity-75"
          >
            {t("add", { price: formatEuro(unit * line.quantity) })}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { closeShiftAction, openShiftAction } from "@/app/(pos)/pos/sale-actions";
import { formatEuro } from "@/lib/money";
import type { ZReport } from "@/lib/pos/sales";

const toCents = (v: string) => Math.round(Number(v.replace(",", ".") || "NaN") * 100);

function AmountField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-sumi/80">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9,.]/g, ""))}
          className="min-h-[60px] w-48 rounded-[2px] border border-wood/50 bg-transparent px-4 font-serif text-2xl tabular-nums focus:border-sumi/70"
        />
        <span className="font-serif text-2xl">€</span>
      </div>
    </div>
  );
}

export function OpenShiftForm() {
  const t = useTranslations("pos.shift");
  const router = useRouter();
  const [value, setValue] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cents = toCents(value);

  return (
    <form
      className="max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (!Number.isInteger(cents) || cents < 0) return;
        start(async () => {
          const r = await openShiftAction(cents);
          if (r.ok) router.refresh();
          else setError(r.error === "shift-open" ? t("shiftOpen") : r.error);
        });
      }}
    >
      <h1 className="font-serif text-[2rem] font-light leading-tight">{t("openTitle")}</h1>
      <p className="mt-3 text-sumi/80">{t("openBody")}</p>
      <div className="mt-8">
        <AmountField id="float" label={t("float")} value={value} onChange={setValue} />
      </div>
      <div className="mt-4 flex gap-2.5">
        {[5000, 10000, 15000].map((v) => (
          <button key={v} type="button" onClick={() => setValue(String(v / 100))} className="min-h-[48px] rounded-[2px] border border-wood/45 px-5">
            {formatEuro(v)}
          </button>
        ))}
      </div>
      <p role="status" className="mt-4 min-h-[1.5rem] text-sm text-sumi">
        {error}
      </p>
      <button type="submit" disabled={pending || !Number.isInteger(cents)} className="mt-2 min-h-[60px] rounded-[2px] bg-sumi px-10 font-medium text-washi disabled:opacity-35">
        {t("open")}
      </button>
    </form>
  );
}

function ZReportView({ report }: { report: ZReport }) {
  const t = useTranslations("pos.shift");
  const row = "flex items-baseline justify-between gap-6 border-b border-wood/25 py-2.5";
  return (
    <dl className="text-[15px]">
      <div className={row}>
        <dt>{t("orders")}</dt>
        <dd className="tabular-nums">{report.orders}</dd>
      </div>
      {Object.entries(report.byMethod).map(([m, v]) => (
        <div key={m} className={row}>
          <dt>{t(`method.${m}` as "method.cash")}</dt>
          <dd className="tabular-nums">{formatEuro(v)}</dd>
        </div>
      ))}
      <div className={row}>
        <dt className="font-medium">{t("total")}</dt>
        <dd className="font-serif text-xl tabular-nums">{formatEuro(report.totalCents)}</dd>
      </div>
      {report.tax.map((r) => (
        <div key={r.rateBasisPoints} className={`${row} text-sumi/80`}>
          <dt>{t("tax", { rate: r.rateBasisPoints / 100 })}</dt>
          <dd className="tabular-nums">
            {t("base")} {formatEuro(r.baseCents)} · {t("quota")} {formatEuro(r.taxCents)}
          </dd>
        </div>
      ))}
      <div className={row}>
        <dt>{t("float")}</dt>
        <dd className="tabular-nums">{formatEuro(report.floatCents)}</dd>
      </div>
      <div className={row}>
        <dt>{t("expected")}</dt>
        <dd className="tabular-nums">{formatEuro(report.expectedCashCents)}</dd>
      </div>
      {report.countedCashCents !== undefined ? (
        <>
          <div className={row}>
            <dt>{t("counted")}</dt>
            <dd className="tabular-nums">{formatEuro(report.countedCashCents)}</dd>
          </div>
          <div className={row}>
            <dt className="font-medium">{t("difference")}</dt>
            <dd className="font-medium tabular-nums">{formatEuro(report.differenceCents ?? 0)}</dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

export function CloseShiftForm({ preview }: { preview: ZReport }) {
  const t = useTranslations("pos.shift");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<ZReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cents = toCents(value);

  if (result) {
    return (
      <div className="max-w-xl">
        <p role="status" className="font-serif text-2xl font-light">
          {t("closed")}
        </p>
        <div className="mt-6">
          <ZReportView report={result} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3 print:hidden">
          <button type="button" onClick={() => window.print()} className="min-h-[52px] rounded-[2px] border border-sumi/55 px-8 text-sm font-medium">
            {t("print")}
          </button>
          <Link href="/pos" className="inline-flex min-h-[52px] items-center rounded-[2px] bg-sumi px-8 text-sm font-medium text-washi">
            {t("back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-2">
      <ZReportView report={preview} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!Number.isInteger(cents)) return;
          start(async () => {
            const r = await closeShiftAction(cents);
            if (r.ok) setResult(r.report);
            else setError(r.error);
          });
        }}
      >
        <p className="text-sumi/80">{t("closeBody")}</p>
        <div className="mt-6">
          <AmountField id="counted" label={t("counted")} value={value} onChange={setValue} />
        </div>
        <p role="status" className="mt-4 min-h-[1.5rem] text-sm text-sumi">
          {error}
        </p>
        <button type="submit" disabled={pending || !Number.isInteger(cents)} className="mt-2 min-h-[60px] rounded-[2px] bg-sumi px-10 font-medium text-washi disabled:opacity-35">
          {t("close")}
        </button>
      </form>
    </div>
  );
}

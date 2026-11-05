"use client";

import { useTranslations } from "next-intl";
import { PosEyebrow } from "@/components/pos/PosFrame";

/** The counter never shows Next's default English error page. */
export default function PosError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("pos.error");
  return (
    <main className="flex min-h-dvh flex-col justify-center px-4 py-14 sm:px-8">
      <div className="max-w-[40rem]">
        <PosEyebrow>{t("eyebrow")}</PosEyebrow>
        <h1 className="mt-4 font-serif text-[2rem] font-light leading-tight">{t("title")}</h1>
        <p className="mt-4 max-w-[46ch] leading-relaxed text-sumi/85">{t("body")}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex min-h-[52px] items-center rounded-[2px] bg-sumi px-8 text-sm font-medium tracking-wide text-washi hover:opacity-90"
        >
          {t("retry")}
        </button>
      </div>
    </main>
  );
}

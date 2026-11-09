"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { advanceOrderAction } from "@/app/(pos)/pos/sale-actions";

type Box = { id: number; name: string; box: string; createdAt: string; note: string | null };

/**
 * Subscribers' monthly boxes waiting at the bar. The barista finds the name,
 * hands the tin over and taps "Entregada" (the order becomes collected).
 */
export function BoxPickups({ boxes }: { boxes: Box[] }) {
  const t = useTranslations("pos.boxes");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  if (!boxes.length) return null;
  const hand = (id: number) =>
    start(async () => {
      setMessage(null);
      const r = await advanceOrderAction(id, "collected").catch(() => ({ ok: false as const }));
      if (r.ok) router.refresh();
      else setMessage(t("error"));
    });
  return (
    <section aria-labelledby="pos-boxes" className="mb-12 w-full">
      <h2 id="pos-boxes" className="font-serif text-[1.6rem] font-light">
        {t("title", { count: boxes.length })}
      </h2>
      <ul className="mt-4 border-t border-wood/30">
        {boxes.map((b) => (
          <li key={b.id} className="flex min-h-[64px] items-center justify-between gap-4 border-b border-wood/30 px-2 py-3">
            <span className="min-w-0">
              <span className="block text-lg">{b.name}</span>
              <span className="block truncate text-sm text-sumi/75">
                {b.box} · {new Date(b.createdAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long" })}
              </span>
              {b.note ? <span className="mt-0.5 block text-sm text-sumi">{b.note}</span> : null}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => hand(b.id)}
              className="inline-flex min-h-[48px] shrink-0 items-center rounded-[2px] border border-sumi/60 px-5 text-sm hover:bg-sumi hover:text-washi"
            >
              {t("hand")}
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-2 min-h-[1.25rem] text-sm">
        {message}
      </p>
    </section>
  );
}

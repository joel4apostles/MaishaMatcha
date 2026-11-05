"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { rsvpAction } from "@/app/[locale]/(site)/cuenta/actions";
import { Link, useRouter } from "@/i18n/navigation";
import { quietLinkClass } from "@/components/Button";

const KNOWN = ["full", "members-only", "not-bookable", "invalid", "rate-limited", "signed-out"];
const quietButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-wood/50 px-5 text-sm font-medium text-sumi hover:border-sumi/60 disabled:opacity-40";

/** Booking a seat (or two) at an event. Capacity is enforced on the server. */
export function EventRsvp({
  eventId,
  remaining,
  mine,
  signedIn,
  allowed,
}: {
  eventId: number;
  remaining: number;
  mine: number;
  signedIn: boolean;
  allowed: boolean;
}) {
  const t = useTranslations("rsvp");
  const router = useRouter();
  const locale = useLocale();
  const back = locale === "en" ? "/en/events" : "/es/eventos";
  const [seats, setSeats] = useState(mine || 1);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const send = (n: number) =>
    start(async () => {
      setMsg("");
      const r = await rsvpAction(eventId, n).catch(() => ({ ok: false as const, error: "invalid" }));
      if (r.ok) router.refresh();
      else setMsg(t(`errors.${KNOWN.includes(r.error) ? r.error : "invalid"}` as "errors.invalid"));
    });

  return (
    <div className="mt-6 border-t border-wood/25 pt-4">
      <p className="text-sm text-sumi/75">{mine ? t("reserved", { count: mine }) : t("remaining", { count: remaining })}</p>
      {!signedIn ? (
        <Link href={{ pathname: "/cuenta", query: { next: back } }} className={`${quietLinkClass} mt-2`}>
          {t("signIn")}
        </Link>
      ) : !allowed ? (
        <p className="mt-2 text-sm text-sumi/75">{t("foundingOnly")}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor={`seats-${eventId}`}>
            {t("seats")}
          </label>
          <select
            id={`seats-${eventId}`}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className="min-h-[44px] cursor-pointer border-b border-wood/40 bg-transparent px-1 text-base"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
          <button type="button" disabled={pending || (!mine && remaining < seats)} onClick={() => send(seats)} className={quietButton}>
            {mine ? t("update") : t("reserve")}
          </button>
          {mine ? (
            <button type="button" disabled={pending} onClick={() => send(0)} className="min-h-[44px] text-sm text-sumi/75 underline decoration-wood/50 underline-offset-4">
              {t("cancel")}
            </button>
          ) : null}
        </div>
      )}
      <p role="status" className={msg ? "mt-2 text-sm" : "sr-only"}>
        {msg}
      </p>
    </div>
  );
}

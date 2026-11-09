"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  deleteAccountAction,
  requestSignInAction,
  signOutAction,
  signOutEverywhereAction,
  startFoundingAction,
  startPremiumAction,
  premiumPortalAction,
  updatePrefsAction,
} from "@/app/[locale]/(site)/cuenta/actions";
import { inkButtonClass, quietLinkClass } from "@/components/Button";
import { Numeral } from "@/components/Numeral";
import { Link, useRouter } from "@/i18n/navigation";
import { formatEuro } from "@/lib/money";
import { useHumanCheck } from "@/components/HumanCheck";

const field =
  "mt-2 block min-h-[48px] w-full border-b border-sumi/50 bg-transparent py-2 text-base text-sumi placeholder:text-sumi/60 focus:border-sumi";
const label = "text-eyebrow uppercase text-sumi/70";
const quietButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-wood/50 px-5 text-sm font-medium text-sumi hover:border-sumi/60 disabled:opacity-40";
const KNOWN = ["invalid", "rate-limited", "generic", "confirm", "closed", "already", "pending", "signed-out", "subscribed", "challenge"];

function useError() {
  const t = useTranslations("account");
  return (code?: string) => t(`errors.${code && KNOWN.includes(code) ? code : "generic"}` as "errors.generic");
}

export function SignInForm({ next }: { next?: string }) {
  const t = useTranslations("account");
  const err = useError();
  const locale = useLocale() as "es" | "en";
  const human = useHumanCheck(locale);
  const [state, setState] = useState<"idle" | "sent">("idle");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  return state === "sent" ? (
    <p role="status" className="text-lg">
      {t("sent")}
    </p>
  ) : (
    <form
      action={(form) =>
        start(async () => {
          const r = await requestSignInAction({
            email: String(form.get("email") ?? ""),
            name: String(form.get("name") ?? "") || undefined,
            locale,
            next,
            turnstile: human.token,
          }).catch(() => ({ ok: false, error: "generic" }));
          human.reset();
          if (r.ok) setState("sent");
          else setMessage(err(r.error));
        })
      }
      className="space-y-6"
    >
      <div>
        <label htmlFor="a-email" className={label}>
          {t("email")}
        </label>
        <input id="a-email" name="email" type="email" inputMode="email" required autoComplete="email" enterKeyHint="next" className={field} />
      </div>
      <div>
        <label htmlFor="a-name" className={label}>
          {t("name")}
        </label>
        <input id="a-name" name="name" autoComplete="name" autoCapitalize="words" enterKeyHint="send" maxLength={80} className={field} />
      </div>
      {human.box}
      <p role="status" className="min-h-[1.25rem] text-sm text-sumi">
        {message}
      </p>
      <button type="submit" disabled={pending} className={`${inkButtonClass} w-full sm:w-auto`}>
        {pending ? t("sending") : t("send")}
      </button>
    </form>
  );
}

type Order = { label: string; status: string; paymentStatus: string; totalCents: number; createdAt: string; token: string | null; membership: boolean; kind: string };
type Premium = {
  open: boolean;
  priceCents: number | null;
  foundingPrice: boolean;
  perks: string[];
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  justSubscribed: boolean;
  /** The tin in the monthly box, if any. */
  product: string | null;
  /** null = pickup only. */
  shippingCents: number | null;
  box: { createdAt: string; status: string; fulfilment: string; shippedAt: string | null } | null;
};
type Founding = { open: boolean; priceCents: number | null; cap: number; remaining: number; perks: string[] };

export function AccountPanel({
  member,
  orders,
  founding,
  justPaid,
  premium,
}: {
  member: { name: string; email: string; tier: string; emailOptIn: boolean; locale: "es" | "en" };
  orders: Order[];
  founding: Founding | null;
  justPaid: boolean;
  premium: Premium;
}) {
  const t = useTranslations("account");
  const st = useTranslations("order.status");
  const err = useError();
  const locale = useLocale() as "es" | "en";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [foundingMsg, setFoundingMsg] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [premiumMsg, setPremiumMsg] = useState("");
  const [delivery, setDelivery] = useState<"pickup" | "shipping">("pickup");
  const go = (fn: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>, onErr: (m: string) => void) =>
    start(async () => {
      const r = await fn().catch(() => ({ ok: false as const, error: "generic" }));
      if (r.ok) window.location.assign(r.url);
      else onErr(err(r.error));
    });
  const until = premium.periodEnd
    ? new Date(premium.periodEnd).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { timeZone: "Europe/Madrid", day: "numeric", month: "long" })
    : "";

  const fmtDate = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { timeZone: "Europe/Madrid", ...o });
  const boxText = (b: NonNullable<Premium["box"]>) => {
    const month = fmtDate(b.createdAt, { month: "long" });
    if (b.status === "ready") return b.fulfilment === "shipping" ? t("boxReadyShip", { month }) : t("boxReadyPickup", { month });
    if (b.status === "collected") return b.fulfilment === "shipping" && b.shippedAt ? t("boxShipped", { month, date: fmtDate(b.shippedAt, { day: "numeric", month: "long" }) }) : t("boxCollected", { month });
    return null;
  };
  const tile = (selected: boolean) =>
    `option-tile flex min-h-[56px] w-full cursor-pointer flex-col justify-center rounded-[2px] border px-4 py-3 transition-[border-color,background-color] duration-200 ease-out ${
      selected ? "border-sumi/60 bg-matcha/[0.06]" : "border-wood/40 hover:border-wood/70"
    }`;

  const isFounding = member.tier === "founding";
  // Nothing to offer yet: one quiet line instead of two closed doors.
  const foundingClosed = !isFounding && !justPaid && !(founding?.open && founding.priceCents);
  const premiumClosed =
    premium.status !== "active" && premium.status !== "past_due" && !premium.justSubscribed && !(premium.open && premium.priceCents);
  const bothClosed = foundingClosed && premiumClosed;
  const statusText = (o: Order) =>
    o.kind === "subscription" ? t("subscription") : o.membership ? t("membership") : (["received", "preparing", "ready", "collected", "cancelled"].includes(o.status) ? st(o.status as "received") : o.status);

  return (
    <div className="grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-16">
      <div className="space-y-14">
        <section aria-labelledby="a-orders">
          <SectionTitle id="a-orders" numeral="一">{t("ordersTitle")}</SectionTitle>
          {orders.length === 0 ? <p className="mt-5 text-sumi/80">{t("noOrders")}</p> : null}
          {orders.length ? (
            <ul className="mt-5 border-t border-wood/25">
              {orders.map((o) => (
                <li key={o.label + o.createdAt} className="border-b border-wood/25">
                  {o.token && !o.membership ? (
                    <Link
                      href={{ pathname: "/pedido/[token]", params: { token: o.token } }}
                      className="flex min-h-[56px] items-center justify-between gap-4 py-3"
                    >
                      <OrderRow o={o} text={statusText(o)} locale={locale} />
                    </Link>
                  ) : (
                    <div className="flex min-h-[56px] items-center justify-between gap-4 py-3">
                      <OrderRow o={o} text={statusText(o)} locale={locale} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            ) : null}
          <Link href="/pedir" className={`${quietLinkClass} mt-3`}>
            {t("orderAgain")}
          </Link>
        </section>
        {bothClosed ? (
          <section aria-labelledby="a-membership" className="border-t border-wood/35 pt-10">
            <SectionTitle id="a-membership" numeral="二">{t("membershipTitle")}</SectionTitle>
            <p className="mt-4 text-sumi/80">{t("bothClosed")}</p>
          </section>
        ) : (
          <>
        <section aria-labelledby="a-founding" className="border-t border-wood/35 pt-10">
          <SectionTitle id="a-founding" numeral="二">{t("foundingTitle")}</SectionTitle>
          {isFounding ? (
            <p className="mt-4 text-sumi/80">{t("foundingYours")}</p>
          ) : justPaid ? (
            <p role="status" className="mt-4">
              {t("foundingThanks")}
            </p>
          ) : founding?.open && founding.priceCents ? (
            <>
              <p className="mt-4 text-sumi/80">{t("foundingBody", { cap: founding.cap, remaining: founding.remaining })}</p>
              {founding.perks.length ? (
                <ul className="mt-4 border-t border-wood/25">
                  {founding.perks.map((p) => (
                    <li key={p} className="border-b border-wood/25 py-3">
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await startFoundingAction(locale).catch(() => ({ ok: false as const, error: "generic" }));
                    if (r.ok) window.location.assign(r.url);
                    else setFoundingMsg(err(r.error));
                  })
                }
                className={`${inkButtonClass} mt-6 w-full sm:w-auto`}
              >
                {t("foundingCta", { price: formatEuro(founding.priceCents, locale) })}
              </button>
              <p role="status" className="mt-2 min-h-[1.25rem] text-sm">
                {foundingMsg}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sumi/80">{t("foundingClosed")}</p>
          )}
        </section>

        <section aria-labelledby="a-premium" className="border-t border-wood/35 pt-10">
          <SectionTitle id="a-premium" numeral="三">{t("premiumTitle")}</SectionTitle>
          {premium.status === "active" || premium.status === "past_due" ? (
            <>
              <p className="mt-4 text-sumi/80">
                {premium.status === "past_due"
                  ? t("premiumPastDue")
                  : premium.cancelAtPeriodEnd
                    ? t("premiumEnds", { date: until })
                    : until
                      ? t("premiumActive", { date: until })
                      : t("premiumActiveShort")}
              </p>
              {premium.box && boxText(premium.box) ? <p className="mt-2 text-sumi">{boxText(premium.box)}</p> : null}
              <button type="button" disabled={pending} onClick={() => go(() => premiumPortalAction(locale), setPremiumMsg)} className={`${quietButton} mt-5`}>
                {t("premiumManage")}
              </button>
            </>
          ) : premium.justSubscribed ? (
            <p role="status" className="mt-4">
              {t("premiumThanks")}
            </p>
          ) : premium.open && premium.priceCents ? (
            <>
              <p className="mt-4 text-sumi/80">{premium.foundingPrice ? t("premiumFoundingPrice") : t("premiumBody")}</p>
              {premium.product ? <p className="mt-2 text-sumi">{t("premiumBox", { product: premium.product })}</p> : null}
              {premium.perks.length ? (
                <ul className="mt-4 border-t border-wood/25">
                  {premium.perks.map((p) => (
                    <li key={p} className="border-b border-wood/25 py-3">
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
              {premium.product && premium.shippingCents != null ? (
                <fieldset className="mt-6">
                  <legend className="text-eyebrow font-medium uppercase text-sumi/70">{t("premiumDeliveryLegend")}</legend>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={tile(delivery === "pickup")}>
                      <input type="radio" name="box-delivery" className="sr-only" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} />
                      <span className="text-sumi">{t("premiumPickup")}</span>
                      <span className="mt-0.5 text-sm text-sumi/70">{t("premiumPickupNote")}</span>
                    </label>
                    <label className={tile(delivery === "shipping")}>
                      <input type="radio" name="box-delivery" className="sr-only" checked={delivery === "shipping"} onChange={() => setDelivery("shipping")} />
                      <span className="text-sumi">{t("premiumShip")}</span>
                      <span className="mt-0.5 text-sm text-sumi/70">{t("premiumShipNote", { price: formatEuro(premium.shippingCents, locale) })}</span>
                    </label>
                  </div>
                </fieldset>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => go(() => startPremiumAction(locale, delivery), setPremiumMsg)}
                className={`${quietButton} mt-6 w-full sm:w-auto`}
              >
                {t("premiumCta", {
                  price: formatEuro(premium.priceCents + (delivery === "shipping" && premium.shippingCents ? premium.shippingCents : 0), locale),
                })}
              </button>
            </>
          ) : (
            <p className="mt-4 text-sumi/80">{t("premiumClosed")}</p>
          )}
          <p role="status" className="mt-2 min-h-[1.25rem] text-sm">
            {premiumMsg}
          </p>
        </section>
          </>
        )}

      </div>

      <div className="space-y-14 md:border-l md:border-wood/35 md:pl-16">
        <section aria-labelledby="a-prefs">
          <SectionTitle id="a-prefs" numeral={bothClosed ? "三" : "四"}>{t("prefsTitle")}</SectionTitle>
          <form
            action={(form) =>
              start(async () => {
                const r = await updatePrefsAction({
                  name: String(form.get("name") ?? ""),
                  emailOptIn: form.get("letters") === "on",
                  locale: form.get("lang") === "en" ? "en" : "es",
                }).catch(() => ({ ok: false, error: "generic" }));
                setNote(r.ok ? t("saved") : err(r.error));
                if (r.ok) router.refresh();
              })
            }
            className="mt-6 space-y-6"
          >
            <div>
              <label htmlFor="p-name" className={label}>
                {t("name").replace(/ \(.*\)$/, "")}
              </label>
              <input id="p-name" name="name" required defaultValue={member.name} maxLength={80} autoComplete="name" className={field} />
            </div>
            <p className="text-sm text-sumi/70">{member.email}</p>
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
              <input type="checkbox" name="letters" defaultChecked={member.emailOptIn} className="mt-1 size-5 shrink-0 accent-sumi" />
              <span>{t("letters")}</span>
            </label>
            <div>
              <label htmlFor="p-lang" className={label}>
                {t("language")}
              </label>
              <select id="p-lang" name="lang" defaultValue={member.locale} className={`${field} cursor-pointer`}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" disabled={pending} className={quietButton}>
                {t("save")}
              </button>
              <span role="status" className="text-sm text-sumi/70">
                {note}
              </span>
            </div>
          </form>
        </section>

        <section className="flex flex-wrap gap-3">
          <button type="button" className={quietButton} onClick={() => start(async () => { await signOutAction(); router.refresh(); })}>
            {t("signOut")}
          </button>
          <button type="button" className={quietButton} onClick={() => start(async () => { await signOutEverywhereAction(); router.refresh(); })}>
            {t("signOutAll")}
          </button>
        </section>

        <details className="border-t border-wood/25 pt-6">
          <summary className="flex min-h-[44px] w-fit cursor-pointer items-center text-sm text-sumi/70 underline decoration-wood/40 underline-offset-4">{t("deleteTitle")}</summary>
          <form
            action={(form) =>
              start(async () => {
                const r = await deleteAccountAction(String(form.get("confirm") ?? "")).catch(() => ({ ok: false, error: "generic" }));
                if (r.ok) {
                  setDeleteMsg(t("deleted"));
                  router.refresh();
                } else setDeleteMsg(err(r.error));
              })
            }
            className="mt-4 space-y-4"
          >
            <p className="text-sm text-sumi/80">{t("deleteBody")}</p>
            <label htmlFor="d-confirm" className="sr-only">
              {t("email")}
            </label>
            <input id="d-confirm" name="confirm" type="email" inputMode="email" autoComplete="off" placeholder={member.email} className={field} />
            <button type="submit" disabled={pending} className={quietButton}>
              {t("deleteCta")}
            </button>
            <p role="status" className="min-h-[1.25rem] text-sm">
              {deleteMsg}
            </p>
          </form>
        </details>
      </div>
    </div>
  );
}

function OrderRow({ o, text, locale }: { o: Order; text: string; locale: "es" | "en" }) {
  return (
    <>
      <span className="min-w-0">
        <span className="block">
          {o.label} · {new Date(o.createdAt).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { timeZone: "Europe/Madrid", day: "numeric", month: "short" })}
        </span>
        <span className="block text-sm text-sumi/70">{text}</span>
      </span>
      <span className="shrink-0 tabular-nums">{formatEuro(o.totalCents, locale)}</span>
    </>
  );
}

/** Section heading in the carta style: a framed kanji numeral, then the title in small caps. */
function SectionTitle({ id, numeral, children }: { id: string; numeral: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-eyebrow uppercase text-sumi/70">
      <Numeral>{numeral}</Numeral>
      {children}
    </h2>
  );
}

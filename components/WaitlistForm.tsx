"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonClass } from "./Button";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toneStyles = {
  light: {
    field:
      "w-full border-b border-wood/40 bg-transparent py-2.5 text-sumi placeholder:text-sumi/70 transition-colors duration-300 focus:border-gold aria-[invalid=true]:border-b-2 aria-[invalid=true]:border-sumi",
    label: "text-eyebrow uppercase text-sumi/70",
    error: "mt-2 border-l-2 border-sumi pl-2.5 text-sm text-sumi",
    formError: "text-sm text-sumi/70",
    successTitle: "font-serif text-3xl font-light text-sumi outline-none",
    successLine: "measure mt-3 text-sumi/75",
    consent: "text-sm text-sumi/75",
    checkbox: "mt-0.5 size-5 shrink-0 accent-sumi",
    button: buttonClass,
  },
  dark: {
    // "dark" = the bright brand-green band: sumi ink throughout (AA >= 4.8:1)
    field:
      "w-full border-b border-sumi/30 bg-transparent py-2.5 text-sumi placeholder:text-sumi/80 transition-colors duration-300 focus:border-sumi aria-[invalid=true]:border-b-2 aria-[invalid=true]:border-sumi",
    label: "text-eyebrow uppercase text-sumi/85",
    error: "mt-2 border-l-2 border-sumi pl-2.5 text-sm text-sumi",
    formError: "text-sm text-sumi/85",
    successTitle: "font-serif text-3xl font-light text-sumi outline-none",
    successLine: "measure mt-3 text-sumi/85",
    consent: "text-sm text-sumi/85",
    checkbox: "mt-0.5 size-5 shrink-0 accent-sumi",
    button:
      "inline-flex min-h-[44px] items-center justify-center rounded-[2px] bg-sumi px-7 py-3 text-sm font-medium tracking-wide text-washi transition-opacity duration-200 hover:opacity-90 active:opacity-75 disabled:opacity-50",
  },
} as const;

export function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const s = toneStyles[dark ? "dark" : "light"];
  const t = useTranslations("waitlist");
  const locale = useLocale();
  const ids = useId();
  const nameId = `${ids}-name`;
  const emailId = `${ids}-email`;
  const consentId = `${ids}-consent`;

  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    consent?: string;
    form?: string;
  }>({});
  const successRef = useRef<HTMLParagraphElement>(null);
  // Pressing "send" on a phone keyboard with only the box unticked: guide
  // to the box first instead of greeting the visitor with an error.
  const consentNudged = useRef(false);

  // Back from a no-JavaScript submission (?waitlist=ok): show the thanks.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("waitlist") === "ok") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL
      setStatus("success");
    }
  }, []);

  const clearError = (field: "name" | "email" | "consent") =>
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return; // double-submit guard
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const consent = data.get("consent") === "on";

    const next: typeof errors = {};
    if (!name) next.name = t("errorName");
    if (!EMAIL_RE.test(email)) next.email = t("errorEmail");
    if (!consent) {
      if (!next.name && !next.email && !consentNudged.current) {
        consentNudged.current = true;
        const box = document.getElementById(consentId);
        box?.scrollIntoView({ block: "center", behavior: "smooth" });
        box?.focus({ preventScroll: true });
        return;
      }
      next.consent = t("errorConsent");
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Move focus to the first invalid field so keyboard/AT users land there.
      const firstInvalid = next.name ? nameId : next.email ? emailId : consentId;
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, locale }),
      });
      if (res.status === 429) {
        setStatus("error");
        setErrors({ form: t("errorRate") });
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrors({ form: t("errorGeneric") });
        return;
      }
      setStatus("success");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setStatus("error");
      setErrors({ form: t("errorGeneric") });
    }
  }

  if (status === "success") {
    return (
      <div className="anim-rise min-h-[320px]">
        <p
          ref={successRef}
          tabIndex={-1}
          className={s.successTitle}
        >
          {t("successTitle")}
        </p>
        <p className={s.successLine}>{t("successLine")}</p>
      </div>
    );
  }

  return (
    // method/action: without JavaScript the browser POSTs to the API (never a
    // GET that would put the name and email in the URL); with JS, onSubmit wins.
    <form
      onSubmit={onSubmit}
      method="post"
      action="/api/waitlist"
      noValidate
      className="min-h-[320px] max-w-md"
    >
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-6">
        <div>
          <label htmlFor={nameId} className={s.label}>
            {t("nameLabel")}
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            onInput={() => clearError("name")}
            placeholder={t("namePlaceholder")}
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            className={s.field}
          />
          {errors.name ? (
            <p id={`${nameId}-error`} role="alert" className={s.error}>
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={emailId} className={s.label}>
            {t("emailLabel")}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="send"
            onInput={() => clearError("email")}
            placeholder={t("emailPlaceholder")}
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            className={s.field}
          />
          {errors.email ? (
            <p id={`${emailId}-error`} role="alert" className={s.error}>
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          {/* The whole row is the target (44px+), not the 20px box alone. */}
          <label htmlFor={consentId} className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1">
            <input
              id={consentId}
              name="consent"
              type="checkbox"
              className={s.checkbox}
              onChange={() => clearError("consent")}
              aria-invalid={errors.consent ? "true" : undefined}
              aria-describedby={errors.consent ? `${consentId}-error` : undefined}
            />
            <span className={s.consent}>{t("consent")}</span>
          </label>
          {errors.consent ? (
            <p id={`${consentId}-error`} role="alert" className={s.error}>
              {errors.consent}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={status === "submitting"}
            className={s.button}
          >
            {status === "submitting" ? t("submitting") : t("submit")}
          </button>
          {errors.form ? (
            <p role="alert" className={s.formError}>
              {errors.form}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

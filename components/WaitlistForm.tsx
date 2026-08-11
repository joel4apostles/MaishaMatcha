"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonClass } from "./Button";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClass =
  "w-full border-b border-wood/40 bg-transparent py-2.5 text-sumi placeholder:text-sumi/55 transition-colors focus:border-gold";

export function WaitlistForm() {
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const consent = data.get("consent") === "on";

    const next: typeof errors = {};
    if (!name) next.name = t("errorName");
    if (!EMAIL_RE.test(email)) next.email = t("errorEmail");
    if (!consent) next.consent = t("errorConsent");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

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
      <div className="min-h-[220px]">
        <p
          ref={successRef}
          tabIndex={-1}
          className="font-serif text-3xl font-light text-sumi outline-none"
        >
          {t("successTitle")}
        </p>
        <p className="measure mt-3 text-sumi/75">{t("successLine")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="min-h-[220px] max-w-md">
      <div className="grid gap-6">
        <div>
          <label htmlFor={nameId} className="text-eyebrow uppercase text-sumi/70">
            {t("nameLabel")}
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            className={fieldClass}
          />
          {errors.name ? (
            <p id={`${nameId}-error`} role="alert" className="mt-2 text-sm text-sumi/70">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={emailId} className="text-eyebrow uppercase text-sumi/70">
            {t("emailLabel")}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            className={fieldClass}
          />
          {errors.email ? (
            <p id={`${emailId}-error`} role="alert" className="mt-2 text-sm text-sumi/70">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-start gap-3">
            <input
              id={consentId}
              name="consent"
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-sumi"
              aria-invalid={errors.consent ? "true" : undefined}
              aria-describedby={errors.consent ? `${consentId}-error` : undefined}
            />
            <label htmlFor={consentId} className="text-sm text-sumi/75">
              {t("consent")}
            </label>
          </div>
          {errors.consent ? (
            <p id={`${consentId}-error`} role="alert" className="mt-2 text-sm text-sumi/70">
              {errors.consent}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={status === "submitting"}
            className={buttonClass}
          >
            {status === "submitting" ? t("submitting") : t("submit")}
          </button>
          {errors.form ? (
            <p role="alert" className="text-sm text-sumi/70">
              {errors.form}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

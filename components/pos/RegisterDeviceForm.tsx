"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { registerDeviceAction, type RegisterState } from "@/app/(pos)/pos/actions";

export function RegisterDeviceForm() {
  const t = useTranslations("pos.register");
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    registerDeviceAction,
    undefined,
  );

  return (
    <form action={action} className="mt-10 max-w-[28rem]">
      <label htmlFor="device-name" className="block text-sm text-sumi/85">
        {t("label")}
      </label>
      <input
        id="device-name"
        name="name"
        required
        maxLength={60}
        autoComplete="off"
        placeholder={t("placeholder")}
        aria-invalid={state?.error === "name" || undefined}
        aria-describedby={state?.error ? "device-error" : undefined}
        className="mt-2 block min-h-[52px] w-full rounded-[2px] border border-wood/50 bg-transparent px-4 text-lg placeholder:text-sumi/40 focus:border-sumi/70"
      />
      <p id="device-error" role="alert" className="mt-3 min-h-[1.5rem] text-sm text-sumi">
        {state?.error === "name"
          ? t("errorName")
          : state?.error === "owner"
            ? t("errorOwner")
            : state?.error === "failed"
              ? t("errorFailed")
              : null}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex min-h-[52px] items-center justify-center rounded-[2px] bg-sumi px-8 text-sm font-medium tracking-wide text-washi transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}

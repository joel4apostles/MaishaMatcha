"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { emailReceiptAction } from "@/app/(pos)/pos/sale-actions";

/** Send the ticket by email at the counter. The address is not stored. */
export function EmailReceipt({ orderId }: { orderId: number }) {
  const t = useTranslations("pos.ticket");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-8 border-t border-wood/30 pt-6 print:hidden"
      action={(form) =>
        start(async () => {
          const r = await emailReceiptAction(orderId, String(form.get("email") ?? "")).catch(() => ({ ok: false as const, error: "generic" }));
          setMsg(r.ok ? t("emailSent") : t(r.error === "no-email" ? "emailOff" : r.error === "invalid" ? "emailInvalid" : "emailFailed"));
        })
      }
    >
      <label htmlFor="receipt-email" className="block text-sm text-sumi/80">
        {t("emailLabel")}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="receipt-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          className="min-h-[48px] min-w-0 flex-1 rounded-[2px] border border-wood/50 bg-transparent px-3 text-base"
        />
        <button type="submit" disabled={pending} className="min-h-[48px] rounded-[2px] border border-sumi/55 px-5 text-sm disabled:opacity-40">
          {t("emailSend")}
        </button>
      </div>
      <p role="status" className="mt-2 min-h-[1.25rem] text-sm">
        {msg}
      </p>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { pinLoginAction } from "@/app/(pos)/pos/actions";
import type { PosStaff } from "@/lib/pos/server";

const MAX = 6;
const MIN = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Two calm steps: tap your name, then your PIN. Large targets for a counter
 * tablet (keys 72px), physical keyboard works too. Errors say what happened
 * and what to do, in a polite live region.
 */
export function PinLogin({ staff }: { staff: PosStaff[] }) {
  const t = useTranslations("pos.login");
  const router = useRouter();
  const [person, setPerson] = useState<PosStaff | null>(staff.length === 1 ? staff[0] : null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const press = useCallback(
    (digit: string) => {
      setError(null);
      setPin((p) => (p.length < MAX ? p + digit : p));
    },
    [],
  );
  const erase = useCallback(() => setPin((p) => p.slice(0, -1)), []);

  const submit = useCallback(() => {
    if (!person || pin.length < MIN || pending) return;
    startTransition(async () => {
      try {
        const result = await pinLoginAction(person.id, pin);
        if (result.ok) {
          router.refresh();
          return;
        }
        setPin("");
        if (result.error === "wrong-pin") setError(t("wrongPin", { left: result.left ?? 0 }));
        else if (result.error === "locked") setError(t("locked", { minutes: result.minutes ?? 15 }));
        else if (result.error === "no-device") setError(t("noDevice"));
        else {
          setError(t("unknown"));
          setPerson(null);
        }
      } catch {
        setError(t("failed"));
      }
    });
  }, [person, pin, pending, router, t]);

  useEffect(() => {
    if (!person) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") erase();
      else if (e.key === "Enter") submit();
      else if (e.key === "Escape") {
        setPerson(null);
        setPin("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [person, press, erase, submit]);

  if (staff.length === 0) {
    return <p className="max-w-[46ch] text-base leading-relaxed text-sumi/85">{t("noStaff")}</p>;
  }

  if (!person) {
    return (
      <div>
        <h1 className="font-serif text-[2rem] font-light leading-tight">{t("title")}</h1>
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setPerson(s);
                  setPin("");
                  setError(null);
                }}
                className="flex min-h-[88px] w-full items-center rounded-[2px] border border-wood/40 px-6 text-left font-serif text-2xl font-light transition-colors hover:border-sumi/60 active:bg-sumi/[0.04]"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <h1 className="font-serif text-[2rem] font-light leading-tight">
        {t("pinFor", { name: person.name })}
      </h1>

      <div
        className="mt-8 flex h-6 items-center gap-3"
        role="img"
        aria-label={t("digits", { count: pin.length })}
      >
        {Array.from({ length: MAX }, (_, i) => (
          <span
            key={i}
            className={`size-3 rounded-full border border-sumi/70 transition-colors ${
              i < pin.length ? "bg-sumi" : i >= MIN ? "border-dashed border-sumi/30" : ""
            }`}
          />
        ))}
      </div>

      <p role="alert" aria-live="polite" className="mt-4 min-h-[3rem] text-sm leading-snug text-sumi">
        {error}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <Key key={k} onPress={() => press(k)} disabled={pending}>
            {k}
          </Key>
        ))}
        <Key onPress={erase} disabled={pending || pin.length === 0} label={t("delete")} quiet>
          <span aria-hidden>⌫</span>
        </Key>
        <Key onPress={() => press("0")} disabled={pending}>
          0
        </Key>
        <button
          type="button"
          onClick={submit}
          disabled={pending || pin.length < MIN}
          className="min-h-[72px] rounded-[2px] bg-sumi text-base font-medium tracking-wide text-washi transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-35"
        >
          {t("enter")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setPerson(null);
          setPin("");
          setError(null);
        }}
        className="mt-8 inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4 hover:decoration-sumi/70"
      >
        {t("back")}
      </button>
    </div>
  );
}

function Key({
  children,
  onPress,
  disabled,
  label,
  quiet,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className={`min-h-[72px] rounded-[2px] text-2xl tabular-nums transition-colors active:bg-sumi/[0.06] disabled:opacity-35 ${
        quiet ? "text-sumi/70" : "border border-wood/40 hover:border-sumi/50"
      }`}
    >
      {children}
    </button>
  );
}

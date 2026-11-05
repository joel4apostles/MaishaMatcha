"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { pinLoginAction, type PinActionResult } from "@/app/(pos)/pos/actions";
import type { PosStaff } from "@/lib/pos/core";

const MAX = 6;
const MIN = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Two calm steps: tap your name, then your PIN. Large targets for a counter
 * tablet (keys 72px); a physical keyboard works too. Each step moves focus
 * to its heading, and errors are announced in a status region.
 */
export function PinLogin({ staff }: { staff: PosStaff[] }) {
  const t = useTranslations("pos.login");
  const router = useRouter();
  const [person, setPerson] = useState<PosStaff | null>(staff.length === 1 ? staff[0] : null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new step's heading (not on first paint).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [person?.id]);

  const press = useCallback((digit: string) => {
    setError(null);
    setPin((p) => (p.length < MAX ? p + digit : p));
  }, []);
  const erase = useCallback(() => setPin((p) => p.slice(0, -1)), []);
  const choose = useCallback((s: PosStaff | null) => {
    setPerson(s);
    setPin("");
  }, []);

  const explain = useCallback(
    (result: Exclude<PinActionResult, { ok: true }>): string => {
      switch (result.error) {
        case "wrong-pin":
          return t("wrongPin", { left: result.left });
        case "locked":
          return t("locked", { minutes: result.minutes });
        case "no-device":
          return t("noDevice");
        case "unknown-staff":
          return t("unknown");
        case "invalid":
          return t("invalid");
        default: {
          const unreachable: never = result;
          return String(unreachable);
        }
      }
    },
    [t],
  );

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
        setError(explain(result));
        if (result.error === "unknown-staff") choose(null);
      } catch {
        setError(t("failed"));
      }
    });
  }, [person, pin, pending, router, t, explain, choose]);

  useEffect(() => {
    if (!person) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      // A focused button handles its own Enter/Space; don't act twice.
      if (e.target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
      if (pending && e.key !== "Escape") return;
      let handled = true;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") erase();
      else if (e.key === "Enter") submit();
      else if (e.key === "Escape") choose(null);
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [person, pending, press, erase, submit, choose]);

  const status = (
    <p role="status" className="mt-4 min-h-[3rem] text-sm leading-snug text-sumi">
      {error}
    </p>
  );

  if (staff.length === 0) {
    return <p className="max-w-[46ch] text-base leading-relaxed text-sumi/85">{t("noStaff")}</p>;
  }

  if (!person) {
    return (
      <div>
        <h1 ref={heading} tabIndex={-1} className="font-serif text-[2rem] font-light leading-tight outline-none">
          {t("title")}
        </h1>
        {status}
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  choose(s);
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
      <h1 ref={heading} tabIndex={-1} className="font-serif text-[2rem] font-light leading-tight outline-none">
        {t("pinFor", { name: person.name })}
      </h1>

      <div className="mt-8 flex h-6 items-center gap-3" role="img" aria-label={t("digits", { count: pin.length, max: MAX })}>
        {Array.from({ length: MAX }, (_, i) => (
          <span
            key={i}
            className={`size-3 rounded-full border transition-colors ${
              i < pin.length
                ? "border-sumi bg-sumi"
                : i >= MIN
                  ? "border-dashed border-sumi/35"
                  : "border-sumi/70"
            }`}
          />
        ))}
      </div>

      {status}

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
          setError(null);
          choose(null);
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
  children: ReactNode;
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

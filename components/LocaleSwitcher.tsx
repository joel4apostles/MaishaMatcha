"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Each language named in itself (an endonym reads the same on every page).
const NAMES: Record<Locale, string> = { es: "Español", en: "English" };

/**
 * Language dropdown: a quiet "ES ⌄" button opening a small washi panel
 * (disclosure pattern: Escape or a click outside closes it and returns
 * focus). usePathname() is locale-agnostic, so each link re-maps to the
 * localized URL; query and hash are kept across the switch.
 * `tone="light"` is for the header over the hero picture; `placement="up"`
 * opens the panel above the button (footer).
 */
export function LocaleSwitcher({
  tone = "dark",
  placement = "down",
}: {
  tone?: "light" | "dark";
  placement?: "down" | "up";
}) {
  const active = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams<{ token?: string; slug?: string }>();
  // Dynamic routes carry their params (order token, product slug).
  const href =
    pathname === "/pedido/[token]" && params.token
      ? ({ pathname, params: { token: params.token } } as const)
      : pathname === "/tienda/[slug]" && params.slug
        ? ({ pathname, params: { slug: params.slug } } as const)
        : (pathname as Exclude<typeof pathname, "/pedido/[token]" | "/tienda/[slug]">);
  const t = useTranslations("footer");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buttonTone = tone === "light" ? "text-washi" : "text-sumi/80 hover:text-sumi";

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t("switcherAria")}: ${NAMES[active]}`}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 px-1.5 text-eyebrow uppercase transition-colors ${buttonTone}`}
      >
        {active}
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className={`h-1.5 w-2.5 transition-transform duration-200 ${open ? "rotate-180" : ""} ${placement === "up" ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      <ul
        id={panelId}
        hidden={!open}
        className={`absolute z-50 min-w-[10rem] rounded-[2px] border border-wood/30 bg-washi py-1.5 text-sumi ${
          // Footer: left-aligned on phones (the button sits at the left edge).
          placement === "up" ? "bottom-full left-0 mb-2 md:left-auto md:right-0" : "right-0 top-full mt-2"
        }`}
      >
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Link
              href={href}
              locale={locale}
              lang={locale}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                if (locale === active) return;
                window.location.assign(
                  getPathname({ href, locale }) + window.location.search + window.location.hash,
                );
              }}
              aria-current={locale === active ? "true" : undefined}
              className={`flex min-h-[44px] items-center justify-between gap-6 px-4 text-sm transition-colors hover:bg-sumi/[0.04] ${
                locale === active ? "text-sumi" : "text-sumi/70 hover:text-sumi"
              }`}
            >
              <span>{NAMES[locale]}</span>
              <span className="text-eyebrow uppercase text-sumi/50">{locale}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

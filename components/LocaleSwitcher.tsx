"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * ES/EN switch. usePathname() returns the internal (locale-agnostic) pathname,
 * so Link re-maps it to the correct localized URL per target locale.
 * `tone="light"` inverts colors for use over dark backgrounds.
 */
export function LocaleSwitcher({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const active = useLocale();
  const pathname = usePathname();
  const t = useTranslations("footer");

  const activeClass = tone === "light" ? "text-washi" : "text-sumi";
  const idleClass =
    tone === "light"
      ? "text-washi/70 transition-colors hover:text-washi"
      : "text-sumi/70 transition-colors hover:text-sumi";
  const dotClass = tone === "light" ? "text-washi/40" : "text-wood/50";

  return (
    <div
      role="group"
      aria-label={t("switcherAria")}
      className="flex items-center gap-2 text-eyebrow uppercase"
    >
      {routing.locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-2">
          <Link
            href={pathname}
            locale={locale}
            aria-current={locale === active ? "true" : undefined}
            className={`inline-flex items-center px-1 py-3 -my-3 ${locale === active ? activeClass : idleClass}`}
          >
            {locale}
          </Link>
          {index < routing.locales.length - 1 ? (
            <span aria-hidden="true" className={dotClass}>
              ·
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

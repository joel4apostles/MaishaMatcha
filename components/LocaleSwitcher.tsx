"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * ES/EN switch. usePathname() returns the internal (locale-agnostic) pathname,
 * so Link re-maps it to the correct localized URL per target locale.
 */
export function LocaleSwitcher() {
  const active = useLocale();
  const pathname = usePathname();
  const t = useTranslations("footer");

  return (
    <div
      aria-label={t("switcherAria")}
      className="flex items-center gap-2 text-eyebrow uppercase"
    >
      {routing.locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-2">
          <Link
            href={pathname}
            locale={locale}
            aria-current={locale === active ? "true" : undefined}
            className={
              locale === active
                ? "text-sumi"
                : "text-sumi/60 transition-colors hover:text-sumi"
            }
          >
            {locale}
          </Link>
          {index < routing.locales.length - 1 ? (
            <span aria-hidden="true" className="text-wood/50">
              ·
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

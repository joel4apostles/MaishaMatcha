"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { BrandMark } from "./BrandMark";
import { BrandWordmark } from "./BrandWordmark";

const NAV: { href: AppPathname; key: "menu" | "story" | "events" | "order" }[] = [
  { href: "/menu", key: "menu" },
  { href: "/historia", key: "story" },
  { href: "/eventos", key: "events" },
  { href: "/pedir", key: "order" },
];

/**
 * Sticky single-row header on washi everywhere (the home page opens light
 * since 2026-11-06). 44px targets, mark only on phones, aligned to the page
 * grid (same gutter and 1100px container as Section).
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Slide-in underline (flat pseudo-element); stays open on the active page.
  const linkBase =
    "relative -mx-1.5 inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-1.5 text-[13px] transition-colors sm:text-sm " +
    "after:absolute after:bottom-2.5 after:left-1.5 after:right-1.5 after:h-px after:origin-left " +
    "after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out " +
    "hover:after:scale-x-100 aria-[current=page]:after:scale-x-100";
  const linkTone = "text-sumi/80 hover:text-sumi";

  return (
    <header
      data-site-header=""
      className="sticky top-0 z-40 border-b border-wood/20 bg-washi px-6 sm:px-8"
    >
      <nav
        aria-label={t("aria")}
        className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-3"
      >
        <Link
          href="/"
          aria-current={isHome ? "page" : undefined}
          aria-label="maisha matcha"
          className="-ml-2 flex min-h-[44px] min-w-[44px] items-center gap-2.5 pl-2 text-matcha"
        >
          {/* Phones: the mark alone, so every target can be 44px. */}
          <BrandMark className="h-6 w-auto shrink-0" />
          <BrandWordmark className="hidden h-8 w-auto shrink-0 sm:block" />
        </Link>
        <div className="flex items-center gap-4 sm:gap-7">
          <ul className="flex items-center gap-3 sm:gap-6">
            {NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`${linkBase} ${linkTone}`}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  );
}

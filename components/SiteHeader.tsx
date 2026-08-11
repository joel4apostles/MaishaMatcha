"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";
import { LocaleSwitcher } from "./LocaleSwitcher";

const NAV: { href: AppPathname; key: "menu" | "story" | "events" }[] = [
  { href: "/menu", key: "menu" },
  { href: "/historia", key: "story" },
  { href: "/eventos", key: "events" },
];

/**
 * Sticky header, single 64px row on all viewports. Over the home hero it is
 * transparent with light text; once scrolled (or on any inner page) it gains
 * the washi background. Colors only transition — no layout shift.
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overlay = isHome && atTop;

  // Slide-in underline (flat pseudo-element); stays open on the active page.
  const linkBase =
    "relative inline-flex items-center py-2.5 -my-2.5 text-[13px] transition-colors sm:text-sm " +
    "after:absolute after:bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left " +
    "after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out " +
    "hover:after:scale-x-100 aria-[current=page]:after:scale-x-100";
  const linkTone = overlay
    ? "text-washi/85 hover:text-washi"
    : "text-sumi/80 hover:text-sumi";

  return (
    <header
      className={`${overlay ? "dark-band border-b border-transparent bg-transparent" : "border-b border-wood/20 bg-washi"} sticky top-0 z-40 transition-colors duration-300`}
    >
      <nav
        aria-label={t("aria")}
        className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-8"
      >
        <Link
          href="/"
          aria-current={isHome ? "page" : undefined}
          className={`font-sans text-base font-medium lowercase tracking-tight sm:text-lg ${overlay ? "text-washi" : "text-gold"}`}
        >
          maisha matcha
        </Link>
        <div className="flex items-center gap-4 sm:gap-7">
          <ul className="flex items-center gap-4 sm:gap-6">
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
          <LocaleSwitcher tone={overlay ? "light" : "dark"} />
        </div>
      </nav>
    </header>
  );
}

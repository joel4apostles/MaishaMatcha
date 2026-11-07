"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/routing";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { BrandMark } from "./BrandMark";
import { BrandWordmark } from "./BrandWordmark";
import { MobileMenu } from "./MobileMenu";

const NAV: { href: AppPathname; key: "menu" | "story" | "events" | "order" }[] = [
  { href: "/menu", key: "menu" },
  { href: "/historia", key: "story" },
  { href: "/eventos", key: "events" },
  { href: "/pedir", key: "order" },
];

/**
 * Sticky header, single 64px row on all viewports. Over the home hero it
 * sits on a flat sumi/50 band (measured: washi text clears 4.6:1 against the
 * hero's brightest pixels); once scrolled, or on any inner page, it turns
 * washi. Colors only transition, no layout shift. Aligned to the page grid
 * (same gutter and 1100px container as Section).
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
    "relative -mx-1.5 inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-1.5 text-[13px] transition-colors sm:text-sm " +
    "after:absolute after:bottom-2.5 after:left-1.5 after:right-1.5 after:h-px after:origin-left " +
    "after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out " +
    "hover:after:scale-x-100 aria-[current=page]:after:scale-x-100";
  const linkTone = overlay
    ? "text-washi hover:text-washi"
    : "text-sumi/80 hover:text-sumi";

  return (
    <header
      data-site-header=""
      className={`${overlay ? "dark-band border-b border-transparent bg-sumi/50" : "border-b border-wood/20 bg-washi"} sticky top-0 z-40 px-6 transition-colors duration-300 sm:px-8`}
    >
      <nav
        aria-label={t("aria")}
        className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-3"
      >
        <Link
          href="/"
          aria-current={isHome ? "page" : undefined}
          aria-label="maisha matcha"
          className={`-ml-2 flex min-h-[44px] min-w-[44px] items-center gap-2.5 pl-2 ${overlay ? "text-washi" : "text-matcha"}`}
        >
          {/* Phones: the mark alone, so every target can be 44px. */}
          <BrandMark className="h-6 w-auto shrink-0" />
          <BrandWordmark className="hidden h-8 w-auto shrink-0 sm:block" />
        </Link>
        {/* Phones: the one action people come for, and the word "Menú". */}
        <div className="flex items-center gap-5 sm:hidden">
          <Link
            href="/pedir"
            aria-current={pathname === "/pedir" ? "page" : undefined}
            className={`${linkBase} ${linkTone}`}
          >
            {t("order")}
          </Link>
          <MobileMenu tone={overlay ? "light" : "dark"} />
        </div>
        <div className="hidden items-center gap-7 sm:flex">
          <ul className="flex items-center gap-6">
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
      {/* Without JavaScript the header can't turn opaque on scroll: let it
          scroll away with the hero instead of floating unreadable over washi. */}
      <noscript dangerouslySetInnerHTML={{ __html: "<style>[data-site-header]{position:static}</style>" }} />
    </header>
  );
}

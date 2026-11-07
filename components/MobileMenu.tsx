"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppPathname, Locale } from "@/i18n/routing";
import { site, siteHours } from "@/content/site";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { BrandMark } from "./BrandMark";

const ITEMS: { href: AppPathname; key: "menu" | "story" | "events" | "shop" | "order" | "account" }[] = [
  { href: "/menu", key: "menu" },
  { href: "/pedir", key: "order" },
  { href: "/tienda", key: "shop" },
  { href: "/eventos", key: "events" },
  { href: "/historia", key: "story" },
  { href: "/cuenta", key: "account" },
];

/**
 * Phones only: a "Menú" word (not an icon) opens a full-screen washi sheet
 * with the whole site in large serif links, the language, and the address.
 * Built on the native modal <dialog>: the page behind is inert to keyboard
 * and screen readers, Escape closes, focus goes in on open and back to the
 * button on close. Scroll is locked while open. Nothing animates beyond the
 * site's one rise, and reduced motion shows it still.
 */
export function MobileMenu({ tone }: { tone: "light" | "dark" }) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    dialog.current?.showModal();
    document.documentElement.style.overflow = "hidden";
    setOpen(true);
  };
  const close = () => dialog.current?.close();

  // Native close (Escape, a link, the button) always lands here.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => {
      document.documentElement.style.overflow = "";
      setOpen(false);
      opener.current?.focus();
    };
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);

  // A navigation (including back/forward) closes the sheet.
  useEffect(() => {
    if (dialog.current?.open) dialog.current.close();
  }, [pathname]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-1 text-sm tracking-wide ${tone === "light" ? "text-washi" : "text-sumi"}`}
      >
        {t("menuOpen")}
      </button>

      <dialog
        ref={dialog}
        aria-label={t("menuAria")}
        className="m-0 h-[100dvh] max-h-none w-full max-w-none bg-washi p-0 text-sumi backdrop:bg-sumi/40"
      >
        <div className="flex min-h-full flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" onClick={close} aria-label="maisha matcha" className="-ml-2 flex min-h-[44px] min-w-[44px] items-center pl-2 text-matcha">
              <BrandMark className="h-6 w-auto" />
            </Link>
            <button
              type="button"
              onClick={close}
              autoFocus
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-1 text-sm tracking-wide text-sumi"
            >
              {t("menuClose")}
            </button>
          </div>

          {/* The links sit low, in thumb reach; the hairlines are the only ornament. */}
          <nav aria-label={t("aria")} className="anim-rise mt-auto">
            <ul className="border-t border-wood/35">
              {ITEMS.map((item) => (
                <li key={item.key} className="border-b border-wood/35">
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex min-h-[60px] items-center justify-between font-serif text-[2rem] font-light leading-none text-sumi aria-[current=page]:text-sumi/60"
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 flex items-end justify-between gap-6 text-sm text-sumi/75">
            <p>
              {site.address}, {site.city}
              <span className="block">{siteHours(locale)}</span>
            </p>
            <LocaleSwitcher tone="dark" placement="up" />
          </div>
        </div>
      </dialog>
    </>
  );
}

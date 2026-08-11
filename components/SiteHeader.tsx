import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

// Underline slides in from the left on hover: a flat 1px pseudo-element that
// scales open. No gradients (brand law), no JS. Hit area expanded to 44px
// without shifting layout (py + negative margin).
const linkClass =
  "relative inline-flex items-center py-2.5 -my-2.5 text-sm text-sumi/80 transition-colors hover:text-sumi " +
  "after:absolute after:bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left " +
  "after:scale-x-0 after:bg-wood after:transition-transform after:duration-300 after:ease-out " +
  "hover:after:scale-x-100";

export function SiteHeader() {
  const t = useTranslations("nav");

  return (
    <header className="border-b border-wood/20">
      <nav
        aria-label={t("aria")}
        className="mx-auto flex max-w-[1100px] flex-col gap-4 px-6 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8 sm:gap-y-3 sm:px-8"
      >
        <Link
          href="/"
          className="font-sans text-lg font-medium lowercase tracking-tight text-gold"
        >
          maisha matcha
        </Link>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li>
              <Link href="/menu" className={linkClass}>
                {t("menu")}
              </Link>
            </li>
            <li>
              <Link href="/historia" className={linkClass}>
                {t("story")}
              </Link>
            </li>
            <li>
              <Link href="/eventos" className={linkClass}>
                {t("events")}
              </Link>
            </li>
          </ul>
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  );
}

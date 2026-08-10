import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

const linkClass =
  "text-sm text-sumi/80 underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:text-sumi hover:decoration-wood/60";

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

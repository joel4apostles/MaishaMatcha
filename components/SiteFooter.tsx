import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { site, siteHours } from "@/content/site";
import { LocaleSwitcher } from "./LocaleSwitcher";

const legalLinkClass =
  "text-sm text-sumi/70 underline decoration-wood/40 decoration-1 underline-offset-4 transition-colors hover:text-sumi hover:decoration-sumi/70";

export function SiteFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="border-t border-wood/20">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-x-8 gap-y-10 px-6 py-16 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_auto]">
        <div className="max-w-xs">
          <p className="font-sans text-xl font-medium lowercase text-gold">
            maisha matcha
          </p>
          <p className="mt-3 text-sm text-sumi/70">{t("tagline")}</p>
        </div>

        <div>
          <p className="text-eyebrow uppercase text-sumi/70">
            {t("visitLabel")}
          </p>
          <address className="mt-3 text-sm not-italic text-sumi/80">
            {site.address}
            <br />
            {site.country}
          </address>
        </div>

        <div>
          <p className="text-eyebrow uppercase text-sumi/70">
            {t("hoursLabel")}
          </p>
          <p className="mt-3 text-sm text-sumi/80">{siteHours(locale)}</p>
          <p className="mt-4 text-eyebrow uppercase text-sumi/70">
            {t("followLabel")}
          </p>
          <a
            href={site.instagramUrl}
            className="mt-3 inline-flex items-center gap-2 text-sm text-sumi/80 underline decoration-wood/40 decoration-1 underline-offset-4 transition-colors hover:text-sumi hover:decoration-sumi/70"
            rel="noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4 text-sumi/70"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
            </svg>
            {site.instagram}
          </a>
        </div>

        <div className="flex flex-col items-start gap-4 md:items-end">
          <LocaleSwitcher />
        </div>
      </div>

      {/* Monumental closing wordmark — quiet wood tone, decorative only. */}
      <p
        aria-hidden="true"
        className="select-none overflow-hidden whitespace-nowrap px-4 pb-1 text-center font-sans text-[clamp(3rem,11vw,9.5rem)] font-medium lowercase leading-none tracking-tight text-wood/20"
      >
        maisha matcha
      </p>

      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-wood/15 px-6 py-6 sm:px-8">
        <p className="text-sm text-sumi/70">{t("rights")}</p>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/aviso-legal" className={legalLinkClass}>
            {t("legalNotice")}
          </Link>
          <Link href="/privacidad" className={legalLinkClass}>
            {t("privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

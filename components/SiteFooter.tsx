import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { site, siteHours, siteMapsUrl } from "@/content/site";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { BrandWordmark } from "./BrandWordmark";

const quietLink =
  "inline-flex min-h-[44px] items-center gap-2 text-sm text-sumi/80 underline decoration-wood/40 decoration-1 underline-offset-4 transition-colors hover:text-sumi hover:decoration-sumi/70";

const label = "text-eyebrow uppercase text-sumi/70";

/**
 * Same gutter and 1100px container as Section, so footer text lines up with
 * the page above it. Visit information (address, directions, hours, email)
 * is what a phone visitor needs; every link is a 44px touch target.
 */
export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const locale = useLocale();

  return (
    <footer className="border-t border-wood/20 px-6 sm:px-8">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-x-8 gap-y-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <p className="max-w-xs font-serif text-xl font-light leading-snug text-sumi">{t("tagline")}</p>

        <div>
          <p className={label}>{t("visitLabel")}</p>
          <address className="mt-3 text-sm not-italic leading-relaxed text-sumi/80">
            {site.address}
            <br />
            {site.city}, {site.country}
          </address>
          <a href={siteMapsUrl} className={`${quietLink} mt-1`} rel="noreferrer" target="_blank">
            {t("directions")}
          </a>
        </div>

        <div>
          <p className={label}>{t("hoursLabel")}</p>
          <p className="mt-3 text-sm leading-relaxed text-pretty text-sumi/80">{siteHours(locale)}</p>
          <p className={`${label} mt-10`}>{t("followLabel")}</p>
          <div className="mt-1 flex flex-col items-start">
            <a href={site.instagramUrl} className={quietLink} rel="noreferrer" target="_blank">
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
            <a href={`mailto:${site.email}`} className={quietLink}>
              {site.email}
            </a>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end">
          <LocaleSwitcher />
        </div>
      </div>

      {/* Monumental closing wordmark, the kit's serif lockup in brand green at
          40% (founder decision 2026-11-05: present, never the loudest thing).
          Decorative; held inside the page grid with air below it. */}
      <div aria-hidden="true" className="mx-auto max-w-[1100px] select-none pb-10 text-matcha/40 sm:pb-16">
        <BrandWordmark className="h-auto w-full" />
      </div>

      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-wood/25 py-4">
        <p className="text-sm text-sumi/70">{t("rights")}</p>
        <nav aria-label={t("legalAria")} className="flex flex-wrap items-center gap-x-6">
          <Link href="/cuenta" className={quietLink}>
            {nav("account")}
          </Link>
          <Link href="/aviso-legal" className={quietLink}>
            {t("legalNotice")}
          </Link>
          <Link href="/privacidad" className={quietLink}>
            {t("privacy")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

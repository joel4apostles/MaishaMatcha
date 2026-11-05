import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { QuietLink, inkButtonClass } from "@/components/Button";
import { readSignInToken } from "@/lib/members";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "maisha matcha", robots: { index: false, follow: false }, referrer: "no-referrer" };

/**
 * Where the emailed link lands: "Entrar como x@…" and one button. Opening
 * the link signs nobody in (scanners, login CSRF); the button POSTs.
 */
export default async function SignInConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "account" });
  const link = typeof token === "string" ? readSignInToken(token) : null;

  return (
    <Section>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Headline as="h1" className="mt-5 text-display">
        {t("title")}
      </Headline>
      {link ? (
        <>
          <p className="measure mt-6 text-lg text-sumi/80">{t("confirmAs", { email: link.e })}</p>
          <form method="post" action={`/api/members/sign-in?t=${encodeURIComponent(token!)}`} className="mt-10">
            <button type="submit" className={`${inkButtonClass} w-full sm:w-auto`}>
              {t("confirmCta")}
            </button>
          </form>
          <p className="mt-6 text-sm text-sumi/70">{t("confirmNotYou")}</p>
        </>
      ) : (
        <>
          <p className="measure mt-6 text-lg text-sumi/80">{t("expired")}</p>
          <div className="mt-8">
            <QuietLink href="/cuenta">{t("send")}</QuietLink>
          </div>
        </>
      )}
    </Section>
  );
}

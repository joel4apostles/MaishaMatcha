import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.privacy" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/privacidad",
    title: t("title"),
    description: t("description"),
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <PrivacyContent />;
}

function PrivacyContent() {
  const t = useTranslations("legal");
  return (
    <Section>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Headline as="h1" className="mt-5">
        {t("privacy.title")}
      </Headline>
      <p className="mt-5 inline-flex rounded-[2px] border border-wood/40 px-2.5 py-1 text-eyebrow uppercase text-sumi/70">
        {t("provisional")}
      </p>
      <div className="measure mt-8 space-y-5 text-sumi/80">
        <p>{t("privacy.p1")}</p>
        <p>{t("privacy.p2")}</p>
        <p>{t("privacy.p3")}</p>
      </div>
    </Section>
  );
}

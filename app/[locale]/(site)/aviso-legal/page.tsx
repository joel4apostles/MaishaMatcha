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
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.notice" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/aviso-legal",
    title: t("title"),
    description: t("description"),
  });
}

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <LegalNoticeContent />;
}

function LegalNoticeContent() {
  const t = useTranslations("legal");
  return (
    <Section>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Headline as="h1" className="mt-5">
        {t("notice.title")}
      </Headline>
      <p className="mt-5 inline-flex rounded-[2px] border border-wood/40 px-2.5 py-1 text-eyebrow uppercase text-sumi/70">
        {t("provisional")}
      </p>
      <div className="measure mt-8 space-y-5 text-sumi/80">
        <p>{t("notice.p1")}</p>
        <p>{t("notice.p2")}</p>
        <p>{t("notice.p3")}</p>
      </div>
    </Section>
  );
}

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
  const sections = t.raw("privacy.sections") as { title: string; body: string }[];
  return (
    <Section>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Headline as="h1" className="mt-5">
        {t("privacy.title")}
      </Headline>
      <p className="measure mt-6 text-lg text-sumi/80">{t("privacy.intro")}</p>
      <p className="mt-5 inline-flex rounded-[2px] border border-wood/40 px-2.5 py-1 text-sm text-sumi/75">
        {t("provisional")}
      </p>
      <div className="measure mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-serif text-2xl font-light">{s.title}</h2>
            <p className="mt-3 text-sumi/80">{s.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-sumi/70">{t("privacy.updated")}</p>
    </Section>
  );
}

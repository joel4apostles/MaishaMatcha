import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { RecipeBuilder } from "@/components/RecipeBuilder";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.create" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/crea",
    title: t("title"),
    description: t("description"),
  });
}

export default async function CreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <CreateContent />;
}

function CreateContent() {
  const t = useTranslations("create");
  return (
    <Section>
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline as="h1" className="mt-5 text-display">
          {t("title")}
        </Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
      </Reveal>

      <div className="mt-14">
        <RecipeBuilder />
      </div>
    </Section>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { RecipeBuilder } from "@/components/RecipeBuilder";
import Image from "next/image";
import pourPhoto from "@/public/images/pour-ube.jpg";
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
      <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-16">
        <Reveal>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Headline as="h1" className="mt-5 text-display">
            {t("title")}
          </Headline>
          <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
        </Reveal>
        {/* The real thing, at the bar: matcha poured over milk and ube. */}
        <Reveal className="hidden md:block">
          <figure>
            <div className="overflow-hidden rounded-[2px]">
              <Image src={pourPhoto} alt={t("photoAlt")} sizes="240px" placeholder="blur" className="aspect-[3/4] h-auto w-full object-cover" />
            </div>
            <figcaption className="mt-3 text-eyebrow uppercase text-sumi/70">{t("photoCaption")}</figcaption>
          </figure>
        </Reveal>
      </div>

      <div className="mt-14">
        <RecipeBuilder />
      </div>
    </Section>
  );
}

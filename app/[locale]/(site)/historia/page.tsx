import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { story } from "@/content/story";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.story" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/historia",
    title: t("title"),
    description: t("description"),
  });
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <StoryContent />;
}

function StoryContent() {
  const t = useTranslations("story");
  const locale = useLocale();
  return (
    <Section>
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline as="h1" className="mt-5">
          {t("title")}
        </Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
      </Reveal>

      <ol className="mt-16 border-l border-wood/25 pl-6 sm:pl-10">
        {story.map((chapter) => (
          <li key={chapter.id} className="relative pb-14 last:pb-0">
            <span
              aria-hidden="true"
              className="absolute -left-[calc(1.5rem+3px)] top-2 h-1.5 w-1.5 rounded-full bg-wood sm:-left-[calc(2.5rem+3px)]"
            />
            <Reveal>
              <Eyebrow>{chapter.era[locale]}</Eyebrow>
              <Headline as="h2" className="mt-3 text-2xl sm:text-3xl">
                {chapter.title[locale]}
              </Headline>
              <p className="measure mt-4 text-sumi/80">{chapter.body[locale]}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}

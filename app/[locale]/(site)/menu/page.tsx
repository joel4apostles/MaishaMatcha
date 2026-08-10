import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { menu } from "@/content/menu";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.menu" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/menu",
    title: t("title"),
    description: t("description"),
  });
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <MenuContent />;
}

function MenuContent() {
  const t = useTranslations("menu");
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

      <div className="mt-16 space-y-14">
        {menu.map((category) => (
          <Reveal key={category.id}>
            <Eyebrow>{category.title[locale]}</Eyebrow>
            <ul className="mt-5 divide-y divide-wood/15 border-t border-wood/15">
              {category.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5"
                >
                  <div className="min-w-0 max-w-xl">
                    <p className="font-serif text-xl text-sumi">{item.name}</p>
                    <p className="mt-1 text-sm text-sumi/70">
                      {item.description[locale]}
                    </p>
                    {item.origin ? (
                      <p className="mt-1 text-eyebrow uppercase text-sumi/60">
                        {t("originPrefix")} · {item.origin}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-serif text-lg text-sumi/80">
                    {item.price}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

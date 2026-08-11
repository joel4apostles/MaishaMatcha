import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { buttonClass, QuietLink } from "@/components/Button";
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
  const cta = useTranslations("cta");
  const locale = useLocale();
  return (
    <Section>
      <Reveal>
        <Headline as="h1" className="text-display">{t("title")}</Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
        <div className="mt-6">
          <QuietLink href="/crea">{cta("create")}</QuietLink>
        </div>
      </Reveal>

      <div className="mt-16 max-w-3xl space-y-16">
        {menu.map((category) => (
          <section
            key={category.id}
            id={category.id}
            className="scroll-mt-24"
            aria-labelledby={`${category.id}-title`}
          >
            <Reveal>
              <h2
                id={`${category.id}-title`}
                className="text-eyebrow font-medium uppercase text-sumi/70"
              >
                {category.title[locale]}
              </h2>
              <ul className="mt-5 divide-y divide-wood/25 border-t border-wood/25">
                {category.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-6"
                  >
                    <div className="min-w-0 max-w-xl">
                      <p className="flex items-center gap-3 font-serif text-2xl font-light text-sumi">
                        {/* The drink, seen from above. */}
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-sumi/10"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </p>
                      <p className="mt-1.5 text-sumi/75">
                        {item.description[locale]}
                      </p>
                      {item.origin ? (
                        <p className="mt-2 text-eyebrow uppercase text-sumi/70">
                          {t("originPrefix")} · {item.origin}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-serif text-xl text-sumi/85">
                      {item.price}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        ))}
      </div>

      {/* Closing: the carta leads back to the founding list. */}
      <Reveal className="mt-20 max-w-3xl border-t border-wood/25 pt-10">
        <p className="font-serif text-2xl font-light text-sumi">
          {t("closing")}
        </p>
        <div className="mt-7">
          <a href={`/${locale}#socios`} className={buttonClass}>
            {cta("joinWaitlist")}
          </a>
        </div>
      </Reveal>
    </Section>
  );
}

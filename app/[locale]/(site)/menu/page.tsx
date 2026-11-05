import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { buttonClass, QuietLink } from "@/components/Button";
import { carta } from "@/content/carta";
import { cartaExtras, cartaGroup, itemSlug, priceLines } from "@/lib/carta";
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
  const locale = useLocale() as Locale;
  const extras = cartaExtras(locale);

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
        {carta.map((category) => (
          <section
            key={category.slug}
            id={category.slug}
            className="scroll-mt-24"
            aria-labelledby={`${category.slug}-title`}
          >
            <Reveal>
              <h2
                id={`${category.slug}-title`}
                className="text-eyebrow font-medium uppercase text-sumi/70"
              >
                {category.title[locale]}
              </h2>
              <ul className="mt-5 divide-y divide-wood/25 border-t border-wood/25">
                {category.items.map((item) => (
                  <li
                    key={itemSlug(item)}
                    className="grid grid-cols-1 gap-x-8 gap-y-3 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-3 font-serif text-2xl font-light text-sumi">
                        {/* The drink, seen from above. */}
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-sumi/10"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </p>
                      <p className="mt-1.5 max-w-xl text-sumi/75">{item.description[locale]}</p>
                    </div>
                    <dl className="flex shrink-0 flex-wrap gap-x-6 gap-y-1 sm:justify-end">
                      {priceLines(item, locale).map((line) => (
                        <div key={line.label ?? "price"} className="flex items-baseline gap-2">
                          {line.label ? (
                            <dt className="text-eyebrow uppercase text-sumi/70">{line.label}</dt>
                          ) : (
                            <dt className="sr-only">{t("price")}</dt>
                          )}
                          <dd className="font-serif text-xl text-sumi/85 tabular-nums">{line.price}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        ))}

        <section id="extras" className="scroll-mt-24" aria-labelledby="extras-title">
          <Reveal>
            <h2 id="extras-title" className="text-eyebrow font-medium uppercase text-sumi/70">
              {cartaGroup("extras").label[locale]}
            </h2>
            <ul className="mt-5 grid grid-cols-1 border-t border-wood/25 sm:grid-cols-2 sm:gap-x-10">
              {extras.map((extra) => (
                <li
                  key={extra.key}
                  className="flex items-baseline justify-between gap-6 border-b border-wood/25 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sumi">{extra.label}</p>
                    {extra.note ? <p className="mt-1 text-sm text-sumi/70">{extra.note}</p> : null}
                  </div>
                  <p className="shrink-0 font-serif text-lg text-sumi/85 tabular-nums">{extra.price}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      </div>

      <p className="mt-10 max-w-3xl text-eyebrow uppercase text-sumi/70">{t("priceNote")}</p>

      {/* Closing: the carta leads back to the founding list. */}
      <Reveal className="mt-16 max-w-3xl border-t border-wood/25 pt-10">
        <p className="font-serif text-2xl font-light text-sumi">{t("closing")}</p>
        <div className="mt-7">
          <a href={`/${locale}#socios`} className={buttonClass}>
            {cta("joinWaitlist")}
          </a>
        </div>
      </Reveal>
    </Section>
  );
}

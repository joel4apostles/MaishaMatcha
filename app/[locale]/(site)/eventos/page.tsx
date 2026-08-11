import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { buttonClass } from "@/components/Button";
import { events } from "@/content/events";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.events" });
  return pageMetadata({
    locale: locale as Locale,
    path: "/eventos",
    title: t("title"),
    description: t("description"),
  });
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <EventsContent />;
}

function EventsContent() {
  const t = useTranslations("events");
  const cta = useTranslations("cta");
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

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {events.map((event) => (
          <Reveal key={event.id}>
            <article className="flex h-full flex-col rounded-[2px] border border-wood/25 p-7">
              {event.membersOnly ? (
                <p className="inline-flex w-fit items-center rounded-[2px] border border-wood/40 px-2.5 py-1 text-eyebrow uppercase text-sumi/70">
                  {t("memberBadge")}
                </p>
              ) : null}
              <Headline as="h2" className="mt-3 text-2xl">
                {event.title[locale]}
              </Headline>
              <p className="mt-2 text-sm text-sumi/70">{event.when[locale]}</p>
              <p className="measure mt-4 text-sumi/80">
                {event.description[locale]}
              </p>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-14">
        <p className="measure text-lg text-sumi/80">{t("invite")}</p>
        <div className="mt-8">
          <a href={`/${locale}#socios`} className={buttonClass}>
            {cta("joinWaitlist")}
          </a>
        </div>
      </Reveal>
    </Section>
  );
}

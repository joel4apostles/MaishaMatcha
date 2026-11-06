import type { Metadata } from "next";
import { getPayload, type Payload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { Reveal } from "@/components/Reveal";
import { inkButtonClass } from "@/components/Button";
import { EventRsvp } from "@/components/EventRsvp";
import { listEvents, memberRsvps } from "@/lib/events";
import { currentMember } from "@/lib/members-server";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

// Seats change as people book: always fresh.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.events" });
  return pageMetadata({ locale: locale as Locale, path: "/eventos", title: t("title"), description: t("description") });
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "events" });
  const cta = await getTranslations({ locale: locale as Locale, namespace: "cta" });

  const payload: Payload | null = await getPayload({ config }).catch(() => null);
  const [events, member] = await Promise.all([listEvents(payload, locale as "es" | "en"), currentMember()]);
  const mine = payload && member ? await memberRsvps(payload, member.id).catch(() => new Map<number, number>()) : new Map<number, number>();

  return (
    <Section>
      <Reveal>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline as="h1" className="mt-5 text-display">
          {t("title")}
        </Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {events.map((event) => (
          <Reveal key={event.id} className="flex">
            <article className="flex w-full flex-col rounded-[2px] border border-wood/35 p-7 sm:p-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-eyebrow uppercase text-sumi/70">{event.when}</p>
                {event.membersOnly ? (
                  <p className="inline-flex w-fit items-center rounded-[2px] border border-wood/40 px-2.5 py-1 text-eyebrow uppercase text-sumi/70">
                    {t("memberBadge")}
                  </p>
                ) : null}
              </div>
              <Headline as="h2" className="mt-5 text-3xl">
                {event.title}
              </Headline>
              <p className="measure mt-4 flex-1 text-sumi/80">{event.description}</p>
              {event.bookable && typeof event.id === "number" ? (
                <EventRsvp
                  eventId={event.id}
                  remaining={event.remaining ?? 0}
                  mine={mine.get(event.id) ?? 0}
                  signedIn={Boolean(member)}
                  allowed={!event.membersOnly || member?.tier === "founding"}
                />
              ) : null}
            </article>
          </Reveal>
        ))}

        <Reveal className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[2px] border border-wood/35 p-7 sm:p-9">
            <p className="measure font-serif text-2xl font-light text-sumi">{t("invite")}</p>
            <a href={`/${locale}#socios`} className={inkButtonClass}>
              {cta("joinWaitlist")}
            </a>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

import type { Metadata } from "next";
import { getPayload, type Payload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Eyebrow } from "@/components/Eyebrow";
import { Numeral } from "@/components/Numeral";
import { Reveal } from "@/components/Reveal";
import { inkButtonClass } from "@/components/Button";
import { EventRsvp } from "@/components/EventRsvp";
import { listEvents, mayBookMembersOnly, memberRsvps } from "@/lib/events";
import { currentMember } from "@/lib/members-server";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八"];

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

  const dateParts = (iso: string) => {
    const d = new Date(iso);
    const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: "Europe/Madrid", ...o }).format(d);
    return { day: fmt({ day: "numeric" }), month: fmt({ month: "long" }), rest: `${fmt({ weekday: "long" })} · ${fmt({ hour: "2-digit", minute: "2-digit" })}` };
  };

  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-[1100px] pb-24 sm:pb-32">
        {/* Opening: the title, and one brushed word standing beside it. */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 pt-16 pb-12 sm:gap-12 sm:pt-28 sm:pb-20">
          <Reveal>
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="mt-6 max-w-[12ch] text-balance font-serif text-hero font-light text-sumi">{t("title")}</h1>
            <p className="measure mt-7 text-lg text-sumi/80">{t("intro")}</p>
          </Reveal>
          <div>
            <span
              lang="ja"
              aria-hidden="true"
              className="ink-write block select-none font-brush text-[clamp(1.9rem,2vw+1.2rem,3.25rem)] leading-[1.12] text-sumi [writing-mode:vertical-rl]"
              style={{ animationDelay: "300ms" }}
            >
              茶会
            </span>
            <span className="sr-only">{t("phrase")}</span>
          </div>
        </header>

        {/* The programme, printed like one: a date, the gathering, the seats. */}
        <ol className="border-t border-wood/35">
          {events.map((event, i) => {
            const date = event.startsAt ? dateParts(event.startsAt) : null;
            return (
              <li key={event.id} className="border-b border-wood/35 py-10 sm:py-14">
                <Reveal className="grid grid-cols-1 gap-6 md:grid-cols-[11rem_minmax(0,1fr)_17rem] md:gap-10">
                  <div className="flex items-start gap-4 md:flex-col md:gap-5">
                    <Numeral>{NUMERALS[i] ?? i + 1}</Numeral>
                    {date ? (
                      <p className="text-sumi">
                        <span className="block font-serif text-5xl font-light leading-none">{date.day}</span>
                        <span className="mt-2 block text-eyebrow uppercase text-sumi/70">{date.month}</span>
                        <span className="mt-1 block text-sm text-sumi/70">{date.rest}</span>
                      </p>
                    ) : (
                      <p className="pt-1.5 text-eyebrow uppercase text-sumi/70">{event.when}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    {event.kind || event.membersOnly ? (
                      <p className="text-eyebrow uppercase text-leaf">
                        {[event.kind ? t(`kinds.${event.kind}`) : null, event.membersOnly ? t("memberBadge") : null].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    <h2 className={`${event.kind || event.membersOnly ? "mt-3" : ""} text-balance font-serif text-3xl font-light text-sumi sm:text-4xl`}>{event.title}</h2>
                    <p className="measure mt-4 text-sumi/80">{event.description}</p>
                  </div>
                  <div className="md:pt-1">
                    {event.bookable && typeof event.id === "number" ? (
                      <EventRsvp
                        className=""
                        eventId={event.id}
                        remaining={event.remaining ?? 0}
                        mine={mine.get(event.id) ?? 0}
                        signedIn={Boolean(member)}
                        allowed={!event.membersOnly || Boolean(member && mayBookMembersOnly(member))}
                      />
                    ) : (
                      <p className="text-sm text-sumi/70">{t("soon")}</p>
                    )}
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>

        {/* The invitation: the matcha card, mounted like the hero's. */}
        <Reveal className="mt-20 sm:mt-24">
          <div className="brand-band relative rounded-[2px] bg-matcha p-8 sm:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 border border-sumi/25" />
            <div className="relative flex flex-wrap items-end justify-between gap-8">
              <p className="max-w-[28ch] text-balance font-serif text-3xl font-light text-sumi">{t("invite")}</p>
              <a href={`/${locale}#socios`} className={inkButtonClass}>
                {cta("joinWaitlist")}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

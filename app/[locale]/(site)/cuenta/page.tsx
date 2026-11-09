import type { Metadata } from "next";
import { getPayload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Eyebrow } from "@/components/Eyebrow";
import { Numeral } from "@/components/Numeral";
import { AccountPanel, SignInForm } from "@/components/Account";
import { foundingSettings } from "@/lib/founding";
import { latestBox, monthlyPriceFor, premiumSettings } from "@/lib/premium";
import { memberOrders } from "@/lib/members";
import { currentMember } from "@/lib/members-server";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.account" });
  const base = pageMetadata({ locale: locale as Locale, path: "/cuenta", title: t("title"), description: t("description") });
  return { ...base, robots: { index: false, follow: true } };
}

const BENEFITS = ["benefitOrders", "benefitUsual", "benefitEvents", "benefitFounding"] as const;
const NUMERALS = ["一", "二", "三", "四"];

/** The carta-style opening shared by both states: title, line, and 茶友 brushed beside it. */
function Header({ eyebrow, title, phrase, children }: { eyebrow: string; title: string; phrase: string; children?: React.ReactNode }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 pt-16 pb-12 sm:gap-12 sm:pt-28 sm:pb-16">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-6 max-w-[14ch] text-balance font-serif text-hero font-light text-sumi">{title}</h1>
        {children}
      </div>
      <div>
        <span
          lang="ja"
          aria-hidden="true"
          className="ink-write block select-none font-brush text-[clamp(1.9rem,2vw+1.2rem,3.25rem)] leading-[1.12] text-sumi [writing-mode:vertical-rl]"
          style={{ animationDelay: "300ms" }}
        >
          茶友
        </span>
        <span className="sr-only">{phrase}</span>
      </div>
    </header>
  );
}

const shell = "px-6 sm:px-8";
const inner = "mx-auto max-w-[1100px] pb-24 sm:pb-32";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enlace?: string; fundador?: string; premium?: string; next?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "account" });
  const member = await currentMember();

  if (!member) {
    return (
      <div className={shell}>
        <div className={inner}>
          <Header eyebrow={t("eyebrow")} title={t("title")} phrase={t("phrase")}>
            <p className="measure mt-7 text-lg text-sumi/80">{t("signInIntro")}</p>
          </Header>
          <div className="grid grid-cols-1 gap-14 border-t border-wood/35 pt-12 md:grid-cols-2 md:gap-16">
            <div className="max-w-md">
              {sp.enlace === "caducado" ? (
                <p role="status" className="mb-6 text-sumi">
                  {t("expired")}
                </p>
              ) : null}
              <SignInForm next={typeof sp.next === "string" ? sp.next : undefined} />
            </div>
            {/* What an account keeps for you, in the order people use it. */}
            <section aria-labelledby="a-benefits" className="md:border-l md:border-wood/35 md:pl-16">
              <h2 id="a-benefits" className="text-eyebrow uppercase text-sumi/70">{t("benefitsTitle")}</h2>
              <ul className="mt-6 space-y-5">
                {BENEFITS.map((k, i) => (
                  <li key={k} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-4">
                    <Numeral>{NUMERALS[i]}</Numeral>
                    <p className="pt-1 text-sumi/85">{t(k)}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const payload = await getPayload({ config });
  const [orders, founding, premium] = await Promise.all([
    memberOrders(payload, member).catch(() => []),
    foundingSettings(payload, locale as "es" | "en").catch(() => null),
    premiumSettings(payload, locale as "es" | "en").catch(() => null),
  ]);
  const box = await latestBox(payload, member.id).catch(() => null);

  return (
    <div className={shell}>
      <div className={inner}>
      <Header eyebrow={t("eyebrow")} title={t("hello", { name: member.name.split(" ")[0] })} phrase={t("phrase")}>
        {member.tier === "founding" ? <p className="mt-7 text-eyebrow uppercase text-leaf">{t("tierFounding", { number: member.foundingNumber ?? "" })}</p> : null}
      </Header>
      <div className="border-t border-wood/35 pt-12">
        <AccountPanel
          member={{
            name: member.name,
            email: member.email,
            tier: member.tier,
            emailOptIn: Boolean(member.emailOptIn),
            locale: (member.locale ?? "es") as "es" | "en",
          }}
          orders={orders}
          founding={founding ? { open: founding.open, priceCents: founding.priceCents, cap: founding.cap, remaining: founding.remaining, perks: founding.perks } : null}
          justPaid={sp.fundador === "1"}
          premium={{
            open: Boolean(premium?.open),
            priceCents: premium ? monthlyPriceFor(member, premium) : null,
            foundingPrice: Boolean(member.tier === "founding" && premium?.foundingMonthlyCents),
            perks: premium?.perks ?? [],
            status: member.subscriptionStatus ?? "none",
            periodEnd: member.subscriptionPeriodEnd ?? null,
            cancelAtPeriodEnd: Boolean(member.cancelAtPeriodEnd),
            justSubscribed: sp.premium === "1",
            product: premium?.product?.name ?? null,
            shippingCents: premium?.shippingCents ?? null,
            box,
          }}
        />
      </div>
      </div>
    </div>
  );
}

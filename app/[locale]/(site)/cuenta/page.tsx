import type { Metadata } from "next";
import { getPayload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { AccountPanel, SignInForm } from "@/components/Account";
import { foundingSettings } from "@/lib/founding";
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

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enlace?: string; fundador?: string; next?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "account" });
  const member = await currentMember();

  if (!member) {
    return (
      <Section>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <Headline as="h1" className="mt-5 text-display">
          {t("title")}
        </Headline>
        <p className="measure mt-6 text-lg text-sumi/80">{t("signInIntro")}</p>
        {sp.enlace === "caducado" ? (
          <p role="status" className="mt-6 text-sumi">
            {t("expired")}
          </p>
        ) : null}
        <div className="mt-10 max-w-md">
          <SignInForm next={typeof sp.next === "string" ? sp.next : undefined} />
        </div>
      </Section>
    );
  }

  const payload = await getPayload({ config });
  const [orders, founding] = await Promise.all([
    memberOrders(payload, member).catch(() => []),
    foundingSettings(payload, locale as "es" | "en").catch(() => null),
  ]);

  return (
    <Section>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Headline as="h1" className="mt-5 text-display">
        {t("hello", { name: member.name.split(" ")[0] })}
      </Headline>
      <p className="mt-4 text-sumi/80">
        {member.tier === "founding" ? t("tierFounding", { number: member.foundingNumber ?? "" }) : t("tierCustomer")}
      </p>
      <div className="mt-14">
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
        />
      </div>
    </Section>
  );
}

import type { Metadata } from "next";
import { getPayload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Section } from "@/components/Section";
import { Eyebrow } from "@/components/Eyebrow";
import { Headline } from "@/components/Headline";
import { QuietLink } from "@/components/Button";
import { OnlineOrder } from "@/components/OnlineOrder";
import { availableSlots } from "@/lib/online";
import { loadCatalog } from "@/lib/pos/sales";
import { stripeEnabled } from "@/lib/stripe";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

// Slots and stock change by the minute: never cache this page.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.order" });
  return pageMetadata({ locale: locale as Locale, path: "/pedir", title: t("title"), description: t("description") });
}

async function load(locale: "es" | "en") {
  try {
    const payload = await getPayload({ config });
    const { enabled, slots } = await availableSlots(payload);
    if (!enabled) return { state: "closed" as const };
    return { state: "open" as const, slots, catalog: await loadCatalog(payload, locale) };
  } catch {
    return { state: "unavailable" as const };
  }
}

export default async function OrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "order" });
  const data = await load(locale as "es" | "en");

  return (
    <Section>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Headline as="h1" className="mt-5 text-display">
        {data.state === "closed" ? t("closedTitle") : t("title")}
      </Headline>
      {data.state === "open" ? (
        <>
          <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
          <div className="mt-14">
            <OnlineOrder catalog={data.catalog} slots={data.slots} stripe={stripeEnabled()} />
          </div>
        </>
      ) : (
        <>
          <p className="measure mt-6 text-lg text-sumi/80">{data.state === "closed" ? t("closedBody") : t("unavailable")}</p>
          <div className="mt-8">
            <QuietLink href="/menu">{t("toCarta")}</QuietLink>
          </div>
        </>
      )}
    </Section>
  );
}

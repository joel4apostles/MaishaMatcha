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
import { currentMember } from "@/lib/members-server";
import { loadCatalog } from "@/lib/pos/sales";
import { stripeEnabled } from "@/lib/stripe";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

// Stock and slots change by the minute.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.shop" });
  return pageMetadata({ locale: locale as Locale, path: "/tienda", title: t("title"), description: t("description") });
}

async function load(locale: "es" | "en") {
  try {
    const payload = await getPayload({ config });
    const products = (await loadCatalog(payload, locale, "online")).filter((i) => i.shop);
    const { enabled, slots } = await availableSlots(payload);
    return { open: enabled && products.length > 0, products, slots };
  } catch {
    return { open: false, products: [], slots: [] };
  }
}

/** The shop: products the team uploads in /admin (a Tienda category), collected at the salon. */
export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "shop" });
  const o = await getTranslations({ locale: locale as Locale, namespace: "order" });
  const [data, member] = await Promise.all([load(locale as "es" | "en"), currentMember()]);

  return (
    <Section>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <Headline as="h1" className="mt-5 text-display">
        {data.open ? t("title") : t("soon")}
      </Headline>
      {data.open ? (
        <>
          <p className="measure mt-6 text-lg text-sumi/80">{t("intro")}</p>
          <div className="mt-14">
            <OnlineOrder
              variant="shop"
              catalog={data.products}
              slots={data.slots}
              stripe={stripeEnabled()}
              customer={member ? { name: member.name, email: member.email } : null}
            />
          </div>
        </>
      ) : (
        <>
          <p className="measure mt-6 text-lg text-sumi/80">{t("soonBody")}</p>
          <div className="mt-8">
            <QuietLink href="/menu">{o("toCarta")}</QuietLink>
          </div>
        </>
      )}
    </Section>
  );
}

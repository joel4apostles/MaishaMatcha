import type { Metadata } from "next";
import { getPayload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Section } from "@/components/Section";
import { OrderStatus } from "@/components/OrderStatus";
import { orderByToken } from "@/lib/online";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

// A private page: never indexed, never shared in previews.
export const metadata: Metadata = { title: "maisha matcha", robots: { index: false, follow: false } };

export default async function OrderStatusPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "order.status" });
  const order = await orderByToken(await getPayload({ config }), token).catch(() => null);
  return (
    <Section>
      {order ? <OrderStatus token={token} initial={order} /> : <p className="measure text-lg text-sumi/80">{t("notFound")}</p>}
    </Section>
  );
}

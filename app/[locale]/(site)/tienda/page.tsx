import type { Metadata } from "next";
import Image from "next/image";
import stillLife from "@/public/images/shop-still-life.jpg";
import { getPayload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Eyebrow } from "@/components/Eyebrow";
import { QuietLink } from "@/components/Button";
import { OnlineOrder } from "@/components/OnlineOrder";
import { availableSlots } from "@/lib/online";
import { currentMember } from "@/lib/members-server";
import { loadCatalog } from "@/lib/pos/sales";
import { addLine } from "@/lib/shop";
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
export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ add?: string | string[] }>;
}) {
  const { locale } = await params;
  const { add } = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "shop" });
  const o = await getTranslations({ locale: locale as Locale, namespace: "order" });
  const [data, member] = await Promise.all([load(locale as "es" | "en"), currentMember()]);

  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-[1100px] pb-24 sm:pb-32">
        <header className="grid grid-cols-1 items-end gap-10 pt-10 pb-12 sm:pt-24 sm:pb-16 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-16">
          <div>
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="mt-6 max-w-[12ch] text-balance font-serif text-hero font-light text-sumi">{data.open ? t("title") : t("soon")}</h1>
            <p className="measure mt-7 text-lg text-sumi/80">{data.open ? t("intro") : t("soonBody")}</p>
            {!data.open ? (
              <div className="mt-8">
                <QuietLink href="/menu">{o("toCarta")}</QuietLink>
              </div>
            ) : null}
          </div>
          {/* The salon's own still life: tins, chasen, chawan on the bar tiles. */}
          <figure className="max-w-sm md:max-w-none">
            <div className="overflow-hidden rounded-[2px]">
              <Image src={stillLife} alt={t("photoAlt")} sizes="(min-width: 768px) 420px, 90vw" placeholder="blur" className="h-auto w-full" priority />
            </div>
          </figure>
        </header>
        {data.open ? (
          <OnlineOrder
            variant="shop"
            catalog={data.products}
            slots={data.slots}
            stripe={stripeEnabled()}
            initialLines={addLine(data.products, add)}
            customer={member ? { name: member.name, email: member.email } : null}
          />
        ) : null}
      </div>
    </div>
  );
}

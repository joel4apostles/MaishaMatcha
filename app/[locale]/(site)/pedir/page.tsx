import type { Metadata } from "next";
import { getPayload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Eyebrow } from "@/components/Eyebrow";
import { QuietLink } from "@/components/Button";
import { OnlineOrder } from "@/components/OnlineOrder";
import { availableSlots, onlineSettings, openNow } from "@/lib/online";
import { loadCatalog } from "@/lib/pos/sales";
import { priceLine, type CatalogItem, type LineInput } from "@/lib/pos/pricing";
import { fromParam, recipeModifierKeys, resolveRecipe } from "@/lib/recipe";
import { stripeEnabled } from "@/lib/stripe";
import { currentMember } from "@/lib/members-server";
import { usualOrder } from "@/lib/members";
import { pageMetadata } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

// Slots and stock change by the minute: never cache this page.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "meta.order" });
  return pageMetadata({ locale: locale as Locale, path: "/pedir", title: t("title"), description: t("description") });
}

async function load(locale: "es" | "en", table: number | null) {
  try {
    const payload = await getPayload({ config });
    const catalog = async () => (await loadCatalog(payload, locale, "online")).filter((i) => !i.shop);
    // From a table's QR: valid table, switched on, salon open now.
    if (table != null) {
      const { settings, tables } = await onlineSettings(payload);
      if (!tables || table < 1 || table > tables || !openNow(settings, new Date())) return { state: "closed" as const };
      return { state: "open" as const, slots: [], catalog: await catalog() };
    }
    const { enabled, slots } = await availableSlots(payload);
    if (!enabled) return { state: "closed" as const };
    return { state: "open" as const, slots, catalog: await catalog() };
  } catch {
    return { state: "unavailable" as const };
  }
}

/** A recipe from /crea (?r=...) arrives as the first line of the order. */
function recipeLine(catalog: CatalogItem[], param: string | undefined): LineInput[] {
  if (!param) return [];
  const r = resolveRecipe(fromParam(param));
  const item = catalog.find((i) => i.name.toLowerCase() === r.tea.name.toLowerCase());
  if (!item) return [];
  const line = { menuItemId: item.id, quantity: 1, modifierKeys: recipeModifierKeys(r) };
  return priceLine(new Map([[item.id, item]]), line).ok ? [line] : [];
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ r?: string | string[]; mesa?: string | string[] }>;
}) {
  const { locale } = await params;
  const { r, mesa } = await searchParams;
  const table = typeof mesa === "string" && /^\d{1,2}$/.test(mesa) ? Number(mesa) : null;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "order" });
  const [data, member] = await Promise.all([load(locale as "es" | "en", table), currentMember()]);
  // "Lo de siempre": a signed-in member's last order, re-priced on today's carta.
  const usual =
    member && data.state === "open"
      ? await getPayload({ config })
          .then((payload) => usualOrder(payload, member, data.catalog))
          .catch(() => [])
      : [];
  const closed = data.state === "closed";

  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-[1100px] pb-24 sm:pb-32">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-6 pt-10 pb-8 sm:gap-12 sm:pt-24 sm:pb-16">
          <div>
            <Eyebrow>{table != null ? t("tableEyebrow", { table }) : t("eyebrow")}</Eyebrow>
            <h1 className="mt-6 max-w-[14ch] text-balance font-serif text-hero font-light text-sumi">
              {closed ? (table != null ? t("tableClosed") : t("closedTitle")) : table != null ? t("tableTitle") : t("title")}
            </h1>
            <p className="measure mt-7 text-lg text-sumi/80">
              {data.state === "open" ? (table != null ? t("tableIntro") : t("intro")) : closed ? t("closedBody") : t("unavailable")}
            </p>
            {data.state === "open" ? (
              member ? (
                <p className="mt-4 text-sumi/75">{t("signedInAs", { name: member.name.split(" ")[0] })}</p>
              ) : (
                <div className="mt-3">
                  <QuietLink href="/cuenta">{t("haveAccount")}</QuietLink>
                </div>
              )
            ) : (
              <div className="mt-8">
                <QuietLink href="/menu">{t("toCarta")}</QuietLink>
              </div>
            )}
          </div>
          <div>
            <span
              lang="ja"
              aria-hidden="true"
              className="ink-write block select-none font-brush text-[clamp(1.9rem,2vw+1.2rem,3.25rem)] leading-[1.12] text-sumi [writing-mode:vertical-rl]"
              style={{ animationDelay: "300ms" }}
            >
              一服
            </span>
            <span className="sr-only">{t("phrase")}</span>
          </div>
        </header>
        {data.state === "open" ? (
          <OnlineOrder
            catalog={data.catalog}
            slots={data.slots}
            stripe={stripeEnabled()}
            customer={member ? { name: member.name, email: member.email } : null}
            initialLines={recipeLine(data.catalog, typeof r === "string" ? r : undefined)}
            usual={usual}
            table={table}
          />
        ) : null}
      </div>
    </div>
  );
}

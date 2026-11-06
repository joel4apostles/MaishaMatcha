import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { getTranslations, setRequestLocale } from "next-intl/server";
import config from "@payload-config";
import { Eyebrow } from "@/components/Eyebrow";
import { BrandMark } from "@/components/BrandMark";
import { inkButtonClass, quietLinkClass } from "@/components/Button";
import { Link } from "@/i18n/navigation";
import { loadCatalog } from "@/lib/pos/sales";
import { findProduct, pairingsOf, productSlug } from "@/lib/shop";
import { formatEuro } from "@/lib/money";
import { stripeEnabled } from "@/lib/stripe";
import { pageMetadata } from "@/lib/seo";
import type { CatalogItem } from "@/lib/pos/pricing";
import type { Locale } from "@/i18n/routing";

// Stock changes by the minute.
export const dynamic = "force-dynamic";

const NUMERALS = ["一", "二", "三", "四", "五", "六"];

async function products(locale: "es" | "en"): Promise<CatalogItem[]> {
  try {
    return (await loadCatalog(await getPayload({ config }), locale, "online")).filter((i) => i.shop);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = findProduct(await products(locale as "es" | "en"), slug);
  if (!product) return {};
  return pageMetadata({
    locale: locale as Locale,
    path: { pathname: "/tienda/[slug]", params: { slug } },
    title: `${product.name} · maisha matcha`,
    description: (product.description ?? "").slice(0, 160),
    image: product.photo ? { url: product.photo.url, alt: product.photo.alt } : null,
  });
}

/** One shop product: its photograph, what it is, how to use it, what it goes with. */
export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale: locale as Locale, namespace: "shop" });
  const all = await products(locale as "es" | "en");
  const product = findProduct(all, slug);
  if (!product) notFound();
  const pairings = pairingsOf(product, all);
  // "How to use it": one step per line or paragraph, as the team wrote it.
  const steps = (product.ritual ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const loc = locale as "es" | "en";

  return (
    <div className="px-6 sm:px-8">
      <div className="mx-auto max-w-[1100px] pb-24 pt-8 sm:pb-32 sm:pt-12">
        <Link href="/tienda" className={quietLinkClass}>
          <span aria-hidden="true" className="mr-2">←</span>
          {t("backToShop")}
        </Link>

        <article className="mt-6 grid grid-cols-1 gap-10 md:mt-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-16">
          <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[2px] bg-sumi/[0.03]">
            {product.photo ? (
              <Image
                src={product.photo.url}
                alt={product.photo.alt}
                fill
                priority
                unoptimized={/^https?:/.test(product.photo.url)}
                sizes="(min-width: 768px) 560px, 100vw"
                className="object-cover"
              />
            ) : (
              <BrandMark className="w-14 text-wood/30" />
            )}
          </div>

          <div className="md:pt-6">
            <Eyebrow>{product.category}</Eyebrow>
            <h1 className="mt-5 text-balance font-serif text-[clamp(2.5rem,3.4vw+1.2rem,4rem)] font-light leading-[1.05] text-sumi">{product.name}</h1>
            <p className="mt-5 font-serif text-2xl text-sumi tabular-nums">{formatEuro(product.priceCents, loc)}</p>
            {product.available && product.stock != null && product.stock <= 5 ? (
              <p className="mt-1 text-sm text-sumi/70">{t("left", { count: product.stock })}</p>
            ) : null}
            {product.description ? <p className="measure mt-7 text-lg text-sumi/85">{product.description}</p> : null}

            <div className="mt-9">
              {product.available ? (
                <Link href={{ pathname: "/tienda", query: { add: String(product.id) }, hash: "tu-pedido" }} className={`${inkButtonClass} w-full sm:w-auto`}>
                  {t("addToBasket")}
                </Link>
              ) : (
                <p className="inline-flex min-h-[44px] items-center text-sumi/70">{t("soldOut")}</p>
              )}
              <p className="mt-4 text-sm text-sumi/70">{stripeEnabled() ? t("pickupCard") : t("pickupCounter")}</p>
            </div>

            {steps.length ? (
              <section aria-labelledby="ritual-title" className="mt-14 border-t border-wood/35 pt-8">
                <h2 id="ritual-title" className="text-eyebrow uppercase text-sumi/70">{t("ritualTitle")}</h2>
                <ol className="mt-6 space-y-5">
                  {steps.map((step, i) => (
                    <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-3">
                      <span lang="ja" aria-hidden="true" className="font-brush text-[1.6rem] leading-none text-sumi">
                        {NUMERALS[i] ?? i + 1}
                      </span>
                      <p className="text-sumi/85">{step}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </article>

        {pairings.length ? (
          <section aria-labelledby="pairs-title" className="mt-20 border-t border-wood/35 pt-10 sm:mt-28">
            <h2 id="pairs-title" className="text-eyebrow uppercase text-sumi/70">{t("pairsTitle")}</h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-8">
              {pairings.map((p) => (
                <li key={p.id} className="group">
                  <Link href={{ pathname: "/tienda/[slug]", params: { slug: productSlug(p.name) } }} className="block">
                    <span className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[2px] bg-sumi/[0.03]">
                      {p.photo ? (
                        <Image
                          src={p.photo.url}
                          alt=""
                          fill
                          unoptimized={/^https?:/.test(p.photo.url)}
                          sizes="(min-width: 640px) 320px, 45vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <BrandMark className="w-10 text-wood/30" />
                      )}
                    </span>
                    <span className="mt-3 block font-serif text-xl font-light leading-tight text-sumi">{p.name}</span>
                    <span className="mt-1 block text-sumi/75 tabular-nums">{formatEuro(p.priceCents, loc)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

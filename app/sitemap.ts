import type { MetadataRoute } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL, type MetaPath } from "@/lib/seo";
import { loadCatalog } from "@/lib/pos/sales";
import { productSlug } from "@/lib/shop";

// Products change rarely: rebuild the sitemap at most once an hour.
export const revalidate = 3600;

const paths: MetaPath[] = ["/", "/menu", "/crea", "/historia", "/eventos", "/tienda", "/aviso-legal", "/privacidad"];

async function productPaths(): Promise<MetaPath[]> {
  try {
    const items = await loadCatalog(await getPayload({ config }), "es", "online");
    return items.filter((i) => i.shop && i.available).map((i) => ({ pathname: "/tienda/[slug]", params: { slug: productSlug(i.name) } }));
  } catch {
    // No database (build, preview): static pages only.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [...paths, ...(await productPaths())].map((path) => {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = SITE_URL + getPathname({ href: path, locale });
    }
    return {
      url: SITE_URL + getPathname({ href: path, locale: routing.defaultLocale }),
      alternates: { languages },
    };
  });
}

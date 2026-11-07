import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { buildConfig, type CollectionConfig } from "payload";
import { es } from "@payloadcms/translations/languages/es";
import { en } from "@payloadcms/translations/languages/en";
import { postgresAdapter } from "@payloadcms/db-postgres";

import { Users } from "./cms/collections/Users";
import { Media } from "./cms/collections/Media";
import { MenuCategories } from "./cms/collections/MenuCategories";
import { MenuItems } from "./cms/collections/MenuItems";
import { ModifierGroups } from "./cms/collections/ModifierGroups";
import { Modifiers } from "./cms/collections/Modifiers";
import { TaxRates } from "./cms/collections/TaxRates";
import { PosDevices } from "./cms/collections/PosDevices";
import { AuditLog } from "./cms/collections/AuditLog";
import { Shifts } from "./cms/collections/Shifts";
import { Payments } from "./cms/collections/Payments";
import { Refunds } from "./cms/collections/Refunds";
import { Batches, RecipeLines, StockCounts } from "./cms/collections/RecipeLines";
import { PurchaseOrders, SupplierProducts, Suppliers } from "./cms/collections/Suppliers";
import { Invoices } from "./cms/collections/Invoices";
import { Sequences } from "./cms/collections/Sequences";
import { Business } from "./cms/globals/Business";
import { Events } from "./cms/collections/Events";
import { StoryChapters } from "./cms/collections/StoryChapters";
import { InventoryItems } from "./cms/collections/InventoryItems";
import { StockMovements } from "./cms/collections/StockMovements";
import { Orders } from "./cms/collections/Orders";
import { Members } from "./cms/collections/Members";
import { Rsvps } from "./cms/collections/Rsvps";
import { Campaigns } from "./cms/collections/Campaigns";
import { appSecret } from "./lib/secret";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database: Postgres everywhere, so development and tests run on exactly what
 * production runs. Production: Supabase (DATABASE_URL, transaction pooler).
 * Local: the docker-compose "db" service (npm run db:up), the default below.
 */
const LOCAL_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:54322/maisha";

if (process.env.VERCEL && !process.env.DATABASE_URL) {
  console.error(
    "[payload] DATABASE_URL is not set on Vercel: the admin and the counter cannot work. " +
      "Set it in the Vercel project settings (Production only).",
  );
}

const db = postgresAdapter({
  pool: { connectionString: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL },
  // Own schema: Supabase's public Data API only exposes "public", so the
  // anon key can never reach staff hashes or orders.
  schemaName: "payload",
  // Schema changes reach Postgres ONLY through committed migrations
  // (npm run migrate locally, the vercel-build script in production).
  push: false,
  migrationDir: path.resolve(dirname, "migrations"),
});

// No trailing slash: CSRF compares it with the browser Origin header exactly.
const siteURL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

/** Groups each collection in the dashboard and hides the developer API tab. */
function inSalonOrder(list: [CollectionConfig, string][]): CollectionConfig[] {
  return list.map(([collection, group]) => ({
    ...collection,
    admin: { ...collection.admin, group, hideAPIURL: true },
  }));
}

export default buildConfig({
  secret: appSecret(),
  // Cookie-authenticated requests are only accepted from our own origin.
  ...(siteURL ? { serverURL: siteURL, csrf: [siteURL] } : {}),
  db,
  sharp,
  localization: {
    // Named, so the selector reads "Español / English", not "es / en".
    locales: [
      { code: "es", label: "Español" },
      { code: "en", label: "English" },
    ],
    defaultLocale: "es",
    fallback: true,
  },
  admin: {
    user: Users.slug,
    // The dashboard wears the brand: washi light theme, always (OS dark
    // mode otherwise flips it to a near-black look that reads unbranded).
    theme: "light",
    meta: {
      titleSuffix: " · maisha matcha",
      // The brand mark in the browser tab, not Payload's default icon.
      icons: [
        { rel: "icon", type: "image/svg+xml", url: "/icon.svg" },
        { rel: "apple-touch-icon", url: "/apple-icon.png" },
      ],
    },
    components: {
      // Our own admin home: today, the launch checklist, what is pending, and
      // every collection as a compact list with counts (no tile grid).
      views: { dashboard: { Component: "/cms/components/OwnerDashboard#OwnerDashboardView" } },
      graphics: {
        Icon: "/cms/components/AdminIcon#AdminIcon",
        Logo: "/cms/components/AdminLogo#AdminLogo",
      },
    },
  },
  // The admin speaks Spanish first, like the salon (English stays available).
  i18n: {
    supportedLanguages: { es, en },
    fallbackLanguage: "es",
    // The top-right selector switches which language of the CONTENT you
    // edit (event titles, descriptions), not the admin's own language.
    translations: {
      es: { general: { locale: "Contenido en" } },
      en: { general: { locale: "Content in" } },
    },
  },
  // Dashboard order and groups follow how the salon works, not the schema.
  collections: inSalonOrder([
    [Orders, "Barra"],
    [Payments, "Barra"],
    [Refunds, "Barra"],
    [Shifts, "Barra"],
    [PosDevices, "Barra"],
    [MenuItems, "Carta"],
    [MenuCategories, "Carta"],
    [ModifierGroups, "Carta"],
    [Modifiers, "Carta"],
    [TaxRates, "Carta"],
    [InventoryItems, "Inventario"],
    [RecipeLines, "Inventario"],
    [StockMovements, "Inventario"],
    [StockCounts, "Inventario"],
    [Batches, "Inventario"],
    [PurchaseOrders, "Proveedores"],
    [Suppliers, "Proveedores"],
    [SupplierProducts, "Proveedores"],
    [Members, "Personas"],
    [Rsvps, "Personas"],
    [Users, "Personas"],
    [Events, "Web"],
    [Campaigns, "Web"],
    [StoryChapters, "Web"],
    [Media, "Web"],
    [Invoices, "Control"],
    [AuditLog, "Control"],
    [Sequences, "Control"],
  ]),
  globals: [Business],
  typescript: {
    outputFile: path.resolve(dirname, "cms/payload-types.ts"),
  },
});

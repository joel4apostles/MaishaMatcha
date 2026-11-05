import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import { Users } from "./cms/collections/Users";
import { Media } from "./cms/collections/Media";
import { MenuCategories } from "./cms/collections/MenuCategories";
import { MenuItems } from "./cms/collections/MenuItems";
import { ModifierGroups } from "./cms/collections/ModifierGroups";
import { Modifiers } from "./cms/collections/Modifiers";
import { TaxRates } from "./cms/collections/TaxRates";
import { PosDevices } from "./cms/collections/PosDevices";
import { AuditLog } from "./cms/collections/AuditLog";
import { Events } from "./cms/collections/Events";
import { StoryChapters } from "./cms/collections/StoryChapters";
import { InventoryItems } from "./cms/collections/InventoryItems";
import { StockMovements } from "./cms/collections/StockMovements";
import { Orders } from "./cms/collections/Orders";
import { Members } from "./cms/collections/Members";
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

const siteURL = process.env.NEXT_PUBLIC_SITE_URL;

export default buildConfig({
  secret: appSecret(),
  // Cookie-authenticated requests are only accepted from our own origin.
  ...(siteURL ? { serverURL: siteURL, csrf: [siteURL] } : {}),
  db,
  sharp,
  editor: lexicalEditor(),
  localization: {
    locales: ["es", "en"],
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
    },
    components: {
      graphics: {
        Icon: "/cms/components/AdminIcon#AdminIcon",
        Logo: "/cms/components/AdminLogo#AdminLogo",
      },
    },
  },
  collections: [
    Users,
    Media,
    MenuCategories,
    MenuItems,
    TaxRates,
    ModifierGroups,
    Modifiers,
    Events,
    StoryChapters,
    InventoryItems,
    StockMovements,
    Orders,
    Members,
    PosDevices,
    AuditLog,
  ],
  typescript: {
    outputFile: path.resolve(dirname, "cms/payload-types.ts"),
  },
});

import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
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
 * Database: Postgres in production (DATABASE_URL, Supabase transaction
 * pooler), SQLite file for local development (PAYLOAD_SQLITE_PATH overrides
 * the file, used by the integration tests). Vercel's serverless
 * filesystem is read-only, so production REQUIRES DATABASE_URL.
 */
const db = process.env.DATABASE_URL
  ? postgresAdapter({
      pool: { connectionString: process.env.DATABASE_URL },
      // Own schema: Supabase's public Data API only exposes "public", so the
      // anon key can never reach staff hashes or orders.
      schemaName: "payload",
      // Schema changes reach Postgres ONLY through committed migrations
      // (run by the vercel-build script), never by a dev server's push.
      push: false,
      migrationDir: path.resolve(dirname, "migrations"),
    })
  : sqliteAdapter({
      client: {
        url: `file:${process.env.PAYLOAD_SQLITE_PATH ?? path.resolve(dirname, "payload.db")}`,
      },
    });

if (process.env.VERCEL && !process.env.DATABASE_URL) {
  console.warn(
    "[payload] Running on Vercel without DATABASE_URL — the admin will not persist. Provision Postgres and set DATABASE_URL.",
  );
}

export default buildConfig({
  secret: appSecret(),
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

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
import { RecipeOptions } from "./cms/collections/RecipeOptions";
import { Events } from "./cms/collections/Events";
import { StoryChapters } from "./cms/collections/StoryChapters";
import { InventoryItems } from "./cms/collections/InventoryItems";
import { StockMovements } from "./cms/collections/StockMovements";
import { Orders } from "./cms/collections/Orders";
import { Members } from "./cms/collections/Members";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database: Postgres in production (DATABASE_URL from Neon / Vercel
 * Postgres), SQLite file for local development. Vercel's serverless
 * filesystem is read-only, so production REQUIRES DATABASE_URL.
 */
const db = process.env.DATABASE_URL
  ? postgresAdapter({
      pool: { connectionString: process.env.DATABASE_URL },
    })
  : sqliteAdapter({
      client: { url: `file:${path.resolve(dirname, "payload.db")}` },
    });

if (process.env.VERCEL && !process.env.DATABASE_URL) {
  console.warn(
    "[payload] Running on Vercel without DATABASE_URL — the admin will not persist. Provision Postgres and set DATABASE_URL.",
  );
}

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET ?? "maisha-dev-secret-change-in-prod",
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
    RecipeOptions,
    Events,
    StoryChapters,
    InventoryItems,
    StockMovements,
    Orders,
    Members,
  ],
  typescript: {
    outputFile: path.resolve(dirname, "cms/payload-types.ts"),
  },
});

import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { buildConfig, type CollectionConfig, type Field, type FieldHook } from "payload";
import { es } from "@payloadcms/translations/languages/es";
import { en } from "@payloadcms/translations/languages/en";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { payloadTotp } from "payload-totp";

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

/**
 * What the public site reads (the carta, events, story, photos, IVA rates).
 * The authenticator check (payload-totp) wraps every access rule so a
 * session that still owes its code gets nothing; these keep their public
 * READ untouched. Writing them still needs the code.
 */
const PUBLIC_READ = new Set(["media", "menu-categories", "menu-items", "modifier-groups", "modifiers", "tax-rates", "events", "story-chapters"]);

/**
 * payload-totp works out "has this person set a code up" on every read of a
 * staff record, with its own database query OUTSIDE the transaction that is
 * reading. Parallel sales at the counter (each a transaction that reads its
 * barista) then wait on each other for pool connections and lock up. Same
 * check, same select, run on the caller's `req` (so in its transaction).
 */
function hasTotpInTransaction(field: Field): Field {
  if (!("name" in field) || field.name !== "hasTotp") return field;
  const afterRead: FieldHook = async ({ data, req }) => {
    if (!data?.id) return false;
    try {
      const doc = await req.payload.findByID({
        collection: "users",
        id: data.id,
        req,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
        select: { totpSecret: true },
      });
      return Boolean((doc as { totpSecret?: string | null }).totpSecret);
    } catch {
      return false;
    }
  };
  return { ...field, hooks: { ...(field as { hooks?: object }).hooks, afterRead: [afterRead] } } as Field;
}

/** The authenticator screens (payload-totp) in the salon's voice. */
const TOTP_COPY = {
  es: {
    authApp: "Código de acceso",
    configured: "Activado",
    errors: { alreadySet: "El código de acceso ya está activado." },
    fieldDescription: "Al entrar, después de la contraseña, se pide un código de seis cifras de tu app de autenticación.",
    setup: {
      addCodeManually: "Escribir la clave a mano",
      button: "Activar",
      description:
        "Escanea este código con una app de autenticación (Google Authenticator, 1Password o Contraseñas de Apple). Desde ahora, al entrar, te pedirá un código de seis cifras.",
      enterCode: "Escribe el código de {digits} cifras que muestra la app.",
      incorrectCode: "Ese código no es válido. Espera al siguiente y vuelve a probar.",
      title: "Un segundo paso al entrar",
    },
    verify: { title: "Tu código" },
  },
  en: {
    authApp: "Sign-in code",
    configured: "On",
    errors: { alreadySet: "The sign-in code is already on." },
    fieldDescription: "After your password, sign-in asks for a six-digit code from your authenticator app.",
    setup: {
      addCodeManually: "Type the key instead",
      button: "Turn on",
      description:
        "Scan this code with an authenticator app (Google Authenticator, 1Password or Apple Passwords). From now on, signing in asks for a six-digit code.",
      enterCode: "Type the {digits}-digit code the app shows.",
      incorrectCode: "That code is not valid. Wait for the next one and try again.",
      title: "A second step at sign-in",
    },
    verify: { title: "Your code" },
  },
};

/** Groups each collection in the dashboard and hides the developer API tab. */
function inSalonOrder(list: [CollectionConfig, Record<"es" | "en", string>][]): CollectionConfig[] {
  return list.map(([collection, group]) => ({
    ...collection,
    admin: { ...collection.admin, group, hideAPIURL: true },
    ...(PUBLIC_READ.has(collection.slug)
      ? { custom: { ...collection.custom, totp: { disableAccessWrapper: { read: true } } } }
      : {}),
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
      views: {
        dashboard: { Component: "/cms/components/OwnerDashboard#OwnerDashboardView" },
        // Subscribers' monthly boxes still owed: to post, and to collect.
        boxes: { Component: "/cms/components/BoxesView#BoxesView", path: "/cajas", exact: true },
      },
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
      es: { general: { locale: "Contenido en" }, authentication: { login: "Entrar" } },
      en: { general: { locale: "Content in" }, authentication: { login: "Sign in" } },
    },
  },
  // Dashboard order and groups follow how the salon works, not the schema.
  collections: inSalonOrder([
    [Orders, { es: "Barra", en: "Bar" }],
    [Payments, { es: "Barra", en: "Bar" }],
    [Refunds, { es: "Barra", en: "Bar" }],
    [Shifts, { es: "Barra", en: "Bar" }],
    [PosDevices, { es: "Barra", en: "Bar" }],
    [MenuItems, { es: "Carta", en: "Menu" }],
    [MenuCategories, { es: "Carta", en: "Menu" }],
    [ModifierGroups, { es: "Carta", en: "Menu" }],
    [Modifiers, { es: "Carta", en: "Menu" }],
    [TaxRates, { es: "Carta", en: "Menu" }],
    [InventoryItems, { es: "Inventario", en: "Inventory" }],
    [RecipeLines, { es: "Inventario", en: "Inventory" }],
    [StockMovements, { es: "Inventario", en: "Inventory" }],
    [StockCounts, { es: "Inventario", en: "Inventory" }],
    [Batches, { es: "Inventario", en: "Inventory" }],
    [PurchaseOrders, { es: "Proveedores", en: "Suppliers" }],
    [Suppliers, { es: "Proveedores", en: "Suppliers" }],
    [SupplierProducts, { es: "Proveedores", en: "Suppliers" }],
    [Members, { es: "Personas", en: "People" }],
    [Rsvps, { es: "Personas", en: "People" }],
    [Users, { es: "Personas", en: "People" }],
    [Events, { es: "Web", en: "Website" }],
    [Campaigns, { es: "Web", en: "Website" }],
    [StoryChapters, { es: "Web", en: "Website" }],
    [Media, { es: "Web", en: "Website" }],
    [Invoices, { es: "Control", en: "Control" }],
    [AuditLog, { es: "Control", en: "Control" }],
    [Sequences, { es: "Control", en: "Control" }],
  ]),
  globals: [Business],
  plugins: [
    // Two-step sign-in for the back office: password, then a 6-digit code
    // from an authenticator app. Everyone who can sign in (owner, manager)
    // must set it up on first sign-in. Baristas never sign in here (PIN at
    // the counter). Lost phone: see HANDOFF.md. Keep this plugin LAST.
    payloadTotp({
      collection: "users",
      forceSetup: true,
      totp: { issuer: "maisha matcha" },
    }),
    // Its screens in our words (the plugin's own Spanish is generic), and
    // its "has a code" check kept inside the caller's transaction. Adds no
    // collections, so it may follow the TOTP plugin.
    (cfg) => ({
      ...cfg,
      collections: cfg.collections?.map((c) => (c.slug === "users" ? { ...c, fields: c.fields.map(hasTotpInTransaction) } : c)),
      i18n: {
        ...cfg.i18n,
        translations: {
          ...cfg.i18n?.translations,
          es: { ...cfg.i18n?.translations?.es, totpPlugin: TOTP_COPY.es },
          en: { ...cfg.i18n?.translations?.en, totpPlugin: TOTP_COPY.en },
        },
      },
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, "cms/payload-types.ts"),
  },
});

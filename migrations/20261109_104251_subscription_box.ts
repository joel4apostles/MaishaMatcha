import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_orders_fulfilment" AS ENUM('pickup', 'shipping');
  CREATE TYPE "payload"."enum_members_box_delivery" AS ENUM('pickup', 'shipping');
  CREATE TYPE "payload"."enum_events_kind" AS ENUM('tasting', 'cupping', 'workshop', 'ceremony', 'gathering');
  ALTER TABLE "payload"."orders" ADD COLUMN "fulfilment" "payload"."enum_orders_fulfilment";
  ALTER TABLE "payload"."orders" ADD COLUMN "ship_to_name" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "ship_to_phone" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "ship_to_line1" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "ship_to_line2" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "ship_to_postal_code" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "ship_to_city" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "ship_to_province" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "shipped_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."members" ADD COLUMN "box_delivery" "payload"."enum_members_box_delivery" DEFAULT 'pickup';
  ALTER TABLE "payload"."members" ADD COLUMN "ship_to_name" varchar;
  ALTER TABLE "payload"."members" ADD COLUMN "ship_to_phone" varchar;
  ALTER TABLE "payload"."members" ADD COLUMN "ship_to_line1" varchar;
  ALTER TABLE "payload"."members" ADD COLUMN "ship_to_line2" varchar;
  ALTER TABLE "payload"."members" ADD COLUMN "ship_to_postal_code" varchar;
  ALTER TABLE "payload"."members" ADD COLUMN "ship_to_city" varchar;
  ALTER TABLE "payload"."members" ADD COLUMN "ship_to_province" varchar;
  ALTER TABLE "payload"."events" ADD COLUMN "kind" "payload"."enum_events_kind";
  ALTER TABLE "payload"."business" ADD COLUMN "premium_product_id" integer;
  ALTER TABLE "payload"."business" ADD COLUMN "premium_shipping_cents" numeric;
  ALTER TABLE "payload"."business" ADD CONSTRAINT "business_premium_product_id_menu_items_id_fk" FOREIGN KEY ("premium_product_id") REFERENCES "payload"."menu_items"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "business_premium_product_idx" ON "payload"."business" USING btree ("premium_product_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."business" DROP CONSTRAINT "business_premium_product_id_menu_items_id_fk";
  
  DROP INDEX "payload"."business_premium_product_idx";
  ALTER TABLE "payload"."orders" DROP COLUMN "fulfilment";
  ALTER TABLE "payload"."orders" DROP COLUMN "ship_to_name";
  ALTER TABLE "payload"."orders" DROP COLUMN "ship_to_phone";
  ALTER TABLE "payload"."orders" DROP COLUMN "ship_to_line1";
  ALTER TABLE "payload"."orders" DROP COLUMN "ship_to_line2";
  ALTER TABLE "payload"."orders" DROP COLUMN "ship_to_postal_code";
  ALTER TABLE "payload"."orders" DROP COLUMN "ship_to_city";
  ALTER TABLE "payload"."orders" DROP COLUMN "ship_to_province";
  ALTER TABLE "payload"."orders" DROP COLUMN "shipped_at";
  ALTER TABLE "payload"."members" DROP COLUMN "box_delivery";
  ALTER TABLE "payload"."members" DROP COLUMN "ship_to_name";
  ALTER TABLE "payload"."members" DROP COLUMN "ship_to_phone";
  ALTER TABLE "payload"."members" DROP COLUMN "ship_to_line1";
  ALTER TABLE "payload"."members" DROP COLUMN "ship_to_line2";
  ALTER TABLE "payload"."members" DROP COLUMN "ship_to_postal_code";
  ALTER TABLE "payload"."members" DROP COLUMN "ship_to_city";
  ALTER TABLE "payload"."members" DROP COLUMN "ship_to_province";
  ALTER TABLE "payload"."events" DROP COLUMN "kind";
  ALTER TABLE "payload"."business" DROP COLUMN "premium_product_id";
  ALTER TABLE "payload"."business" DROP COLUMN "premium_shipping_cents";
  DROP TYPE "payload"."enum_orders_fulfilment";
  DROP TYPE "payload"."enum_members_box_delivery";
  DROP TYPE "payload"."enum_events_kind";`)
}

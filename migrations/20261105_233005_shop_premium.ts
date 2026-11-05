import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_members_subscription_status" AS ENUM('none', 'active', 'past_due', 'cancelled');
  ALTER TYPE "payload"."enum_orders_kind" ADD VALUE 'subscription';
  ALTER TABLE "payload"."menu_items" ADD COLUMN "stock" numeric;
  ALTER TABLE "payload"."menu_categories" ADD COLUMN "shop" boolean DEFAULT false;
  ALTER TABLE "payload"."members" ADD COLUMN "subscription_status" "payload"."enum_members_subscription_status" DEFAULT 'none';
  ALTER TABLE "payload"."members" ADD COLUMN "subscription_period_end" timestamp(3) with time zone;
  ALTER TABLE "payload"."members" ADD COLUMN "cancel_at_period_end" boolean;
  ALTER TABLE "payload"."members" ADD COLUMN "stripe_customer_id" varchar;
  ALTER TABLE "payload"."members" ADD COLUMN "stripe_subscription_id" varchar;
  ALTER TABLE "payload"."business" ADD COLUMN "premium_open" boolean DEFAULT false;
  ALTER TABLE "payload"."business" ADD COLUMN "premium_monthly_cents" numeric;
  ALTER TABLE "payload"."business" ADD COLUMN "premium_founding_monthly_cents" numeric;
  ALTER TABLE "payload"."business" ADD COLUMN "premium_tax_rate_id" integer;
  ALTER TABLE "payload"."business_locales" ADD COLUMN "premium_perks" varchar;
  ALTER TABLE "payload"."business" ADD CONSTRAINT "business_premium_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("premium_tax_rate_id") REFERENCES "payload"."tax_rates"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "members_stripe_customer_id_idx" ON "payload"."members" USING btree ("stripe_customer_id");
  CREATE INDEX "members_stripe_subscription_id_idx" ON "payload"."members" USING btree ("stripe_subscription_id");
  CREATE INDEX "business_premium_tax_rate_idx" ON "payload"."business" USING btree ("premium_tax_rate_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."business" DROP CONSTRAINT "business_premium_tax_rate_id_tax_rates_id_fk";
  
  ALTER TABLE "payload"."orders" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "kind" SET DEFAULT 'sale'::text;
  DROP TYPE "payload"."enum_orders_kind";
  CREATE TYPE "payload"."enum_orders_kind" AS ENUM('sale', 'membership');
  ALTER TABLE "payload"."orders" ALTER COLUMN "kind" SET DEFAULT 'sale'::"payload"."enum_orders_kind";
  ALTER TABLE "payload"."orders" ALTER COLUMN "kind" SET DATA TYPE "payload"."enum_orders_kind" USING "kind"::"payload"."enum_orders_kind";
  DROP INDEX "payload"."members_stripe_customer_id_idx";
  DROP INDEX "payload"."members_stripe_subscription_id_idx";
  DROP INDEX "payload"."business_premium_tax_rate_idx";
  ALTER TABLE "payload"."menu_items" DROP COLUMN "stock";
  ALTER TABLE "payload"."menu_categories" DROP COLUMN "shop";
  ALTER TABLE "payload"."members" DROP COLUMN "subscription_status";
  ALTER TABLE "payload"."members" DROP COLUMN "subscription_period_end";
  ALTER TABLE "payload"."members" DROP COLUMN "cancel_at_period_end";
  ALTER TABLE "payload"."members" DROP COLUMN "stripe_customer_id";
  ALTER TABLE "payload"."members" DROP COLUMN "stripe_subscription_id";
  ALTER TABLE "payload"."business" DROP COLUMN "premium_open";
  ALTER TABLE "payload"."business" DROP COLUMN "premium_monthly_cents";
  ALTER TABLE "payload"."business" DROP COLUMN "premium_founding_monthly_cents";
  ALTER TABLE "payload"."business" DROP COLUMN "premium_tax_rate_id";
  ALTER TABLE "payload"."business_locales" DROP COLUMN "premium_perks";
  DROP TYPE "payload"."enum_members_subscription_status";`)
}

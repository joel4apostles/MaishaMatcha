import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_business_open_days" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
  CREATE TABLE "payload"."business_open_days" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_business_open_days",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "payload"."orders" ADD COLUMN "pay_online" boolean DEFAULT false;
  ALTER TABLE "payload"."orders" ADD COLUMN "customer_email" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "customer_phone" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "pickup_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."orders" ADD COLUMN "ready_notified_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."orders" ADD COLUMN "public_token" varchar;
  ALTER TABLE "payload"."business" ADD COLUMN "online_ordering" boolean DEFAULT false;
  ALTER TABLE "payload"."business" ADD COLUMN "opening_time" varchar DEFAULT '08:00';
  ALTER TABLE "payload"."business" ADD COLUMN "closing_time" varchar DEFAULT '18:00';
  ALTER TABLE "payload"."business" ADD COLUMN "slot_minutes" numeric DEFAULT 15;
  ALTER TABLE "payload"."business" ADD COLUMN "slot_capacity" numeric DEFAULT 6;
  ALTER TABLE "payload"."business" ADD COLUMN "lead_minutes" numeric DEFAULT 15;
  ALTER TABLE "payload"."business_open_days" ADD CONSTRAINT "business_open_days_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."business"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "business_open_days_order_idx" ON "payload"."business_open_days" USING btree ("order");
  CREATE INDEX "business_open_days_parent_idx" ON "payload"."business_open_days" USING btree ("parent_id");
  CREATE UNIQUE INDEX "orders_public_token_idx" ON "payload"."orders" USING btree ("public_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."business_open_days" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."business_open_days" CASCADE;
  DROP INDEX "payload"."orders_public_token_idx";
  ALTER TABLE "payload"."orders" DROP COLUMN "pay_online";
  ALTER TABLE "payload"."orders" DROP COLUMN "customer_email";
  ALTER TABLE "payload"."orders" DROP COLUMN "customer_phone";
  ALTER TABLE "payload"."orders" DROP COLUMN "pickup_at";
  ALTER TABLE "payload"."orders" DROP COLUMN "ready_notified_at";
  ALTER TABLE "payload"."orders" DROP COLUMN "public_token";
  ALTER TABLE "payload"."business" DROP COLUMN "online_ordering";
  ALTER TABLE "payload"."business" DROP COLUMN "opening_time";
  ALTER TABLE "payload"."business" DROP COLUMN "closing_time";
  ALTER TABLE "payload"."business" DROP COLUMN "slot_minutes";
  ALTER TABLE "payload"."business" DROP COLUMN "slot_capacity";
  ALTER TABLE "payload"."business" DROP COLUMN "lead_minutes";
  DROP TYPE "payload"."enum_business_open_days";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_orders_kind" AS ENUM('sale', 'membership');
  CREATE TYPE "payload"."enum_members_locale" AS ENUM('es', 'en');
  CREATE TYPE "payload"."enum_rsvps_status" AS ENUM('going', 'cancelled');
  CREATE TYPE "payload"."enum_campaigns_audience" AS ENUM('all', 'founding');
  CREATE TYPE "payload"."enum_campaigns_locale" AS ENUM('es', 'en');
  CREATE TYPE "payload"."enum_campaigns_status" AS ENUM('draft', 'approved', 'sent');
  ALTER TYPE "payload"."enum_members_tier" ADD VALUE 'customer' BEFORE 'founding';
  CREATE TABLE "payload"."rsvps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"member_id" integer NOT NULL,
  	"seats" numeric DEFAULT 1 NOT NULL,
  	"status" "payload"."enum_rsvps_status" DEFAULT 'going' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"audience" "payload"."enum_campaigns_audience" DEFAULT 'all' NOT NULL,
  	"locale" "payload"."enum_campaigns_locale" DEFAULT 'es' NOT NULL,
  	"send_test_to" varchar,
  	"status" "payload"."enum_campaigns_status" DEFAULT 'draft' NOT NULL,
  	"sent_count" numeric,
  	"sent_at" timestamp(3) with time zone,
  	"approved_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."orders" ADD COLUMN "kind" "payload"."enum_orders_kind" DEFAULT 'sale';
  ALTER TABLE "payload"."members" ADD COLUMN "founding_number" numeric;
  ALTER TABLE "payload"."members" ADD COLUMN "founding_since" timestamp(3) with time zone;
  ALTER TABLE "payload"."members" ADD COLUMN "email_opt_in" boolean DEFAULT false;
  ALTER TABLE "payload"."members" ADD COLUMN "locale" "payload"."enum_members_locale" DEFAULT 'es';
  ALTER TABLE "payload"."members" ADD COLUMN "session_version" numeric DEFAULT 0;
  ALTER TABLE "payload"."members" ADD COLUMN "last_sign_in_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."events" ADD COLUMN "starts_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."events" ADD COLUMN "capacity" numeric;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "rsvps_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "campaigns_id" integer;
  ALTER TABLE "payload"."business" ADD COLUMN "founding_open" boolean DEFAULT false;
  ALTER TABLE "payload"."business" ADD COLUMN "founding_price_cents" numeric;
  ALTER TABLE "payload"."business" ADD COLUMN "founding_cap" numeric DEFAULT 50;
  ALTER TABLE "payload"."business" ADD COLUMN "founding_tax_rate_id" integer;
  ALTER TABLE "payload"."business_locales" ADD COLUMN "founding_perks" varchar;
  ALTER TABLE "payload"."rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "payload"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."rsvps" ADD CONSTRAINT "rsvps_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "payload"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."campaigns" ADD CONSTRAINT "campaigns_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "rsvps_event_idx" ON "payload"."rsvps" USING btree ("event_id");
  CREATE INDEX "rsvps_member_idx" ON "payload"."rsvps" USING btree ("member_id");
  CREATE INDEX "rsvps_updated_at_idx" ON "payload"."rsvps" USING btree ("updated_at");
  CREATE INDEX "rsvps_created_at_idx" ON "payload"."rsvps" USING btree ("created_at");
  CREATE UNIQUE INDEX "event_member_idx" ON "payload"."rsvps" USING btree ("event_id","member_id");
  CREATE INDEX "campaigns_approved_by_idx" ON "payload"."campaigns" USING btree ("approved_by_id");
  CREATE INDEX "campaigns_updated_at_idx" ON "payload"."campaigns" USING btree ("updated_at");
  CREATE INDEX "campaigns_created_at_idx" ON "payload"."campaigns" USING btree ("created_at");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rsvps_fk" FOREIGN KEY ("rsvps_id") REFERENCES "payload"."rsvps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campaigns_fk" FOREIGN KEY ("campaigns_id") REFERENCES "payload"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."business" ADD CONSTRAINT "business_founding_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("founding_tax_rate_id") REFERENCES "payload"."tax_rates"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_rsvps_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("rsvps_id");
  CREATE INDEX "payload_locked_documents_rels_campaigns_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("campaigns_id");
  CREATE INDEX "business_founding_tax_rate_idx" ON "payload"."business" USING btree ("founding_tax_rate_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."rsvps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."campaigns" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."rsvps" CASCADE;
  DROP TABLE "payload"."campaigns" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rsvps_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_campaigns_fk";
  
  ALTER TABLE "payload"."business" DROP CONSTRAINT "business_founding_tax_rate_id_tax_rates_id_fk";
  
  ALTER TABLE "payload"."members" ALTER COLUMN "tier" SET DATA TYPE text;
  ALTER TABLE "payload"."members" ALTER COLUMN "tier" SET DEFAULT 'founding'::text;
  DROP TYPE "payload"."enum_members_tier";
  CREATE TYPE "payload"."enum_members_tier" AS ENUM('founding', 'premium', 'waitlist');
  ALTER TABLE "payload"."members" ALTER COLUMN "tier" SET DEFAULT 'founding'::"payload"."enum_members_tier";
  ALTER TABLE "payload"."members" ALTER COLUMN "tier" SET DATA TYPE "payload"."enum_members_tier" USING "tier"::"payload"."enum_members_tier";
  DROP INDEX "payload"."payload_locked_documents_rels_rsvps_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_campaigns_id_idx";
  DROP INDEX "payload"."business_founding_tax_rate_idx";
  ALTER TABLE "payload"."orders" DROP COLUMN "kind";
  ALTER TABLE "payload"."members" DROP COLUMN "founding_number";
  ALTER TABLE "payload"."members" DROP COLUMN "founding_since";
  ALTER TABLE "payload"."members" DROP COLUMN "email_opt_in";
  ALTER TABLE "payload"."members" DROP COLUMN "locale";
  ALTER TABLE "payload"."members" DROP COLUMN "session_version";
  ALTER TABLE "payload"."members" DROP COLUMN "last_sign_in_at";
  ALTER TABLE "payload"."events" DROP COLUMN "starts_at";
  ALTER TABLE "payload"."events" DROP COLUMN "capacity";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "rsvps_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "campaigns_id";
  ALTER TABLE "payload"."business" DROP COLUMN "founding_open";
  ALTER TABLE "payload"."business" DROP COLUMN "founding_price_cents";
  ALTER TABLE "payload"."business" DROP COLUMN "founding_cap";
  ALTER TABLE "payload"."business" DROP COLUMN "founding_tax_rate_id";
  ALTER TABLE "payload"."business_locales" DROP COLUMN "founding_perks";
  DROP TYPE "payload"."enum_orders_kind";
  DROP TYPE "payload"."enum_members_locale";
  DROP TYPE "payload"."enum_rsvps_status";
  DROP TYPE "payload"."enum_campaigns_audience";
  DROP TYPE "payload"."enum_campaigns_locale";
  DROP TYPE "payload"."enum_campaigns_status";`)
}

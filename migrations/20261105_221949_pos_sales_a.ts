import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_payments_method" AS ENUM('cash', 'card_terminal', 'card_stripe', 'online');
  CREATE TYPE "payload"."enum_shifts_status" AS ENUM('open', 'closed');
  CREATE TYPE "payload"."enum_invoices_type" AS ENUM('F2', 'F1', 'R5');
  CREATE TYPE "payload"."enum_invoices_aeat_status" AS ENUM('pending', 'accepted', 'rejected');
  CREATE TABLE "payload"."payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"shift_id" integer,
  	"method" "payload"."enum_payments_method" NOT NULL,
  	"amount_cents" numeric NOT NULL,
  	"tendered_cents" numeric,
  	"change_cents" numeric,
  	"provider_ref" varchar,
  	"staff_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."shifts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"device_id" integer NOT NULL,
  	"status" "payload"."enum_shifts_status" DEFAULT 'open' NOT NULL,
  	"opened_by_id" integer,
  	"opened_at" timestamp(3) with time zone NOT NULL,
  	"float_cents" numeric NOT NULL,
  	"closed_by_id" integer,
  	"closed_at" timestamp(3) with time zone,
  	"expected_cash_cents" numeric,
  	"counted_cash_cents" numeric,
  	"difference_cents" numeric,
  	"report" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."invoices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_number" varchar NOT NULL,
  	"series" varchar NOT NULL,
  	"number" numeric NOT NULL,
  	"type" "payload"."enum_invoices_type" DEFAULT 'F2' NOT NULL,
  	"order_id" integer NOT NULL,
  	"issued_at" timestamp(3) with time zone NOT NULL,
  	"issuer_nif" varchar,
  	"total_cents" numeric NOT NULL,
  	"tax_cents" numeric NOT NULL,
  	"tax_breakdown" jsonb,
  	"hash" varchar NOT NULL,
  	"previous_hash" varchar,
  	"qr_url" varchar,
  	"aeat_status" "payload"."enum_invoices_aeat_status" DEFAULT 'pending' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."sequences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"value" numeric DEFAULT 0 NOT NULL,
  	"last_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."business" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"legal_name" varchar,
  	"trade_name" varchar DEFAULT 'maisha matcha',
  	"nif" varchar,
  	"address" varchar DEFAULT 'Plaza Cetina, 3, Murcia',
  	"invoice_series" varchar DEFAULT 'T',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."business_locales" (
  	"receipt_footer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'received'::text;
  DROP TYPE "payload"."enum_orders_status";
  CREATE TYPE "payload"."enum_orders_status" AS ENUM('received', 'preparing', 'ready', 'collected', 'cancelled');
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'received'::"payload"."enum_orders_status";
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE "payload"."enum_orders_status" USING "status"::"payload"."enum_orders_status";
  ALTER TABLE "payload"."menu_items" ADD COLUMN "default_grams" numeric;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "shifts_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "invoices_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "sequences_id" integer;
  ALTER TABLE "payload"."payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payments" ADD CONSTRAINT "payments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "payload"."shifts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payments" ADD CONSTRAINT "payments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."shifts" ADD CONSTRAINT "shifts_device_id_pos_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "payload"."pos_devices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."shifts" ADD CONSTRAINT "shifts_opened_by_id_users_id_fk" FOREIGN KEY ("opened_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."shifts" ADD CONSTRAINT "shifts_closed_by_id_users_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."business_locales" ADD CONSTRAINT "business_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."business"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payments_order_idx" ON "payload"."payments" USING btree ("order_id");
  CREATE INDEX "payments_shift_idx" ON "payload"."payments" USING btree ("shift_id");
  CREATE INDEX "payments_staff_idx" ON "payload"."payments" USING btree ("staff_id");
  CREATE INDEX "payments_updated_at_idx" ON "payload"."payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payload"."payments" USING btree ("created_at");
  CREATE INDEX "shifts_device_idx" ON "payload"."shifts" USING btree ("device_id");
  CREATE INDEX "shifts_opened_by_idx" ON "payload"."shifts" USING btree ("opened_by_id");
  CREATE INDEX "shifts_closed_by_idx" ON "payload"."shifts" USING btree ("closed_by_id");
  CREATE INDEX "shifts_updated_at_idx" ON "payload"."shifts" USING btree ("updated_at");
  CREATE INDEX "shifts_created_at_idx" ON "payload"."shifts" USING btree ("created_at");
  CREATE UNIQUE INDEX "invoices_full_number_idx" ON "payload"."invoices" USING btree ("full_number");
  CREATE INDEX "invoices_order_idx" ON "payload"."invoices" USING btree ("order_id");
  CREATE INDEX "invoices_hash_idx" ON "payload"."invoices" USING btree ("hash");
  CREATE INDEX "invoices_updated_at_idx" ON "payload"."invoices" USING btree ("updated_at");
  CREATE INDEX "invoices_created_at_idx" ON "payload"."invoices" USING btree ("created_at");
  CREATE UNIQUE INDEX "sequences_key_idx" ON "payload"."sequences" USING btree ("key");
  CREATE INDEX "sequences_updated_at_idx" ON "payload"."sequences" USING btree ("updated_at");
  CREATE INDEX "sequences_created_at_idx" ON "payload"."sequences" USING btree ("created_at");
  CREATE UNIQUE INDEX "business_locales_locale_parent_id_unique" ON "payload"."business_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "business_locales_parent_id_idx" ON "payload"."business_locales" USING btree ("_parent_id");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "payload"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shifts_fk" FOREIGN KEY ("shifts_id") REFERENCES "payload"."shifts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invoices_fk" FOREIGN KEY ("invoices_id") REFERENCES "payload"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sequences_fk" FOREIGN KEY ("sequences_id") REFERENCES "payload"."sequences"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_shifts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("shifts_id");
  CREATE INDEX "payload_locked_documents_rels_invoices_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("invoices_id");
  CREATE INDEX "payload_locked_documents_rels_sequences_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("sequences_id");
  ALTER TABLE "payload"."orders" DROP COLUMN "summary";
  ALTER TABLE "payload"."orders" DROP COLUMN "code";
  ALTER TABLE "payload"."orders" DROP COLUMN "price_cents";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."shifts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."invoices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."sequences" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."business" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."business_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."payments" CASCADE;
  DROP TABLE "payload"."shifts" CASCADE;
  DROP TABLE "payload"."invoices" CASCADE;
  DROP TABLE "payload"."sequences" CASCADE;
  DROP TABLE "payload"."business" CASCADE;
  DROP TABLE "payload"."business_locales" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shifts_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_invoices_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sequences_fk";
  
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'nueva'::text;
  DROP TYPE "payload"."enum_orders_status";
  CREATE TYPE "payload"."enum_orders_status" AS ENUM('nueva', 'preparando', 'lista', 'entregada', 'cancelada');
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DEFAULT 'nueva'::"payload"."enum_orders_status";
  ALTER TABLE "payload"."orders" ALTER COLUMN "status" SET DATA TYPE "payload"."enum_orders_status" USING "status"::"payload"."enum_orders_status";
  DROP INDEX "payload"."payload_locked_documents_rels_payments_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_shifts_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_invoices_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_sequences_id_idx";
  ALTER TABLE "payload"."orders" ADD COLUMN "summary" varchar NOT NULL;
  ALTER TABLE "payload"."orders" ADD COLUMN "code" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "price_cents" numeric;
  ALTER TABLE "payload"."menu_items" DROP COLUMN "default_grams";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "payments_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "shifts_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "invoices_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "sequences_id";
  DROP TYPE "payload"."enum_payments_method";
  DROP TYPE "payload"."enum_shifts_status";
  DROP TYPE "payload"."enum_invoices_type";
  DROP TYPE "payload"."enum_invoices_aeat_status";`)
}

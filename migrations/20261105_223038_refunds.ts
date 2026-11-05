import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_refunds_method" AS ENUM('cash', 'card_terminal', 'card_stripe', 'online');
  CREATE TABLE "payload"."refunds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"shift_id" integer,
  	"method" "payload"."enum_refunds_method" NOT NULL,
  	"amount_cents" numeric NOT NULL,
  	"reason" varchar NOT NULL,
  	"staff_id" integer,
  	"approved_by_id" integer,
  	"invoice_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."invoices" ADD COLUMN "rectifies_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "refunds_id" integer;
  ALTER TABLE "payload"."refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."refunds" ADD CONSTRAINT "refunds_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "payload"."shifts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."refunds" ADD CONSTRAINT "refunds_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."refunds" ADD CONSTRAINT "refunds_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."refunds" ADD CONSTRAINT "refunds_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "payload"."invoices"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "refunds_order_idx" ON "payload"."refunds" USING btree ("order_id");
  CREATE INDEX "refunds_shift_idx" ON "payload"."refunds" USING btree ("shift_id");
  CREATE INDEX "refunds_staff_idx" ON "payload"."refunds" USING btree ("staff_id");
  CREATE INDEX "refunds_approved_by_idx" ON "payload"."refunds" USING btree ("approved_by_id");
  CREATE INDEX "refunds_invoice_idx" ON "payload"."refunds" USING btree ("invoice_id");
  CREATE INDEX "refunds_updated_at_idx" ON "payload"."refunds" USING btree ("updated_at");
  CREATE INDEX "refunds_created_at_idx" ON "payload"."refunds" USING btree ("created_at");
  ALTER TABLE "payload"."invoices" ADD CONSTRAINT "invoices_rectifies_id_invoices_id_fk" FOREIGN KEY ("rectifies_id") REFERENCES "payload"."invoices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_refunds_fk" FOREIGN KEY ("refunds_id") REFERENCES "payload"."refunds"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "invoices_rectifies_idx" ON "payload"."invoices" USING btree ("rectifies_id");
  CREATE INDEX "payload_locked_documents_rels_refunds_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("refunds_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."refunds" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."refunds" CASCADE;
  ALTER TABLE "payload"."invoices" DROP CONSTRAINT "invoices_rectifies_id_invoices_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_refunds_fk";
  
  DROP INDEX "payload"."invoices_rectifies_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_refunds_id_idx";
  ALTER TABLE "payload"."invoices" DROP COLUMN "rectifies_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "refunds_id";
  DROP TYPE "payload"."enum_refunds_method";`)
}

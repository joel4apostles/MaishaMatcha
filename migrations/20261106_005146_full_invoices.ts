import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "payload"."enum_invoices_type" ADD VALUE 'F3' BEFORE 'R5';
  ALTER TABLE "payload"."invoices" ADD COLUMN "replaces_id" integer;
  ALTER TABLE "payload"."invoices" ADD COLUMN "customer_name" varchar;
  ALTER TABLE "payload"."invoices" ADD COLUMN "customer_tax_id" varchar;
  ALTER TABLE "payload"."invoices" ADD COLUMN "customer_address" varchar;
  ALTER TABLE "payload"."business" ADD COLUMN "full_invoice_series" varchar DEFAULT 'F';
  ALTER TABLE "payload"."invoices" ADD CONSTRAINT "invoices_replaces_id_invoices_id_fk" FOREIGN KEY ("replaces_id") REFERENCES "payload"."invoices"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "invoices_replaces_idx" ON "payload"."invoices" USING btree ("replaces_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."invoices" DROP CONSTRAINT "invoices_replaces_id_invoices_id_fk";
  
  ALTER TABLE "payload"."invoices" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "payload"."invoices" ALTER COLUMN "type" SET DEFAULT 'F2'::text;
  DROP TYPE "payload"."enum_invoices_type";
  CREATE TYPE "payload"."enum_invoices_type" AS ENUM('F2', 'F1', 'R5');
  ALTER TABLE "payload"."invoices" ALTER COLUMN "type" SET DEFAULT 'F2'::"payload"."enum_invoices_type";
  ALTER TABLE "payload"."invoices" ALTER COLUMN "type" SET DATA TYPE "payload"."enum_invoices_type" USING "type"::"payload"."enum_invoices_type";
  DROP INDEX "payload"."invoices_replaces_idx";
  ALTER TABLE "payload"."invoices" DROP COLUMN "replaces_id";
  ALTER TABLE "payload"."invoices" DROP COLUMN "customer_name";
  ALTER TABLE "payload"."invoices" DROP COLUMN "customer_tax_id";
  ALTER TABLE "payload"."invoices" DROP COLUMN "customer_address";
  ALTER TABLE "payload"."business" DROP COLUMN "full_invoice_series";`)
}

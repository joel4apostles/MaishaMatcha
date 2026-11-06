import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."orders" ADD COLUMN "table" numeric;
  ALTER TABLE "payload"."business" ADD COLUMN "table_ordering" boolean DEFAULT false;
  ALTER TABLE "payload"."business" ADD COLUMN "table_count" numeric DEFAULT 8;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."orders" DROP COLUMN "table";
  ALTER TABLE "payload"."business" DROP COLUMN "table_ordering";
  ALTER TABLE "payload"."business" DROP COLUMN "table_count";`)
}

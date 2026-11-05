import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/**
 * Postgres cannot use an enum value in the transaction that added it, so
 * the new "customer" default for members.tier lands in its own migration.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "payload"."members" ALTER COLUMN "tier" SET DEFAULT 'customer';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "payload"."members" ALTER COLUMN "tier" SET DEFAULT 'founding';`);
}

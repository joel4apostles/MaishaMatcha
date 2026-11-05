import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

/** One spelling per customer email, so accounts and erasure find every order. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`UPDATE "payload"."orders" SET "customer_email" = lower(trim("customer_email")) WHERE "customer_email" IS NOT NULL;`);
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Lowercasing cannot be undone, and does not need to be.
}

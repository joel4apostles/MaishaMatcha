import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."menu_items_locales" ADD COLUMN "ritual" varchar;
  ALTER TABLE "payload"."menu_items_rels" ADD COLUMN "menu_items_id" integer;
  ALTER TABLE "payload"."menu_items_rels" ADD CONSTRAINT "menu_items_rels_menu_items_fk" FOREIGN KEY ("menu_items_id") REFERENCES "payload"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "menu_items_rels_menu_items_id_idx" ON "payload"."menu_items_rels" USING btree ("menu_items_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."menu_items_rels" DROP CONSTRAINT "menu_items_rels_menu_items_fk";
  
  DROP INDEX "payload"."menu_items_rels_menu_items_id_idx";
  ALTER TABLE "payload"."menu_items_locales" DROP COLUMN "ritual";
  ALTER TABLE "payload"."menu_items_rels" DROP COLUMN "menu_items_id";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_orders_channel" AS ENUM('counter', 'online', 'table');
  CREATE TYPE "payload"."enum_orders_service" AS ENUM('here', 'takeaway');
  CREATE TYPE "payload"."enum_orders_payment_status" AS ENUM('unpaid', 'paid', 'partially_refunded', 'refunded');
  CREATE TABLE "payload"."orders_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"menu_item_id" integer,
  	"name" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit_cents" numeric NOT NULL,
  	"tax_rate_basis_points" numeric NOT NULL,
  	"modifiers" jsonb,
  	"grams" numeric,
  	"note" varchar
  );
  
  ALTER TABLE "payload"."orders" ADD COLUMN "label" varchar;
  ALTER TABLE "payload"."orders" ADD COLUMN "channel" "payload"."enum_orders_channel" DEFAULT 'counter' NOT NULL;
  ALTER TABLE "payload"."orders" ADD COLUMN "service" "payload"."enum_orders_service" DEFAULT 'here' NOT NULL;
  ALTER TABLE "payload"."orders" ADD COLUMN "payment_status" "payload"."enum_orders_payment_status" DEFAULT 'unpaid' NOT NULL;
  ALTER TABLE "payload"."orders" ADD COLUMN "total_cents" numeric NOT NULL;
  ALTER TABLE "payload"."orders" ADD COLUMN "tax_breakdown" jsonb;
  ALTER TABLE "payload"."orders" ADD COLUMN "staff_id" integer;
  ALTER TABLE "payload"."orders" ADD COLUMN "device_id" integer;
  ALTER TABLE "payload"."orders" ADD COLUMN "shift_id" integer;
  ALTER TABLE "payload"."orders" ADD COLUMN "status_changed_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."orders" ADD COLUMN "idempotency_key" varchar NOT NULL;
  ALTER TABLE "payload"."orders_lines" ADD CONSTRAINT "orders_lines_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "payload"."menu_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_lines" ADD CONSTRAINT "orders_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_lines_order_idx" ON "payload"."orders_lines" USING btree ("_order");
  CREATE INDEX "orders_lines_parent_id_idx" ON "payload"."orders_lines" USING btree ("_parent_id");
  CREATE INDEX "orders_lines_menu_item_idx" ON "payload"."orders_lines" USING btree ("menu_item_id");
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_device_id_pos_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "payload"."pos_devices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "payload"."shifts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_staff_idx" ON "payload"."orders" USING btree ("staff_id");
  CREATE INDEX "orders_device_idx" ON "payload"."orders" USING btree ("device_id");
  CREATE INDEX "orders_shift_idx" ON "payload"."orders" USING btree ("shift_id");
  CREATE UNIQUE INDEX "orders_idempotency_key_idx" ON "payload"."orders" USING btree ("idempotency_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."orders_lines" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."orders_lines" CASCADE;
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_staff_id_users_id_fk";
  
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_device_id_pos_devices_id_fk";
  
  ALTER TABLE "payload"."orders" DROP CONSTRAINT "orders_shift_id_shifts_id_fk";
  
  DROP INDEX "payload"."orders_staff_idx";
  DROP INDEX "payload"."orders_device_idx";
  DROP INDEX "payload"."orders_shift_idx";
  DROP INDEX "payload"."orders_idempotency_key_idx";
  ALTER TABLE "payload"."orders" DROP COLUMN "label";
  ALTER TABLE "payload"."orders" DROP COLUMN "channel";
  ALTER TABLE "payload"."orders" DROP COLUMN "service";
  ALTER TABLE "payload"."orders" DROP COLUMN "payment_status";
  ALTER TABLE "payload"."orders" DROP COLUMN "total_cents";
  ALTER TABLE "payload"."orders" DROP COLUMN "tax_breakdown";
  ALTER TABLE "payload"."orders" DROP COLUMN "staff_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "device_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "shift_id";
  ALTER TABLE "payload"."orders" DROP COLUMN "status_changed_at";
  ALTER TABLE "payload"."orders" DROP COLUMN "idempotency_key";
  DROP TYPE "payload"."enum_orders_channel";
  DROP TYPE "payload"."enum_orders_service";
  DROP TYPE "payload"."enum_orders_payment_status";`)
}

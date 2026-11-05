import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_purchase_orders_status" AS ENUM('draft', 'sent', 'partially_received', 'received', 'cancelled');
  CREATE TABLE "payload"."recipe_lines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ingredient_id" integer NOT NULL,
  	"quantity" numeric NOT NULL,
  	"uses_measured_grams" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."recipe_lines_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"menu_items_id" integer,
  	"modifiers_id" integer
  );
  
  CREATE TABLE "payload"."stock_counts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ingredient_id" integer NOT NULL,
  	"counted_quantity" numeric NOT NULL,
  	"difference" numeric,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ingredient_id" integer NOT NULL,
  	"lot" varchar,
  	"quantity" numeric NOT NULL,
  	"expires_on" timestamp(3) with time zone,
  	"purchase_order_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."purchase_orders_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ingredient_id" integer NOT NULL,
  	"packs" numeric NOT NULL,
  	"pack_size" numeric NOT NULL,
  	"unit_price_cents" numeric,
  	"received_packs" numeric DEFAULT 0
  );
  
  CREATE TABLE "payload"."purchase_orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"supplier_id" integer NOT NULL,
  	"status" "payload"."enum_purchase_orders_status" DEFAULT 'draft' NOT NULL,
  	"total_cents" numeric,
  	"note" varchar,
  	"approved_by_id" integer,
  	"sent_at" timestamp(3) with time zone,
  	"email_status" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."suppliers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"contact_name" varchar,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"country" varchar,
  	"lead_time_days" numeric,
  	"min_order_cents" numeric,
  	"auto_send" boolean DEFAULT false,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."supplier_products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"supplier_id" integer NOT NULL,
  	"ingredient_id" integer NOT NULL,
  	"sku" varchar,
  	"pack_size" numeric NOT NULL,
  	"price_cents" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."inventory_items" ADD COLUMN "reorder_quantity" numeric;
  ALTER TABLE "payload"."inventory_items" ADD COLUMN "par_level" numeric;
  ALTER TABLE "payload"."inventory_items" ADD COLUMN "cost_cents_per1000" numeric;
  ALTER TABLE "payload"."inventory_items" ADD COLUMN "supplier_id" integer;
  ALTER TABLE "payload"."inventory_items" ADD COLUMN "shelf_life_days" numeric;
  ALTER TABLE "payload"."stock_movements" ADD COLUMN "order_id" integer;
  ALTER TABLE "payload"."stock_movements" ADD COLUMN "purchase_order_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "recipe_lines_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "stock_counts_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "batches_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "purchase_orders_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "suppliers_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "supplier_products_id" integer;
  ALTER TABLE "payload"."business" ADD COLUMN "target_margin_percent" numeric DEFAULT 65;
  ALTER TABLE "payload"."recipe_lines" ADD CONSTRAINT "recipe_lines_ingredient_id_inventory_items_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "payload"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."recipe_lines_rels" ADD CONSTRAINT "recipe_lines_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."recipe_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."recipe_lines_rels" ADD CONSTRAINT "recipe_lines_rels_menu_items_fk" FOREIGN KEY ("menu_items_id") REFERENCES "payload"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."recipe_lines_rels" ADD CONSTRAINT "recipe_lines_rels_modifiers_fk" FOREIGN KEY ("modifiers_id") REFERENCES "payload"."modifiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."stock_counts" ADD CONSTRAINT "stock_counts_ingredient_id_inventory_items_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "payload"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."batches" ADD CONSTRAINT "batches_ingredient_id_inventory_items_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "payload"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."batches" ADD CONSTRAINT "batches_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "payload"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."purchase_orders_lines" ADD CONSTRAINT "purchase_orders_lines_ingredient_id_inventory_items_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "payload"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."purchase_orders_lines" ADD CONSTRAINT "purchase_orders_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "payload"."suppliers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "payload"."suppliers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."supplier_products" ADD CONSTRAINT "supplier_products_ingredient_id_inventory_items_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "payload"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "recipe_lines_ingredient_idx" ON "payload"."recipe_lines" USING btree ("ingredient_id");
  CREATE INDEX "recipe_lines_updated_at_idx" ON "payload"."recipe_lines" USING btree ("updated_at");
  CREATE INDEX "recipe_lines_created_at_idx" ON "payload"."recipe_lines" USING btree ("created_at");
  CREATE INDEX "recipe_lines_rels_order_idx" ON "payload"."recipe_lines_rels" USING btree ("order");
  CREATE INDEX "recipe_lines_rels_parent_idx" ON "payload"."recipe_lines_rels" USING btree ("parent_id");
  CREATE INDEX "recipe_lines_rels_path_idx" ON "payload"."recipe_lines_rels" USING btree ("path");
  CREATE INDEX "recipe_lines_rels_menu_items_id_idx" ON "payload"."recipe_lines_rels" USING btree ("menu_items_id");
  CREATE INDEX "recipe_lines_rels_modifiers_id_idx" ON "payload"."recipe_lines_rels" USING btree ("modifiers_id");
  CREATE INDEX "stock_counts_ingredient_idx" ON "payload"."stock_counts" USING btree ("ingredient_id");
  CREATE INDEX "stock_counts_updated_at_idx" ON "payload"."stock_counts" USING btree ("updated_at");
  CREATE INDEX "stock_counts_created_at_idx" ON "payload"."stock_counts" USING btree ("created_at");
  CREATE INDEX "batches_ingredient_idx" ON "payload"."batches" USING btree ("ingredient_id");
  CREATE INDEX "batches_purchase_order_idx" ON "payload"."batches" USING btree ("purchase_order_id");
  CREATE INDEX "batches_updated_at_idx" ON "payload"."batches" USING btree ("updated_at");
  CREATE INDEX "batches_created_at_idx" ON "payload"."batches" USING btree ("created_at");
  CREATE INDEX "purchase_orders_lines_order_idx" ON "payload"."purchase_orders_lines" USING btree ("_order");
  CREATE INDEX "purchase_orders_lines_parent_id_idx" ON "payload"."purchase_orders_lines" USING btree ("_parent_id");
  CREATE INDEX "purchase_orders_lines_ingredient_idx" ON "payload"."purchase_orders_lines" USING btree ("ingredient_id");
  CREATE INDEX "purchase_orders_supplier_idx" ON "payload"."purchase_orders" USING btree ("supplier_id");
  CREATE INDEX "purchase_orders_approved_by_idx" ON "payload"."purchase_orders" USING btree ("approved_by_id");
  CREATE INDEX "purchase_orders_updated_at_idx" ON "payload"."purchase_orders" USING btree ("updated_at");
  CREATE INDEX "purchase_orders_created_at_idx" ON "payload"."purchase_orders" USING btree ("created_at");
  CREATE INDEX "suppliers_updated_at_idx" ON "payload"."suppliers" USING btree ("updated_at");
  CREATE INDEX "suppliers_created_at_idx" ON "payload"."suppliers" USING btree ("created_at");
  CREATE INDEX "supplier_products_supplier_idx" ON "payload"."supplier_products" USING btree ("supplier_id");
  CREATE INDEX "supplier_products_ingredient_idx" ON "payload"."supplier_products" USING btree ("ingredient_id");
  CREATE INDEX "supplier_products_updated_at_idx" ON "payload"."supplier_products" USING btree ("updated_at");
  CREATE INDEX "supplier_products_created_at_idx" ON "payload"."supplier_products" USING btree ("created_at");
  ALTER TABLE "payload"."inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "payload"."suppliers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."stock_movements" ADD CONSTRAINT "stock_movements_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "payload"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recipe_lines_fk" FOREIGN KEY ("recipe_lines_id") REFERENCES "payload"."recipe_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_counts_fk" FOREIGN KEY ("stock_counts_id") REFERENCES "payload"."stock_counts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_batches_fk" FOREIGN KEY ("batches_id") REFERENCES "payload"."batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_purchase_orders_fk" FOREIGN KEY ("purchase_orders_id") REFERENCES "payload"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_suppliers_fk" FOREIGN KEY ("suppliers_id") REFERENCES "payload"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_supplier_products_fk" FOREIGN KEY ("supplier_products_id") REFERENCES "payload"."supplier_products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "inventory_items_supplier_idx" ON "payload"."inventory_items" USING btree ("supplier_id");
  CREATE INDEX "stock_movements_order_idx" ON "payload"."stock_movements" USING btree ("order_id");
  CREATE INDEX "stock_movements_purchase_order_idx" ON "payload"."stock_movements" USING btree ("purchase_order_id");
  CREATE INDEX "payload_locked_documents_rels_recipe_lines_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("recipe_lines_id");
  CREATE INDEX "payload_locked_documents_rels_stock_counts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("stock_counts_id");
  CREATE INDEX "payload_locked_documents_rels_batches_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("batches_id");
  CREATE INDEX "payload_locked_documents_rels_purchase_orders_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("purchase_orders_id");
  CREATE INDEX "payload_locked_documents_rels_suppliers_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("suppliers_id");
  CREATE INDEX "payload_locked_documents_rels_supplier_products_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("supplier_products_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."recipe_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."recipe_lines_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."stock_counts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."batches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."purchase_orders_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."purchase_orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."suppliers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."supplier_products" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."recipe_lines" CASCADE;
  DROP TABLE "payload"."recipe_lines_rels" CASCADE;
  DROP TABLE "payload"."stock_counts" CASCADE;
  DROP TABLE "payload"."batches" CASCADE;
  DROP TABLE "payload"."purchase_orders_lines" CASCADE;
  DROP TABLE "payload"."purchase_orders" CASCADE;
  DROP TABLE "payload"."suppliers" CASCADE;
  DROP TABLE "payload"."supplier_products" CASCADE;
  ALTER TABLE "payload"."inventory_items" DROP CONSTRAINT "inventory_items_supplier_id_suppliers_id_fk";
  
  ALTER TABLE "payload"."stock_movements" DROP CONSTRAINT "stock_movements_order_id_orders_id_fk";
  
  ALTER TABLE "payload"."stock_movements" DROP CONSTRAINT "stock_movements_purchase_order_id_purchase_orders_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_recipe_lines_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stock_counts_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_batches_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_purchase_orders_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_suppliers_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_supplier_products_fk";
  
  DROP INDEX "payload"."inventory_items_supplier_idx";
  DROP INDEX "payload"."stock_movements_order_idx";
  DROP INDEX "payload"."stock_movements_purchase_order_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_recipe_lines_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_stock_counts_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_batches_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_purchase_orders_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_suppliers_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_supplier_products_id_idx";
  ALTER TABLE "payload"."inventory_items" DROP COLUMN "reorder_quantity";
  ALTER TABLE "payload"."inventory_items" DROP COLUMN "par_level";
  ALTER TABLE "payload"."inventory_items" DROP COLUMN "cost_cents_per1000";
  ALTER TABLE "payload"."inventory_items" DROP COLUMN "supplier_id";
  ALTER TABLE "payload"."inventory_items" DROP COLUMN "shelf_life_days";
  ALTER TABLE "payload"."stock_movements" DROP COLUMN "order_id";
  ALTER TABLE "payload"."stock_movements" DROP COLUMN "purchase_order_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "recipe_lines_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "stock_counts_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "batches_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "purchase_orders_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "suppliers_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "supplier_products_id";
  ALTER TABLE "payload"."business" DROP COLUMN "target_margin_percent";
  DROP TYPE "payload"."enum_purchase_orders_status";`)
}

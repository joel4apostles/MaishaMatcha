import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Payload lives in its own schema (see payload.config.ts). Supabase
  // databases already exist, so Payload never creates the schema itself.
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "payload"`)
  await db.execute(sql`
   CREATE TYPE "payload"."_locales" AS ENUM('es', 'en');
  CREATE TYPE "payload"."enum_users_role" AS ENUM('owner', 'manager', 'barista');
  CREATE TYPE "payload"."enum_menu_items_allergens" AS ENUM('gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs');
  CREATE TYPE "payload"."enum_modifier_groups_selection" AS ENUM('single', 'multiple');
  CREATE TYPE "payload"."enum_modifiers_allergens" AS ENUM('gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs');
  CREATE TYPE "payload"."enum_inventory_items_unit" AS ENUM('g', 'kg', 'ml', 'l', 'uds');
  CREATE TYPE "payload"."enum_stock_movements_reason" AS ENUM('purchase', 'sale', 'usage', 'waste', 'count', 'adjustment');
  CREATE TYPE "payload"."enum_orders_status" AS ENUM('nueva', 'preparando', 'lista', 'entregada', 'cancelada');
  CREATE TYPE "payload"."enum_members_tier" AS ENUM('founding', 'premium', 'waitlist');
  CREATE TYPE "payload"."enum_members_status" AS ENUM('active', 'paused', 'cancelled');
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "payload"."enum_users_role" DEFAULT 'barista' NOT NULL,
  	"active" boolean DEFAULT true,
  	"refund_limit_cents" numeric DEFAULT 0,
  	"pin_hash" varchar,
  	"pin_failed_count" numeric DEFAULT 0,
  	"pin_locked_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_wide_url" varchar,
  	"sizes_wide_width" numeric,
  	"sizes_wide_height" numeric,
  	"sizes_wide_mime_type" varchar,
  	"sizes_wide_filesize" numeric,
  	"sizes_wide_filename" varchar
  );
  
  CREATE TABLE "payload"."media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."menu_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."menu_categories_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."menu_items_allergens" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_menu_items_allergens",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."menu_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"category_id" integer NOT NULL,
  	"price_cents" numeric NOT NULL,
  	"online_price_cents" numeric,
  	"tax_rate_id" integer NOT NULL,
  	"available" boolean DEFAULT true,
  	"color" varchar NOT NULL,
  	"signature" boolean DEFAULT false,
  	"photo_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."menu_items_locales" (
  	"description" varchar NOT NULL,
  	"origin" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."menu_items_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"modifier_groups_id" integer
  );
  
  CREATE TABLE "payload"."tax_rates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"rate_basis_points" numeric NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."modifier_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"selection" "payload"."enum_modifier_groups_selection" DEFAULT 'single' NOT NULL,
  	"required" boolean DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."modifier_groups_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."modifiers_allergens" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_modifiers_allergens",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."modifiers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"group_id" integer NOT NULL,
  	"key" varchar NOT NULL,
  	"code" varchar,
  	"price_delta_cents" numeric DEFAULT 0,
  	"grams" numeric,
  	"ml" numeric,
  	"hue" varchar,
  	"available" boolean DEFAULT true,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."modifiers_locales" (
  	"label" varchar NOT NULL,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"members_only" boolean DEFAULT true,
  	"photo_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."events_locales" (
  	"title" varchar NOT NULL,
  	"when" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."story_chapters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"chapter_id" varchar NOT NULL,
  	"glyph" varchar,
  	"teaser" boolean DEFAULT false,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."story_chapters_locales" (
  	"era" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."inventory_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"unit" "payload"."enum_inventory_items_unit" DEFAULT 'g' NOT NULL,
  	"stock" numeric DEFAULT 0,
  	"low_stock_at" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."stock_movements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"delta" numeric NOT NULL,
  	"reason" "payload"."enum_stock_movements_reason" NOT NULL,
  	"note" varchar,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"summary" varchar NOT NULL,
  	"code" varchar,
  	"member_id" integer,
  	"customer_name" varchar,
  	"price_cents" numeric,
  	"status" "payload"."enum_orders_status" DEFAULT 'nueva' NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"tier" "payload"."enum_members_tier" DEFAULT 'founding' NOT NULL,
  	"status" "payload"."enum_members_status" DEFAULT 'active' NOT NULL,
  	"favorite_recipe_code" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."pos_devices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"token_hash" varchar NOT NULL,
  	"registered_by_id" integer,
  	"last_seen_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" varchar NOT NULL,
  	"actor_id" integer,
  	"device_id" integer,
  	"entity" varchar NOT NULL,
  	"entity_id" varchar,
  	"reason" varchar,
  	"before" jsonb,
  	"after" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"menu_categories_id" integer,
  	"menu_items_id" integer,
  	"tax_rates_id" integer,
  	"modifier_groups_id" integer,
  	"modifiers_id" integer,
  	"events_id" integer,
  	"story_chapters_id" integer,
  	"inventory_items_id" integer,
  	"stock_movements_id" integer,
  	"orders_id" integer,
  	"members_id" integer,
  	"pos_devices_id" integer,
  	"audit_log_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."menu_categories_locales" ADD CONSTRAINT "menu_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."menu_items_allergens" ADD CONSTRAINT "menu_items_allergens_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "payload"."menu_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."menu_items" ADD CONSTRAINT "menu_items_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("tax_rate_id") REFERENCES "payload"."tax_rates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."menu_items" ADD CONSTRAINT "menu_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."menu_items_locales" ADD CONSTRAINT "menu_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."menu_items_rels" ADD CONSTRAINT "menu_items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."menu_items_rels" ADD CONSTRAINT "menu_items_rels_modifier_groups_fk" FOREIGN KEY ("modifier_groups_id") REFERENCES "payload"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."modifier_groups_locales" ADD CONSTRAINT "modifier_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."modifiers_allergens" ADD CONSTRAINT "modifiers_allergens_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."modifiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."modifiers" ADD CONSTRAINT "modifiers_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "payload"."modifier_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."modifiers_locales" ADD CONSTRAINT "modifiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."modifiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."events" ADD CONSTRAINT "events_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."story_chapters_locales" ADD CONSTRAINT "story_chapters_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."story_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."stock_movements" ADD CONSTRAINT "stock_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "payload"."inventory_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "payload"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pos_devices" ADD CONSTRAINT "pos_devices_registered_by_id_users_id_fk" FOREIGN KEY ("registered_by_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."audit_log" ADD CONSTRAINT "audit_log_device_id_pos_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "payload"."pos_devices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menu_categories_fk" FOREIGN KEY ("menu_categories_id") REFERENCES "payload"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menu_items_fk" FOREIGN KEY ("menu_items_id") REFERENCES "payload"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tax_rates_fk" FOREIGN KEY ("tax_rates_id") REFERENCES "payload"."tax_rates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_modifier_groups_fk" FOREIGN KEY ("modifier_groups_id") REFERENCES "payload"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_modifiers_fk" FOREIGN KEY ("modifiers_id") REFERENCES "payload"."modifiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_story_chapters_fk" FOREIGN KEY ("story_chapters_id") REFERENCES "payload"."story_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inventory_items_fk" FOREIGN KEY ("inventory_items_id") REFERENCES "payload"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_movements_fk" FOREIGN KEY ("stock_movements_id") REFERENCES "payload"."stock_movements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "payload"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pos_devices_fk" FOREIGN KEY ("pos_devices_id") REFERENCES "payload"."pos_devices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "payload"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "payload"."media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "payload"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_wide_sizes_wide_filename_idx" ON "payload"."media" USING btree ("sizes_wide_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "payload"."media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "payload"."media_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "menu_categories_slug_idx" ON "payload"."menu_categories" USING btree ("slug");
  CREATE INDEX "menu_categories_updated_at_idx" ON "payload"."menu_categories" USING btree ("updated_at");
  CREATE INDEX "menu_categories_created_at_idx" ON "payload"."menu_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "menu_categories_locales_locale_parent_id_unique" ON "payload"."menu_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_categories_locales_parent_id_idx" ON "payload"."menu_categories_locales" USING btree ("_parent_id");
  CREATE INDEX "menu_items_allergens_order_idx" ON "payload"."menu_items_allergens" USING btree ("order");
  CREATE INDEX "menu_items_allergens_parent_idx" ON "payload"."menu_items_allergens" USING btree ("parent_id");
  CREATE INDEX "menu_items_category_idx" ON "payload"."menu_items" USING btree ("category_id");
  CREATE INDEX "menu_items_tax_rate_idx" ON "payload"."menu_items" USING btree ("tax_rate_id");
  CREATE INDEX "menu_items_photo_idx" ON "payload"."menu_items" USING btree ("photo_id");
  CREATE INDEX "menu_items_updated_at_idx" ON "payload"."menu_items" USING btree ("updated_at");
  CREATE INDEX "menu_items_created_at_idx" ON "payload"."menu_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "menu_items_locales_locale_parent_id_unique" ON "payload"."menu_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_items_locales_parent_id_idx" ON "payload"."menu_items_locales" USING btree ("_parent_id");
  CREATE INDEX "menu_items_rels_order_idx" ON "payload"."menu_items_rels" USING btree ("order");
  CREATE INDEX "menu_items_rels_parent_idx" ON "payload"."menu_items_rels" USING btree ("parent_id");
  CREATE INDEX "menu_items_rels_path_idx" ON "payload"."menu_items_rels" USING btree ("path");
  CREATE INDEX "menu_items_rels_modifier_groups_id_idx" ON "payload"."menu_items_rels" USING btree ("modifier_groups_id");
  CREATE INDEX "tax_rates_updated_at_idx" ON "payload"."tax_rates" USING btree ("updated_at");
  CREATE INDEX "tax_rates_created_at_idx" ON "payload"."tax_rates" USING btree ("created_at");
  CREATE UNIQUE INDEX "modifier_groups_slug_idx" ON "payload"."modifier_groups" USING btree ("slug");
  CREATE INDEX "modifier_groups_updated_at_idx" ON "payload"."modifier_groups" USING btree ("updated_at");
  CREATE INDEX "modifier_groups_created_at_idx" ON "payload"."modifier_groups" USING btree ("created_at");
  CREATE UNIQUE INDEX "modifier_groups_locales_locale_parent_id_unique" ON "payload"."modifier_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "modifier_groups_locales_parent_id_idx" ON "payload"."modifier_groups_locales" USING btree ("_parent_id");
  CREATE INDEX "modifiers_allergens_order_idx" ON "payload"."modifiers_allergens" USING btree ("order");
  CREATE INDEX "modifiers_allergens_parent_idx" ON "payload"."modifiers_allergens" USING btree ("parent_id");
  CREATE INDEX "modifiers_group_idx" ON "payload"."modifiers" USING btree ("group_id");
  CREATE UNIQUE INDEX "modifiers_key_idx" ON "payload"."modifiers" USING btree ("key");
  CREATE INDEX "modifiers_updated_at_idx" ON "payload"."modifiers" USING btree ("updated_at");
  CREATE INDEX "modifiers_created_at_idx" ON "payload"."modifiers" USING btree ("created_at");
  CREATE UNIQUE INDEX "modifiers_locales_locale_parent_id_unique" ON "payload"."modifiers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "modifiers_locales_parent_id_idx" ON "payload"."modifiers_locales" USING btree ("_parent_id");
  CREATE INDEX "events_photo_idx" ON "payload"."events" USING btree ("photo_id");
  CREATE INDEX "events_updated_at_idx" ON "payload"."events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "payload"."events" USING btree ("created_at");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "payload"."events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_locales_parent_id_idx" ON "payload"."events_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "story_chapters_chapter_id_idx" ON "payload"."story_chapters" USING btree ("chapter_id");
  CREATE INDEX "story_chapters_updated_at_idx" ON "payload"."story_chapters" USING btree ("updated_at");
  CREATE INDEX "story_chapters_created_at_idx" ON "payload"."story_chapters" USING btree ("created_at");
  CREATE UNIQUE INDEX "story_chapters_locales_locale_parent_id_unique" ON "payload"."story_chapters_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "story_chapters_locales_parent_id_idx" ON "payload"."story_chapters_locales" USING btree ("_parent_id");
  CREATE INDEX "inventory_items_updated_at_idx" ON "payload"."inventory_items" USING btree ("updated_at");
  CREATE INDEX "inventory_items_created_at_idx" ON "payload"."inventory_items" USING btree ("created_at");
  CREATE INDEX "stock_movements_item_idx" ON "payload"."stock_movements" USING btree ("item_id");
  CREATE INDEX "stock_movements_created_by_idx" ON "payload"."stock_movements" USING btree ("created_by_id");
  CREATE INDEX "stock_movements_updated_at_idx" ON "payload"."stock_movements" USING btree ("updated_at");
  CREATE INDEX "stock_movements_created_at_idx" ON "payload"."stock_movements" USING btree ("created_at");
  CREATE INDEX "orders_member_idx" ON "payload"."orders" USING btree ("member_id");
  CREATE INDEX "orders_updated_at_idx" ON "payload"."orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "payload"."orders" USING btree ("created_at");
  CREATE UNIQUE INDEX "members_email_idx" ON "payload"."members" USING btree ("email");
  CREATE INDEX "members_updated_at_idx" ON "payload"."members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "payload"."members" USING btree ("created_at");
  CREATE UNIQUE INDEX "pos_devices_token_hash_idx" ON "payload"."pos_devices" USING btree ("token_hash");
  CREATE INDEX "pos_devices_registered_by_idx" ON "payload"."pos_devices" USING btree ("registered_by_id");
  CREATE INDEX "pos_devices_updated_at_idx" ON "payload"."pos_devices" USING btree ("updated_at");
  CREATE INDEX "pos_devices_created_at_idx" ON "payload"."pos_devices" USING btree ("created_at");
  CREATE INDEX "audit_log_action_idx" ON "payload"."audit_log" USING btree ("action");
  CREATE INDEX "audit_log_actor_idx" ON "payload"."audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_device_idx" ON "payload"."audit_log" USING btree ("device_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "payload"."audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "payload"."audit_log" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_menu_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("menu_categories_id");
  CREATE INDEX "payload_locked_documents_rels_menu_items_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("menu_items_id");
  CREATE INDEX "payload_locked_documents_rels_tax_rates_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("tax_rates_id");
  CREATE INDEX "payload_locked_documents_rels_modifier_groups_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("modifier_groups_id");
  CREATE INDEX "payload_locked_documents_rels_modifiers_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("modifiers_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_story_chapters_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("story_chapters_id");
  CREATE INDEX "payload_locked_documents_rels_inventory_items_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("inventory_items_id");
  CREATE INDEX "payload_locked_documents_rels_stock_movements_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("stock_movements_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_pos_devices_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pos_devices_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."media_locales" CASCADE;
  DROP TABLE "payload"."menu_categories" CASCADE;
  DROP TABLE "payload"."menu_categories_locales" CASCADE;
  DROP TABLE "payload"."menu_items_allergens" CASCADE;
  DROP TABLE "payload"."menu_items" CASCADE;
  DROP TABLE "payload"."menu_items_locales" CASCADE;
  DROP TABLE "payload"."menu_items_rels" CASCADE;
  DROP TABLE "payload"."tax_rates" CASCADE;
  DROP TABLE "payload"."modifier_groups" CASCADE;
  DROP TABLE "payload"."modifier_groups_locales" CASCADE;
  DROP TABLE "payload"."modifiers_allergens" CASCADE;
  DROP TABLE "payload"."modifiers" CASCADE;
  DROP TABLE "payload"."modifiers_locales" CASCADE;
  DROP TABLE "payload"."events" CASCADE;
  DROP TABLE "payload"."events_locales" CASCADE;
  DROP TABLE "payload"."story_chapters" CASCADE;
  DROP TABLE "payload"."story_chapters_locales" CASCADE;
  DROP TABLE "payload"."inventory_items" CASCADE;
  DROP TABLE "payload"."stock_movements" CASCADE;
  DROP TABLE "payload"."orders" CASCADE;
  DROP TABLE "payload"."members" CASCADE;
  DROP TABLE "payload"."pos_devices" CASCADE;
  DROP TABLE "payload"."audit_log" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TYPE "payload"."_locales";
  DROP TYPE "payload"."enum_users_role";
  DROP TYPE "payload"."enum_menu_items_allergens";
  DROP TYPE "payload"."enum_modifier_groups_selection";
  DROP TYPE "payload"."enum_modifiers_allergens";
  DROP TYPE "payload"."enum_inventory_items_unit";
  DROP TYPE "payload"."enum_stock_movements_reason";
  DROP TYPE "payload"."enum_orders_status";
  DROP TYPE "payload"."enum_members_tier";
  DROP TYPE "payload"."enum_members_status";`)
}

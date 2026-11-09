import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Shared rate limiting (security audit 2026-11-09): counts per key and time
 * window in one table, written ONLY through one locked-down function.
 * - SECURITY DEFINER with a fixed search_path (pg_catalog, pg_temp) and
 *   schema-qualified names, so a caller cannot hijack it with its own objects.
 * - EXECUTE and table rights revoked from PUBLIC and from Supabase's API
 *   roles (anon, authenticated) when they exist; the app's own role (the
 *   owner, which Payload connects as) keeps them.
 * - Input bounds checked inside; old windows pruned now and then.
 * Not a Payload collection: nothing in the admin or the REST API reads it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payload"."rate_limits" (
      "key" text NOT NULL,
      "window_start" timestamptz NOT NULL,
      "hits" integer NOT NULL DEFAULT 0,
      PRIMARY KEY ("key", "window_start")
    );
    REVOKE ALL ON TABLE "payload"."rate_limits" FROM PUBLIC;

    CREATE OR REPLACE FUNCTION "payload"."rate_limit_hit"(p_key text, p_window_seconds integer, p_limit integer)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, pg_temp
    AS $fn$
    DECLARE
      w timestamptz;
      n integer;
    BEGIN
      IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 200
         OR p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 604800
         OR p_limit IS NULL OR p_limit < 1 THEN
        RETURN false;
      END IF;
      w := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
      INSERT INTO "payload"."rate_limits" AS r ("key", "window_start", "hits")
        VALUES (p_key, w, 1)
        ON CONFLICT ("key", "window_start") DO UPDATE SET "hits" = r."hits" + 1
        RETURNING r."hits" INTO n;
      IF random() < 0.01 THEN
        DELETE FROM "payload"."rate_limits" WHERE "window_start" < now() - interval '8 days';
      END IF;
      RETURN n <= p_limit;
    END
    $fn$;
    REVOKE ALL ON FUNCTION "payload"."rate_limit_hit"(text, integer, integer) FROM PUBLIC;

    DO $roles$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "payload"."rate_limits" FROM anon;
        REVOKE ALL ON FUNCTION "payload"."rate_limit_hit"(text, integer, integer) FROM anon;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "payload"."rate_limits" FROM authenticated;
        REVOKE ALL ON FUNCTION "payload"."rate_limit_hit"(text, integer, integer) FROM authenticated;
      END IF;
    END
    $roles$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP FUNCTION IF EXISTS "payload"."rate_limit_hit"(text, integer, integer);
    DROP TABLE IF EXISTS "payload"."rate_limits";
  `);
}

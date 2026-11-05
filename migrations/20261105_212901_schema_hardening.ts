import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Defence in depth for Supabase: even if someone later adds "payload" to the
 * Data API's exposed schemas, its public roles (anon, authenticated) hold no
 * privilege on it, so the anon key can never read staff, orders or audit
 * rows. Roles that don't exist (local Postgres, CI) are skipped.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE r text;
    BEGIN
      FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
          EXECUTE format('REVOKE ALL ON SCHEMA payload FROM %I', r);
          EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA payload FROM %I', r);
          EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA payload FROM %I', r);
          EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA payload REVOKE ALL ON TABLES FROM %I', r);
          EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA payload REVOKE ALL ON SEQUENCES FROM %I', r);
        END IF;
      END LOOP;
    END $$;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Nothing to restore: these roles were never meant to have access.
}

import pg from "pg";

/**
 * Vitest global setup: every test run gets its own empty Postgres database,
 * migrated by the tests through Payload, and dropped afterwards. The server
 * comes from TEST_DATABASE_URL (CI service) or the local docker-compose db.
 */
const BASE = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres";

export default async function setup() {
  const name = `maisha_test_${Date.now()}_${process.pid}`;
  const admin = new pg.Client({ connectionString: BASE });
  try {
    await admin.connect();
  } catch (err) {
    throw new Error(
      `Cannot reach Postgres for tests at ${new URL(BASE).host}. Run "npm run db:up" first. (${(err as Error).message})`,
    );
  }
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();

  const url = new URL(BASE);
  url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.toString();

  return async () => {
    const drop = new pg.Client({ connectionString: BASE });
    await drop.connect();
    await drop.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await drop.end();
  };
}

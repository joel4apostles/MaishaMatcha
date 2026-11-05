/**
 * Seed: imports the typed content files into Payload collections.
 * Run with `npm run seed` (SQLite locally, Postgres when DATABASE_URL is set).
 * Idempotent: see cms/seedData.ts.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { seedDatabase } from "./seedData";

try {
  const payload = await getPayload({ config });
  await seedDatabase(payload);
  console.log("seed complete");
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}

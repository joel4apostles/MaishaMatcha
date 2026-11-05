// Vercel build step: apply committed Payload migrations to Postgres before
// `next build`. Skips (and says so) when DATABASE_URL is not set, so preview
// builds without a database still build the public site.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn("[migrate] DATABASE_URL not set: skipping migrations. The admin will not persist.");
  process.exit(0);
}

const run = spawnSync("npx", ["payload", "migrate"], { stdio: "inherit", env: process.env });
process.exit(run.status ?? 1);

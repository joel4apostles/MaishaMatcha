// Generate a Postgres migration from the current Payload config, offline.
// Usage: npm run migrate:create -- <name>
// The diff is computed from the schema snapshots in /migrations, so no
// database connection is needed; the placeholder URL only selects the
// Postgres adapter.
import { spawnSync } from "node:child_process";

const name = process.argv[2] ?? "change";
const run = spawnSync("npx", ["payload", "migrate:create", name], {
  stdio: ["ignore", "inherit", "inherit"],
  env: { ...process.env, DATABASE_URL: "postgres://offline:offline@127.0.0.1:1/offline" },
});
process.exit(run.status ?? 1);

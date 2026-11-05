import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@payload-config": path.join(root, "payload.config.ts"),
      "@": root,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // One throwaway Postgres database per run (see tests/setup/postgres.ts).
    globalSetup: ["tests/setup/postgres.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});

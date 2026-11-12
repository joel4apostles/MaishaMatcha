import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

/**
 * Files share one database, and phase1 proves "the first account becomes
 * the owner", so it must run before any file creates staff. Vitest orders
 * files by cached timings (a new file can jump the queue), so fix it:
 * phase1 first, the rest by Vitest's own order.
 */
class Phase1First extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    const sorted = await super.sort(files);
    const first = (f: TestSpecification) => (f.moduleId.endsWith("phase1.test.ts") ? 0 : 1);
    return [...sorted].sort((a, b) => first(a) - first(b));
  }
}

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
    sequence: { sequencer: Phase1First },
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});

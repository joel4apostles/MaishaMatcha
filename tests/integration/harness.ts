import { execFileSync } from "node:child_process";
import type { Payload } from "payload";

/**
 * Shared boot for integration tests: Payload on the throwaway Postgres
 * database created by tests/setup/postgres.ts, migrated with the committed
 * migrations (exactly what production runs), then seeded.
 */
export type Staff = Record<string, unknown> & { id: number; collection: "users"; email: string };

let booted: Promise<Payload> | undefined;

export function boot(): Promise<Payload> {
  booted ??= (async () => {
    const { getPayload } = await import("payload");
    const { default: config } = await import("@payload-config");
    const { seedDatabase } = await import("@/cms/seedData");
    // Same command the vercel-build step runs in production.
    execFileSync("npx", ["payload", "migrate"], { env: process.env, stdio: "pipe" });
    const payload = await getPayload({ config });
    await seedDatabase(payload, () => {});
    return payload;
  })();
  return booted;
}

/** Find or create a staff account (files share one database). */
export async function staff(
  payload: Payload,
  email: string,
  role: "owner" | "manager" | "barista",
  name: string,
  pin?: string,
): Promise<Staff> {
  const found = await payload.find({
    collection: "users",
    overrideAccess: true,
    where: { email: { equals: email } },
    limit: 1,
  });
  const doc =
    found.docs[0] ??
    (await payload.create({
      collection: "users",
      overrideAccess: true,
      data: { email, password: "test-password-123", name, role, ...(pin ? { pin } : {}) } as never,
    }));
  return { ...(doc as unknown as Record<string, unknown>), id: doc.id, email, collection: "users" };
}

export const asUser = (u: Staff) => ({ user: u as never, overrideAccess: false });

import { sql } from "@payloadcms/db-postgres";
import type { Payload, PayloadRequest } from "payload";

/**
 * Raw SQL for the few writes that must be atomic (stock increments, PIN
 * attempt reservations). Works on both adapters: Postgres (production) and
 * SQLite (if ever used locally), and joins the request's transaction when
 * a req is given. Table objects come from Payload, so the schema prefix
 * ("payload".) is always right.
 */
type SQL = ReturnType<typeof sql>;

type Drizzle = {
  execute?: (q: SQL) => Promise<{ rows?: Record<string, unknown>[] } | Record<string, unknown>[]>;
  all?: (q: SQL) => Promise<Record<string, unknown>[]>;
};
type Adapter = {
  drizzle: Drizzle;
  sessions?: Record<string, { db: Drizzle }>;
  tables: Record<string, unknown>;
};

export { sql };

export function table(payload: Payload, name: string): unknown {
  const t = (payload.db as unknown as Adapter).tables[name];
  if (!t) throw new Error(`table ${name} not found`);
  return t;
}

/** Run a statement and return its rows (use RETURNING to read results). */
export async function query(
  payload: Payload,
  statement: SQL,
  req?: PayloadRequest,
): Promise<Record<string, unknown>[]> {
  const adapter = payload.db as unknown as Adapter;
  const txId = req?.transactionID ? await req.transactionID : undefined;
  if (txId && !adapter.sessions?.[String(txId)]) {
    // Never silently fall back to a connection outside the transaction.
    throw new Error("database transaction session not found");
  }
  const db = txId ? adapter.sessions![String(txId)].db : adapter.drizzle;
  if (typeof db.execute === "function") {
    const res = await db.execute(statement);
    return Array.isArray(res) ? res : (res.rows ?? []);
  }
  return db.all!(statement);
}

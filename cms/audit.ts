import type { Payload, PayloadRequest } from "payload";

export type AuditAction =
  | "price.change"
  | "invoice.full"
  | "availability.change"
  | "stock.adjustment"
  | "stock.waste"
  | "staff.role"
  | "staff.active"
  | "staff.pin"
  | "staff.refund-limit"
  | "pos.device.register"
  | "pos.login"
  | "pos.login.failed"
  | "pos.login.locked"
  | "pos.logout"
  | "shift.cash-difference"
  | "order.void"
  | "order.refund"
  | "pos.approval"
  | "pos.approval.failed"
  | "po.sent"
  | "po.received"
  | "box.shipped"
  | "box.collected"
  | "staff.invite";

type Entry = {
  action: AuditAction;
  entity: string;
  entityId?: string | number | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  actorId?: string | number | null;
  deviceId?: string | number | null;
};

/**
 * Append one audit record. Pass the hook's req to share its transaction, so
 * the audit entry commits or rolls back with the change it describes.
 * The collection itself refuses every write through the API.
 */
export async function writeAudit(
  ctx: PayloadRequest | { payload: Payload },
  entry: Entry,
): Promise<void> {
  // A hook's req carries headers; a bare { payload } from a server action does not.
  const req = "headers" in ctx ? (ctx as PayloadRequest) : undefined;
  const actor = entry.actorId ?? (req?.user?.collection === "users" ? req.user.id : null);
  await ctx.payload.create({
    collection: "audit-log",
    overrideAccess: true,
    ...(req ? { req } : {}),
    data: {
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId == null ? undefined : String(entry.entityId),
      reason: entry.reason ?? undefined,
      before: (entry.before ?? null) as never,
      after: (entry.after ?? null) as never,
      actor: (actor ?? undefined) as never,
      device: (entry.deviceId ?? undefined) as never,
    },
  });
}

/** Pick the fields that changed between two documents. */
export function changed<T extends Record<string, unknown>>(
  before: T | undefined,
  after: T,
  keys: (keyof T)[],
): { before: Partial<T>; after: Partial<T> } | null {
  if (!before) return null;
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  for (const k of keys) {
    const was = normalize(before[k]);
    const now = normalize(after[k]);
    if (JSON.stringify(was) !== JSON.stringify(now)) {
      b[k] = was as T[keyof T];
      a[k] = now as T[keyof T];
    }
  }
  return Object.keys(a).length ? { before: b, after: a } : null;
}

/** Relationships may arrive as an id or as a populated document. */
function normalize(value: unknown): unknown {
  if (value && typeof value === "object" && "id" in value) {
    return (value as { id: unknown }).id;
  }
  return value ?? null;
}

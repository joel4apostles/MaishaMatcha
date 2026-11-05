import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";

/**
 * Phase 1 guarantees, proven against a real (temporary) Payload + SQLite:
 * server-side role checks, append-only records, audit trail, atomic stock,
 * and PIN storage. Runs the same seed as production.
 */
const dir = mkdtempSync(path.join(tmpdir(), "maisha-test-"));
process.env.PAYLOAD_SQLITE_PATH = path.join(dir, "test.db");

let payload: Payload;
type Staff = Record<string, unknown> & { id: number; collection: "users" };
let owner: Staff, manager: Staff, barista: Staff;

const asUser = (u: Staff) => ({ user: u as never, overrideAccess: false });

async function makeUser(email: string, role: string, name: string): Promise<Staff> {
  const doc = await payload.create({
    collection: "users",
    overrideAccess: true,
    data: { email, password: "test-password-123", name, role: role as never },
  });
  return { ...(doc as unknown as Record<string, unknown>), id: doc.id as number, collection: "users" };
}

beforeAll(async () => {
  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const { seedDatabase } = await import("@/cms/seedData");
  payload = await getPayload({ config });
  await seedDatabase(payload, () => {});
  // The first account always becomes the owner, whatever role was asked.
  owner = await makeUser("owner@test.local", "barista", "Owner");
  manager = await makeUser("manager@test.local", "manager", "Manager");
  barista = await makeUser("barista@test.local", "barista", "Barista");
});

afterAll(async () => {
  await payload?.destroy?.();
  rmSync(dir, { recursive: true, force: true });
});

describe("seed", () => {
  it("imports menu, IVA rates and modifier groups from the content files", async () => {
    const items = await payload.find({ collection: "menu-items", limit: 100 });
    expect(items.totalDocs).toBeGreaterThan(0);
    expect(items.docs.every((i) => i.taxRate)).toBe(true);
    const groups = await payload.find({ collection: "modifier-groups", limit: 10 });
    expect(groups.docs.map((g) => g.slug).sort()).toEqual(["base", "fruit", "intensity", "temp"]);
    const tonic = await payload.find({ collection: "modifiers", where: { key: { equals: "base.tonica" } } });
    expect(tonic.docs[0]?.priceDeltaCents).toBe(100);
  });

  it("is safe to run twice", async () => {
    const { seedDatabase } = await import("@/cms/seedData");
    const before = await payload.count({ collection: "modifiers" });
    await seedDatabase(payload, () => {});
    expect((await payload.count({ collection: "modifiers" })).totalDocs).toBe(before.totalDocs);
  });
});

describe("staff accounts", () => {
  it("makes the first account the owner", () => {
    expect(owner.role).toBe("owner");
  });

  it("lets a barista read only their own account", async () => {
    const res = await payload.find({ collection: "users", ...asUser(barista) });
    expect(res.docs.map((d) => d.id)).toEqual([barista.id]);
  });

  it("ignores role changes from anyone but the owner", async () => {
    await payload.update({
      collection: "users",
      id: manager.id,
      data: { role: "owner" },
      ...asUser(manager),
    });
    const after = await payload.findByID({ collection: "users", id: manager.id });
    expect(after.role).toBe("manager");
  });

  it("blocks owners from demoting or deactivating themselves", async () => {
    await expect(
      payload.update({ collection: "users", id: owner.id, data: { active: false }, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("never deletes staff accounts", async () => {
    await expect(
      payload.delete({ collection: "users", id: barista.id, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("stores the PIN only as a hash nobody can read back", async () => {
    await payload.update({ collection: "users", id: barista.id, data: { pin: "4819" } as never, ...asUser(owner) });
    const viaApi = (await payload.findByID({ collection: "users", id: barista.id, ...asUser(owner) })) as Record<string, unknown>;
    expect(viaApi.pin).toBeUndefined();
    expect(viaApi.pinHash).toBeUndefined();
    const raw = (await payload.findByID({ collection: "users", id: barista.id, overrideAccess: true, showHiddenFields: true })) as Record<string, unknown>;
    expect(String(raw.pinHash)).toMatch(/^scrypt\$/);
    const audit = await payload.find({ collection: "audit-log", where: { action: { equals: "staff.pin" } } });
    expect(audit.totalDocs).toBe(1);
  });

  it("rejects trivial PINs", async () => {
    await expect(
      payload.update({ collection: "users", id: barista.id, data: { pin: "1234" } as never, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("refuses to log in a deactivated account", async () => {
    const temp = await makeUser("temp@test.local", "barista", "Temp");
    await payload.update({ collection: "users", id: temp.id, data: { active: false }, ...asUser(owner) });
    await expect(
      payload.login({ collection: "users", data: { email: "temp@test.local", password: "test-password-123" } }),
    ).rejects.toThrow();
  });
});

describe("menu", () => {
  it("lets a manager edit the carta but not a barista", async () => {
    const item = (await payload.find({ collection: "menu-items", limit: 1 })).docs[0];
    await expect(
      payload.update({ collection: "menu-items", id: item.id, data: { available: false }, ...asUser(barista) }),
    ).rejects.toThrow();
    await payload.update({ collection: "menu-items", id: item.id, data: { priceCents: item.priceCents + 50 }, ...asUser(manager) });
    const audit = await payload.find({
      collection: "audit-log",
      where: { and: [{ action: { equals: "price.change" } }, { entityId: { equals: String(item.id) } }] },
      depth: 0,
    });
    expect(audit.totalDocs).toBe(1);
    expect(audit.docs[0].actor).toBe(manager.id);
    expect(audit.docs[0].after).toEqual({ priceCents: item.priceCents + 50 });
  });

  it("only lets the owner delete a menu item", async () => {
    const item = (await payload.find({ collection: "menu-items", limit: 1 })).docs[0];
    await expect(
      payload.delete({ collection: "menu-items", id: item.id, ...asUser(manager) }),
    ).rejects.toThrow();
  });
});

describe("financial and audit records", () => {
  it("never deletes an order, not even as owner", async () => {
    const order = await payload.create({
      collection: "orders",
      data: { summary: "Matcha", priceCents: 450, status: "nueva" },
      ...asUser(barista),
    });
    await expect(payload.delete({ collection: "orders", id: order.id, ...asUser(owner) })).rejects.toThrow();
  });

  it("refuses audit log writes through the API", async () => {
    await expect(
      payload.create({ collection: "audit-log", data: { action: "x", entity: "y" }, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("hides the audit log and customer data from baristas", async () => {
    await expect(payload.find({ collection: "audit-log", ...asUser(barista) })).rejects.toThrow();
    await expect(payload.find({ collection: "members", ...asUser(barista) })).rejects.toThrow();
  });
});

describe("stock ledger", () => {
  it("applies concurrent movements without losing any", async () => {
    const item = await payload.create({
      collection: "inventory-items",
      data: { name: "Ceremonial Uji", unit: "g" },
      ...asUser(manager),
    });
    await payload.create({
      collection: "stock-movements",
      data: { item: item.id, delta: 1000, reason: "purchase" },
      ...asUser(manager),
    });
    await Promise.all(
      Array.from({ length: 20 }, () =>
        payload.create({
          collection: "stock-movements",
          data: { item: item.id, delta: -2, reason: "sale" },
          ...asUser(barista),
        }),
      ),
    );
    const after = await payload.findByID({ collection: "inventory-items", id: item.id });
    expect(after.stock).toBe(960);
  });

  it("stamps who recorded each movement and ignores direct stock edits", async () => {
    const item = await payload.create({
      collection: "inventory-items",
      data: { name: "Leche de coco", unit: "ml", stock: 99999 } as never,
      ...asUser(manager),
    });
    expect(item.stock ?? 0).toBe(0);
    const mv = await payload.create({
      collection: "stock-movements",
      data: { item: item.id, delta: 500, reason: "purchase" },
      ...asUser(barista),
      depth: 0,
    });
    expect(mv.createdBy).toBe(barista.id);
    await expect(
      payload.update({ collection: "stock-movements", id: mv.id, data: { delta: 5 }, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("requires a reason for waste and logs it", async () => {
    const item = (await payload.find({ collection: "inventory-items", limit: 1 })).docs[0];
    await expect(
      payload.create({ collection: "stock-movements", data: { item: item.id, delta: -5, reason: "waste" }, ...asUser(barista) }),
    ).rejects.toThrow();
    await payload.create({
      collection: "stock-movements",
      data: { item: item.id, delta: -5, reason: "waste", note: "Se cayó al suelo" },
      ...asUser(barista),
    });
    const audit = await payload.find({ collection: "audit-log", where: { action: { equals: "stock.waste" } } });
    expect(audit.docs[0]?.reason).toBe("Se cayó al suelo");
  });
});

import { beforeAll, describe, expect, it } from "vitest";
import type { Payload } from "payload";
import { asUser, boot, passwordOnly, staff, type Staff } from "./harness";

/**
 * Phase 1 guarantees, proven against Payload on a real (throwaway)
 * Postgres: server-side role checks, append-only records, audit trail,
 * atomic stock, PIN storage, and the production seed.
 */
let payload: Payload;
let owner: Staff, manager: Staff, barista: Staff;

beforeAll(async () => {
  payload = await boot();
  // The first account always becomes the owner, whatever role was asked.
  owner = await staff(payload, "owner@test.local", "barista", "Owner");
  manager = await staff(payload, "manager@test.local", "manager", "Manager");
  barista = await staff(payload, "barista@test.local", "barista", "Barista");
});

describe("seed", () => {
  it("imports the real carta with IVA and its option groups", async () => {
    const uji = (await payload.find({ collection: "menu-items", where: { name: { equals: "Uji" } }, depth: 1 })).docs[0];
    expect(uji.priceCents).toBe(880);
    expect(uji.taxRate).toBeTruthy();
    const groupSlugs = (uji.modifierGroups ?? []).map((g) => (typeof g === "object" ? g.slug : g));
    expect(groupSlugs).toEqual(["preparacion-matcha", "leche", "extras"]);
    const latte = await payload.find({ collection: "modifiers", where: { key: { equals: "prep.latte" } } });
    expect(latte.docs[0]?.priceDeltaCents).toBe(140);
    const oat = await payload.find({ collection: "modifiers", where: { key: { equals: "leche.avena" } } });
    expect(oat.docs[0]?.allergens).toEqual(["gluten"]);
    // The carta only (other test files may add shop products to this database).
    const items = await payload.count({ collection: "menu-items", where: { "category.shop": { not_equals: true } } });
    expect(items.totalDocs).toBe(9);
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
    const viaApi = (await payload.findByID({ collection: "users", id: barista.id, ...asUser(owner) })) as unknown as Record<string, unknown>;
    expect(viaApi.pin).toBeUndefined();
    expect(viaApi.pinHash).toBeUndefined();
    const raw = (await payload.findByID({ collection: "users", id: barista.id, overrideAccess: true, showHiddenFields: true })) as unknown as Record<string, unknown>;
    expect(String(raw.pinHash)).toMatch(/^scrypt\$/);
    const audit = await payload.find({ collection: "audit-log", where: { action: { equals: "staff.pin" } } });
    expect(audit.totalDocs).toBe(1);
  });

  it("rejects trivial PINs", async () => {
    await expect(
      payload.update({ collection: "users", id: barista.id, data: { pin: "1234" } as never, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("refuses password login for baristas (PIN on the counter only)", async () => {
    await expect(
      payload.login({ collection: "users", data: { email: "barista@test.local", password: "test-password-123" } }),
    ).rejects.toThrow();
    const ok = await payload.login({ collection: "users", data: { email: "manager@test.local", password: "test-password-123" } });
    expect(ok.token).toBeTruthy();
  });

  it("refuses to log in a deactivated account", async () => {
    const temp = await staff(payload, "temp@test.local", "manager", "Temp");
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
  it("never creates, edits or deletes an order through the API, not even as owner", async () => {
    await expect(
      payload.create({
        collection: "orders",
        data: { totalCents: 1, idempotencyKey: "api-attempt" } as never,
        ...asUser(owner),
      }),
    ).rejects.toThrow();
    const order = await payload.create({
      collection: "orders",
      overrideAccess: true,
      data: { label: "9999", totalCents: 450, idempotencyKey: "test-order-1" } as never,
    });
    await expect(
      payload.update({ collection: "orders", id: order.id, data: { totalCents: 1 }, ...asUser(owner) }),
    ).rejects.toThrow();
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

describe("configuration access", () => {
  it("lets only the owner change IVA rates, with whole basis points", async () => {
    const rate = (await payload.find({ collection: "tax-rates", limit: 1 })).docs[0];
    await expect(
      payload.update({ collection: "tax-rates", id: rate.id, data: { rateBasisPoints: 500 }, ...asUser(manager) }),
    ).rejects.toThrow();
    await expect(
      payload.update({ collection: "tax-rates", id: rate.id, data: { rateBasisPoints: 10.5 }, ...asUser(owner) }),
    ).rejects.toThrow();
    await expect(
      payload.update({ collection: "tax-rates", id: rate.id, data: { rateBasisPoints: 50000 }, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("rejects fractional cents on prices", async () => {
    const item = (await payload.find({ collection: "menu-items", limit: 1 })).docs[0];
    await expect(
      payload.update({ collection: "menu-items", id: item.id, data: { priceCents: 450.5 }, ...asUser(owner) }),
    ).rejects.toThrow();
  });

  it("hides counter devices from everyone but the owner, and never returns token hashes", async () => {
    await payload.create({
      collection: "pos-devices",
      overrideAccess: true,
      data: { name: "Prueba", tokenHash: "x".repeat(64), active: true },
    });
    await expect(payload.find({ collection: "pos-devices", ...asUser(manager) })).rejects.toThrow();
    const asOwner = await payload.find({ collection: "pos-devices", ...asUser(owner) });
    expect(asOwner.totalDocs).toBeGreaterThan(0);
    expect(asOwner.docs.every((d) => (d as unknown as Record<string, unknown>).tokenHash === undefined)).toBe(true);
  });
});

describe("transactions", () => {
  it("rolls back the stock change together with a failed movement", async () => {
    const { createLocalReq, initTransaction, killTransaction } = await import("payload");
    const item = await payload.create({
      collection: "inventory-items",
      data: { name: "Hojicha", unit: "g" },
      ...asUser(manager),
    });
    const req = await createLocalReq({ user: manager as never }, payload);
    await initTransaction(req);
    await payload.create({
      collection: "stock-movements",
      data: { item: item.id, delta: 250, reason: "purchase" },
      req,
      overrideAccess: false,
      user: manager as never,
    });
    await killTransaction(req);
    const after = await payload.findByID({ collection: "inventory-items", id: item.id });
    expect(after.stock ?? 0).toBe(0);
    const moves = await payload.find({ collection: "stock-movements", where: { item: { equals: item.id } } });
    expect(moves.totalDocs).toBe(0);
  });
});

describe("authenticator code (two-step sign-in)", () => {
  it("gives a password-only session nothing until the code is entered", async () => {
    const half = passwordOnly(owner);
    await expect(payload.find({ collection: "orders", ...asUser(half) })).rejects.toThrow();
    await expect(payload.find({ collection: "members", ...asUser(half) })).rejects.toThrow();
    await expect(
      payload.create({ collection: "menu-items", data: { name: "X" } as never, ...asUser(half) }),
    ).rejects.toThrow();
  });

  it("holds an account that never set the code up to its own record", async () => {
    const fresh = passwordOnly(manager, false);
    const own = await payload.find({ collection: "users", ...asUser(fresh) });
    expect(own.docs.map((d) => d.id)).toEqual([manager.id]);
    await expect(payload.find({ collection: "orders", ...asUser(fresh) })).rejects.toThrow();
  });

  it("keeps the carta, events and photos public, and their editing behind the code", async () => {
    const anon = { overrideAccess: false } as const;
    expect((await payload.find({ collection: "menu-items", ...anon })).totalDocs).toBeGreaterThan(0);
    await expect(payload.find({ collection: "events", ...anon })).resolves.toBeTruthy();
    await expect(payload.find({ collection: "media", ...anon })).resolves.toBeTruthy();
    await expect(
      payload.create({ collection: "events", data: { title: "X" } as never, ...anon }),
    ).rejects.toThrow();
  });

  it("never returns the authenticator secret", async () => {
    const me = await payload.findByID({ collection: "users", id: owner.id, ...asUser(owner) });
    expect((me as unknown as Record<string, unknown>).totpSecret).toBeUndefined();
  });
});

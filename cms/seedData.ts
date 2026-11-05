import type { Payload } from "payload";
import { carta, cartaGroups } from "../content/carta";
import { events } from "../content/events";
import { story } from "../content/story";
import { ROLES } from "../lib/auth/roles";

type Log = (msg: string) => void;

/**
 * Imports the typed content files into Payload: IVA rates, the real carta
 * (content/carta.ts) with its option groups, events and story. Idempotent
 * and resumable; safe to re-run against a live database.
 */
export async function seedDatabase(payload: Payload, log: Log = console.log) {
  const has = async (collection: Parameters<Payload["count"]>[0]["collection"]) =>
    (await payload.count({ collection, overrideAccess: true })).totalDocs > 0;

  // --- legacy roles (admin/staff, before Phase 1) -> owner/barista
  const legacy = await payload.find({
    collection: "users",
    overrideAccess: true,
    limit: 100,
    where: { role: { not_in: [...ROLES] } },
  });
  for (const u of legacy.docs) {
    const role = (u.role as string) === "admin" ? "owner" : "barista";
    await payload.update({ collection: "users", id: u.id, overrideAccess: true, data: { role } });
    log(`migrated ${u.email} to ${role}`);
  }

  // --- IVA rates (confirm with the gestor before selling)
  if (!(await has("tax-rates"))) {
    await payload.create({
      collection: "tax-rates",
      overrideAccess: true,
      data: { name: "IVA 10 % (hostelería)", rateBasisPoints: 1000, active: true },
    });
    await payload.create({
      collection: "tax-rates",
      overrideAccess: true,
      data: { name: "IVA 21 % (general)", rateBasisPoints: 2100, active: true },
    });
    log("seeded tax rates");
  }
  const defaultRate = (
    await payload.find({
      collection: "tax-rates",
      overrideAccess: true,
      where: { rateBasisPoints: { equals: 1000 } },
      limit: 1,
    })
  ).docs[0];
  if (!defaultRate) {
    throw new Error("Seed needs an IVA rate of 10 % (1000 basis points). Add it under Tipos de IVA.");
  }

  // --- the carta: option groups, then categories and items. Upserts by
  // natural key: a crashed run can be re-run, and existing rows (which the
  // owner may have edited) are never overwritten.
  const groupIds = new Map<string, number>();
  for (const [gi, g] of cartaGroups.entries()) {
    const found = await payload.find({
      collection: "modifier-groups",
      overrideAccess: true,
      where: { slug: { equals: g.slug } },
      limit: 1,
    });
    let group = found.docs[0];
    if (!group) {
      group = await payload.create({
        collection: "modifier-groups",
        locale: "es",
        overrideAccess: true,
        data: { slug: g.slug, label: g.label.es, selection: g.selection, required: g.required, order: gi },
      });
      await payload.update({
        collection: "modifier-groups",
        id: group.id,
        locale: "en",
        overrideAccess: true,
        data: { label: g.label.en },
      });
      log(`seeded option group ${g.slug}`);
    }
    groupIds.set(g.slug, group.id);

    for (const [i, o] of g.options.entries()) {
      const exists = await payload.count({
        collection: "modifiers",
        overrideAccess: true,
        where: { key: { equals: o.key } },
      });
      if (exists.totalDocs > 0) continue;
      const doc = await payload.create({
        collection: "modifiers",
        locale: "es",
        overrideAccess: true,
        data: {
          group: group.id,
          key: o.key,
          label: o.label.es,
          note: o.note?.es,
          priceDeltaCents: o.priceDeltaCents,
          allergens: o.allergens ?? [],
          available: true,
          order: i,
        },
      });
      await payload.update({
        collection: "modifiers",
        id: doc.id,
        locale: "en",
        overrideAccess: true,
        data: { label: o.label.en, note: o.note?.en },
      });
    }
  }

  for (const [ci, cat] of carta.entries()) {
    const found = await payload.find({
      collection: "menu-categories",
      overrideAccess: true,
      where: { slug: { equals: cat.slug } },
      limit: 1,
    });
    let category = found.docs[0];
    if (!category) {
      category = await payload.create({
        collection: "menu-categories",
        locale: "es",
        overrideAccess: true,
        data: { slug: cat.slug, title: cat.title.es, order: ci },
      });
      await payload.update({
        collection: "menu-categories",
        id: category.id,
        locale: "en",
        overrideAccess: true,
        data: { title: cat.title.en },
      });
      log(`seeded category ${cat.slug}`);
    }

    for (const [j, item] of cat.items.entries()) {
      const exists = await payload.count({
        collection: "menu-items",
        overrideAccess: true,
        where: { and: [{ name: { equals: item.name } }, { category: { equals: category.id } }] },
      });
      if (exists.totalDocs > 0) continue;
      const groups = item.groups.map((slug) => {
        const id = groupIds.get(slug);
        if (id === undefined) throw new Error(`carta item ${item.name} names unknown group ${slug}`);
        return id;
      });
      const doc = await payload.create({
        collection: "menu-items",
        locale: "es",
        overrideAccess: true,
        data: {
          name: item.name,
          category: category.id,
          priceCents: item.priceCents,
          taxRate: defaultRate.id,
          available: true,
          modifierGroups: groups,
          color: item.color,
          description: item.description.es,
          signature: Boolean(item.signature),
          order: j,
        },
      });
      await payload.update({
        collection: "menu-items",
        id: doc.id,
        locale: "en",
        overrideAccess: true,
        data: { description: item.description.en },
      });
    }
  }

  // --- inventory links the carta makes certain: one ingredient per tea,
  // and a recipe line that deducts the barista's MEASURED grams on each
  // sale. No fixed quantities or costs are invented: the owner sets
  // recipe grams (menu item) and costs (ingredient) in the admin.
  const teaIngredients: Record<string, string> = {
    Uji: "Matcha Uji",
    Nishio: "Matcha Nishio",
    Kagoshima: "Matcha Kagoshima",
    Hojicha: "Hojicha en polvo",
    "Black Tea": "Wakōcha en polvo",
  };
  for (const [itemName, ingredientName] of Object.entries(teaIngredients)) {
    const item = (await payload.find({ collection: "menu-items", overrideAccess: true, limit: 1, where: { name: { equals: itemName } } })).docs[0];
    if (!item) continue;
    let ingredient = (await payload.find({ collection: "inventory-items", overrideAccess: true, limit: 1, where: { name: { equals: ingredientName } } })).docs[0];
    if (!ingredient) {
      ingredient = await payload.create({ collection: "inventory-items", overrideAccess: true, data: { name: ingredientName, unit: "g" } });
      log(`seeded ingredient ${ingredientName}`);
    }
    const linked = await payload.count({
      collection: "recipe-lines",
      overrideAccess: true,
      where: { and: [{ "target.value": { equals: item.id } }, { ingredient: { equals: ingredient.id } }] },
    });
    if (linked.totalDocs === 0) {
      await payload.create({
        collection: "recipe-lines",
        overrideAccess: true,
        data: { target: { relationTo: "menu-items", value: item.id }, ingredient: ingredient.id, quantity: 0, usesMeasuredGrams: true },
      });
    }
  }

  // --- events
  if (!(await has("events"))) {
    for (const [i, ev] of events.entries()) {
      const doc = await payload.create({
        collection: "events",
        locale: "es",
        overrideAccess: true,
        data: {
          title: ev.title.es,
          when: ev.when.es,
          description: ev.description.es,
          membersOnly: ev.membersOnly,
          order: i,
        },
      });
      await payload.update({
        collection: "events",
        id: doc.id,
        locale: "en",
        overrideAccess: true,
        data: { title: ev.title.en, when: ev.when.en, description: ev.description.en },
      });
    }
    log("seeded events");
  }

  // --- story chapters
  if (!(await has("story-chapters"))) {
    const teaser = new Set(["tang", "eisai", "rikyu", "murcia"]);
    for (const [i, ch] of story.entries()) {
      const doc = await payload.create({
        collection: "story-chapters",
        locale: "es",
        overrideAccess: true,
        data: {
          chapterId: ch.id,
          glyph: ch.glyph ?? undefined,
          era: ch.era.es,
          title: ch.title.es,
          body: ch.body.es,
          teaser: teaser.has(ch.id),
          order: i,
        },
      });
      await payload.update({
        collection: "story-chapters",
        id: doc.id,
        locale: "en",
        overrideAccess: true,
        data: { era: ch.era.en, title: ch.title.en, body: ch.body.en },
      });
    }
    log("seeded story");
  }
}

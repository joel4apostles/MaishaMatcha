import type { Payload } from "payload";
import { menu } from "../content/menu";
import { intensities, bases, fruits, temps } from "../content/recipe";
import { events } from "../content/events";
import { story } from "../content/story";
import { ROLES } from "../lib/auth/roles";

const euroToCents = (price: string): number =>
  Math.round(parseFloat(price.replace(",", ".").replace("€", "").trim()) * 100);

type Log = (msg: string) => void;

/**
 * Imports the typed content files into Payload. Idempotent: each block only
 * runs when its collection is empty, and the migrations at the top only
 * touch rows that need them. Safe to re-run against a live database.
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

  // --- menu categories + items
  if (!(await has("menu-categories"))) {
    for (const [i, cat] of menu.entries()) {
      const created = await payload.create({
        collection: "menu-categories",
        locale: "es",
        overrideAccess: true,
        data: { slug: cat.id, title: cat.title.es, order: i },
      });
      await payload.update({
        collection: "menu-categories",
        id: created.id,
        locale: "en",
        overrideAccess: true,
        data: { title: cat.title.en },
      });
      for (const [j, item] of cat.items.entries()) {
        const doc = await payload.create({
          collection: "menu-items",
          locale: "es",
          overrideAccess: true,
          data: {
            name: item.name,
            category: created.id,
            priceCents: euroToCents(item.price),
            taxRate: defaultRate.id,
            available: true,
            color: item.color,
            description: item.description.es,
            origin: item.origin?.es,
            signature: Boolean(item.signature),
            order: j,
          },
        });
        await payload.update({
          collection: "menu-items",
          id: doc.id,
          locale: "en",
          overrideAccess: true,
          data: { description: item.description.en, origin: item.origin?.en },
        });
      }
    }
    log("seeded menu");
  }

  // Items created before IVA existed get the default rate.
  const untaxed = await payload.find({
    collection: "menu-items",
    overrideAccess: true,
    limit: 500,
    where: { taxRate: { exists: false } },
  });
  for (const item of untaxed.docs) {
    await payload.update({
      collection: "menu-items",
      id: item.id,
      overrideAccess: true,
      data: { taxRate: defaultRate.id },
    });
  }
  if (untaxed.docs.length) log(`set IVA on ${untaxed.docs.length} menu items`);

  // --- modifier groups + options, from the recipe builder's data
  if (!(await has("modifier-groups"))) {
    const groups = [
      { slug: "intensity", label: { es: "Intensidad", en: "Intensity" }, required: true, options: intensities },
      { slug: "base", label: { es: "Base", en: "Base" }, required: true, options: bases },
      { slug: "fruit", label: { es: "Fruta", en: "Fruit" }, required: false, options: fruits },
      { slug: "temp", label: { es: "Temperatura", en: "Temperature" }, required: true, options: temps },
    ];
    for (const [gi, g] of groups.entries()) {
      const group = await payload.create({
        collection: "modifier-groups",
        locale: "es",
        overrideAccess: true,
        data: { slug: g.slug, label: g.label.es, selection: "single", required: g.required, order: gi },
      });
      await payload.update({
        collection: "modifier-groups",
        id: group.id,
        locale: "en",
        overrideAccess: true,
        data: { label: g.label.en },
      });
      for (const [i, opt] of g.options.entries()) {
        const o = opt as Record<string, unknown> & {
          id: string;
          code: string;
          label: { es: string; en: string };
        };
        const note = o.note as { es: string; en: string } | undefined;
        const doc = await payload.create({
          collection: "modifiers",
          locale: "es",
          overrideAccess: true,
          data: {
            group: group.id,
            key: `${g.slug}.${o.id}`,
            code: o.code,
            label: o.label.es,
            note: note?.es,
            priceDeltaCents: (o.surchargeCents as number | undefined) ?? 0,
            grams: o.grams as number | undefined,
            ml: o.ml as number | undefined,
            hue: o.hue as string | undefined,
            available: true,
            order: i,
          },
        });
        await payload.update({
          collection: "modifiers",
          id: doc.id,
          locale: "en",
          overrideAccess: true,
          data: { label: o.label.en, note: note?.en },
        });
      }
    }
    log("seeded modifier groups");
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

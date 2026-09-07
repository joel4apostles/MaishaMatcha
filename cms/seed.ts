/**
 * One-time seed: imports the typed content files into Payload collections.
 * Run with `npm run seed` (uses SQLite locally, DATABASE_URL if set).
 * Idempotent-ish: skips collections that already contain documents.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { menu } from "../content/menu";
import { intensities, bases, fruits, temps } from "../content/recipe";
import { events } from "../content/events";
import { story } from "../content/story";

const euroToCents = (price: string): number =>
  Math.round(parseFloat(price.replace(",", ".").replace("€", "").trim()) * 100);

async function run() {
  const payload = await getPayload({ config });

  const has = async (collection: Parameters<typeof payload.count>[0]["collection"]) =>
    (await payload.count({ collection })).totalDocs > 0;

  // --- menu categories + items
  if (!(await has("menu-categories"))) {
    for (const [i, cat] of menu.entries()) {
      const created = await payload.create({
        collection: "menu-categories",
        locale: "es",
        data: { slug: cat.id, title: cat.title.es, order: i },
      });
      await payload.update({
        collection: "menu-categories",
        id: created.id,
        locale: "en",
        data: { title: cat.title.en },
      });
      for (const [j, item] of cat.items.entries()) {
        const doc = await payload.create({
          collection: "menu-items",
          locale: "es",
          data: {
            name: item.name,
            category: created.id,
            priceCents: euroToCents(item.price),
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
          data: { description: item.description.en, origin: item.origin?.en },
        });
      }
    }
    console.log("seeded menu");
  }

  // --- recipe options
  if (!(await has("recipe-options"))) {
    const groups = [
      ["intensity", intensities],
      ["base", bases],
      ["fruit", fruits],
      ["temp", temps],
    ] as const;
    for (const [group, options] of groups) {
      for (const [i, opt] of options.entries()) {
        const anyOpt = opt as Record<string, unknown>;
        const doc = await payload.create({
          collection: "recipe-options",
          locale: "es",
          data: {
            group,
            optionId: opt.id,
            label: opt.label.es,
            note: (anyOpt.note as { es: string } | undefined)?.es,
            code: opt.code,
            surchargeCents: (anyOpt.surchargeCents as number) ?? 0,
            grams: anyOpt.grams as number | undefined,
            ml: anyOpt.ml as number | undefined,
            hue: anyOpt.hue as string | undefined,
            order: i,
          },
        });
        await payload.update({
          collection: "recipe-options",
          id: doc.id,
          locale: "en",
          data: {
            label: opt.label.en,
            note: (anyOpt.note as { en: string } | undefined)?.en,
          },
        });
      }
    }
    console.log("seeded recipe options");
  }

  // --- events
  if (!(await has("events"))) {
    for (const [i, ev] of events.entries()) {
      const doc = await payload.create({
        collection: "events",
        locale: "es",
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
        data: { title: ev.title.en, when: ev.when.en, description: ev.description.en },
      });
    }
    console.log("seeded events");
  }

  // --- story chapters
  if (!(await has("story-chapters"))) {
    const teaser = new Set(["tang", "eisai", "rikyu", "murcia"]);
    for (const [i, ch] of story.entries()) {
      const doc = await payload.create({
        collection: "story-chapters",
        locale: "es",
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
        data: { era: ch.era.en, title: ch.title.en, body: ch.body.en },
      });
    }
    console.log("seeded story");
  }

  console.log("seed complete");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

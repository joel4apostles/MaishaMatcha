import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

export const StoryChapters: CollectionConfig = {
  slug: "story-chapters",
  labels: { singular: { es: "Capítulo", en: "Chapter" }, plural: { es: "Historia", en: "Story" } },
  admin: { useAsTitle: "title", defaultColumns: ["title", "era", "order"] },
  access: editorialAccess,
  defaultSort: "order",
  fields: [
    { name: "chapterId", type: "text", required: true, unique: true },
    {
      name: "glyph",
      type: "text",
      admin: {
        description:
          "Calligraphic emblem for the era rail (茶, 禅…). Empty = brand icon.",
      },
    },
    { name: "era", type: "text", required: true, localized: true },
    { name: "title", type: "text", required: true, localized: true },
    { name: "body", type: "textarea", required: true, localized: true },
    {
      name: "teaser",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Shown in the home story teaser (pick 4)" },
    },
    { name: "order", type: "number", required: true, defaultValue: 0 },
  ],
};

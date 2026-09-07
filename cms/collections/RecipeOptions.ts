import type { CollectionConfig } from "payload";

/**
 * The build-your-drink options. `group` decides which step the option
 * belongs to; the numeric fields drive price, ratio and the glass visual.
 */
export const RecipeOptions: CollectionConfig = {
  slug: "recipe-options",
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "group", "surchargeCents", "code"],
  },
  access: { read: () => true },
  defaultSort: "order",
  fields: [
    {
      name: "group",
      type: "select",
      required: true,
      options: [
        { label: "Intensidad (matcha)", value: "intensity" },
        { label: "Base", value: "base" },
        { label: "Fruta", value: "fruit" },
        { label: "Temperatura", value: "temp" },
      ],
    },
    { name: "optionId", type: "text", required: true, unique: true },
    { name: "label", type: "text", required: true, localized: true },
    { name: "note", type: "text", localized: true },
    {
      name: "code",
      type: "text",
      required: true,
      admin: { description: "2-3 letters for the counter code (TON, YUZ…)" },
    },
    {
      name: "surchargeCents",
      type: "number",
      defaultValue: 0,
      admin: { description: "Added to the base price, in cents" },
    },
    {
      name: "grams",
      type: "number",
      admin: { description: "Intensity only: matcha grams (drives the ratio)" },
    },
    {
      name: "ml",
      type: "number",
      admin: { description: "Base only: liquid volume (drives ratio + glass)" },
    },
    {
      name: "hue",
      type: "text",
      admin: { description: "Base/fruit: hex tint for the blended drink color" },
    },
    { name: "order", type: "number", defaultValue: 0 },
  ],
};

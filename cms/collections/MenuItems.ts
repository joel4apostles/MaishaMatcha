import type { CollectionConfig } from "payload";

export const MenuItems: CollectionConfig = {
  slug: "menu-items",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "priceCents", "signature"],
  },
  access: { read: () => true },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "category",
      type: "relationship",
      relationTo: "menu-categories",
      required: true,
    },
    {
      name: "priceCents",
      type: "number",
      required: true,
      admin: { description: "Cents: 450 = 4,50 €" },
    },
    {
      name: "color",
      type: "text",
      required: true,
      admin: { description: "The drink's hue, hex (#6B7F5E) — swatch + hover" },
    },
    { name: "description", type: "textarea", required: true, localized: true },
    { name: "origin", type: "text", localized: true },
    {
      name: "signature",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Appears on the home preview (max 4)" },
    },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "order", type: "number", defaultValue: 0 },
  ],
};

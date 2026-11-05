import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

export const MenuCategories: CollectionConfig = {
  slug: "menu-categories",
  labels: { singular: "Categoría", plural: "Categorías" },
  admin: { useAsTitle: "title", defaultColumns: ["title", "order"] },
  access: editorialAccess,
  defaultSort: "order",
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL anchor, e.g. burbujas" },
    },
    { name: "title", type: "text", required: true, localized: true },
    { name: "order", type: "number", required: true, defaultValue: 0 },
    {
      name: "shop",
      type: "checkbox",
      defaultValue: false,
      label: "Tienda",
      admin: { description: "Productos para llevar (latas de matcha, utensilios...). Salen en la tienda de la web, no en la carta." },
    },
  ],
};

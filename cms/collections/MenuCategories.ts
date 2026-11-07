import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

export const MenuCategories: CollectionConfig = {
  slug: "menu-categories",
  labels: { singular: { es: "Categoría", en: "Category" }, plural: { es: "Categorías", en: "Categories" } },
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
      label: { es: "Tienda", en: "Shop" },
      admin: { description: { es: "Productos para llevar (latas de matcha, utensilios...). Salen en la tienda de la web, no en la carta.", en: "Take-home products (matcha tins, tools...). Shown in the website shop, not on the menu." } },
    },
  ],
};

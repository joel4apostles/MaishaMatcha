import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

/**
 * A choice on a drink (intensity, base, fruit, temperature, and later milk,
 * size, sweetness). The same groups drive the POS and the web builder, so a
 * recipe built online is the exact order the counter makes.
 */
export const ModifierGroups: CollectionConfig = {
  slug: "modifier-groups",
  labels: { singular: { es: "Grupo de opciones", en: "Option group" }, plural: { es: "Grupos de opciones", en: "Option groups" } },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "slug", "selection", "required", "order"],
  },
  defaultSort: "order",
  access: editorialAccess,
  fields: [
    { name: "slug", type: "text", required: true, unique: true, label: { es: "Clave", en: "Key" } },
    { name: "label", type: "text", required: true, localized: true, label: { es: "Nombre", en: "Name" } },
    {
      name: "selection",
      type: "select",
      required: true,
      defaultValue: "single",
      label: { es: "Selección", en: "Choice" },
      options: [
        { label: { es: "Una opción", en: "One option" }, value: "single" },
        { label: { es: "Varias opciones", en: "Several options" }, value: "multiple" },
      ],
    },
    {
      name: "required",
      type: "checkbox",
      defaultValue: false,
      label: { es: "Obligatorio", en: "Required" },
      admin: { description: { es: "El barista debe elegir antes de cobrar.", en: "The barista must choose before charging." } },
    },
    { name: "order", type: "number", defaultValue: 0, label: { es: "Orden", en: "Order" } },
  ],
};

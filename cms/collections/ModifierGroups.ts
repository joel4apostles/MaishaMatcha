import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

/**
 * A choice on a drink (intensity, base, fruit, temperature, and later milk,
 * size, sweetness). The same groups drive the POS and the web builder, so a
 * recipe built online is the exact order the counter makes.
 */
export const ModifierGroups: CollectionConfig = {
  slug: "modifier-groups",
  labels: { singular: "Grupo de opciones", plural: "Grupos de opciones" },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "slug", "selection", "required", "order"],
  },
  defaultSort: "order",
  access: editorialAccess,
  fields: [
    { name: "slug", type: "text", required: true, unique: true, label: "Clave" },
    { name: "label", type: "text", required: true, localized: true, label: "Nombre" },
    {
      name: "selection",
      type: "select",
      required: true,
      defaultValue: "single",
      label: "Selección",
      options: [
        { label: "Una opción", value: "single" },
        { label: "Varias opciones", value: "multiple" },
      ],
    },
    {
      name: "required",
      type: "checkbox",
      defaultValue: false,
      label: "Obligatorio",
      admin: { description: "El barista debe elegir antes de cobrar." },
    },
    { name: "order", type: "number", defaultValue: 0, label: "Orden" },
  ],
};

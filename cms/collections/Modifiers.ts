import type { CollectionConfig } from "payload";
import { ALLERGENS } from "@/lib/allergens";
import { editorialAccess } from "../access";
import { integerCents } from "../validators";
import { changed, writeAudit } from "../audit";

/**
 * One option inside a modifier group (Tónica, Mango, Intenso). Price deltas
 * are IVA-included cents. grams/ml describe the recipe today; Phase 3 turns
 * them into recipe lines that deduct stock.
 */
export const Modifiers: CollectionConfig = {
  slug: "modifiers",
  labels: { singular: { es: "Opción", en: "Option" }, plural: { es: "Opciones", en: "Options" } },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "group", "priceDeltaCents", "available", "order"],
  },
  defaultSort: "order",
  access: editorialAccess,
  fields: [
    {
      name: "group",
      type: "relationship",
      relationTo: "modifier-groups",
      required: true,
      label: { es: "Grupo", en: "Group" },
    },
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      label: { es: "Clave", en: "Key" },
      admin: { description: { es: "Estable y única, p. ej. base.tonica. La usan las recetas compartidas.", en: "Stable and unique, e.g. base.tonica. Shared recipes use it." } },
    },
    {
      name: "code",
      type: "text",
      label: { es: "Código", en: "Code" },
      admin: { description: { es: "Tres letras para el código de receta (TON).", en: "Three letters for the recipe code (TON)." } },
    },
    { name: "label", type: "text", required: true, localized: true, label: { es: "Nombre", en: "Name" } },
    { name: "note", type: "text", localized: true, label: { es: "Nota", en: "Note" } },
    {
      name: "priceDeltaCents",
      type: "number",
      defaultValue: 0,
      validate: integerCents,
      label: { es: "Suplemento (céntimos, IVA incl.)", en: "Supplement (cents, VAT incl.)" },
    },
    { name: "grams", type: "number", label: { es: "Gramos de matcha", en: "Grams of matcha" } },
    { name: "ml", type: "number", label: { es: "Mililitros", en: "Millilitres" } },
    { name: "hue", type: "text", label: { es: "Color (hex)", en: "Colour (hex)" } },
    {
      name: "allergens",
      type: "select",
      hasMany: true,
      label: { es: "Alérgenos", en: "Allergens" },
      options: ALLERGENS.map((a) => ({ label: a.label.es, value: a.id })),
    },
    { name: "available", type: "checkbox", defaultValue: true, label: { es: "Disponible", en: "Available" } },
    { name: "order", type: "number", defaultValue: 0, label: { es: "Orden", en: "Order" } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== "update") return doc;
        const price = changed(previousDoc, doc, ["priceDeltaCents"]);
        if (price) await writeAudit(req, { action: "price.change", entity: "modifiers", entityId: doc.id, ...price });
        const avail = changed(previousDoc, doc, ["available"]);
        if (avail) await writeAudit(req, { action: "availability.change", entity: "modifiers", entityId: doc.id, ...avail });
        return doc;
      },
    ],
  },
};

import type { CollectionConfig } from "payload";
import { ALLERGENS } from "@/lib/allergens";
import { editorialAccess } from "../access";
import { changed, writeAudit } from "../audit";

/**
 * One option inside a modifier group (Tónica, Mango, Intenso). Price deltas
 * are IVA-included cents. grams/ml describe the recipe today; Phase 3 turns
 * them into recipe lines that deduct stock.
 */
export const Modifiers: CollectionConfig = {
  slug: "modifiers",
  labels: { singular: "Opción", plural: "Opciones" },
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
      label: "Grupo",
    },
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      label: "Clave",
      admin: { description: "Estable y única, p. ej. base.tonica. La usan las recetas compartidas." },
    },
    {
      name: "code",
      type: "text",
      label: "Código",
      admin: { description: "Tres letras para el código de receta (TON)." },
    },
    { name: "label", type: "text", required: true, localized: true, label: "Nombre" },
    { name: "note", type: "text", localized: true, label: "Nota" },
    {
      name: "priceDeltaCents",
      type: "number",
      defaultValue: 0,
      label: "Suplemento (céntimos, IVA incl.)",
    },
    { name: "grams", type: "number", label: "Gramos de matcha" },
    { name: "ml", type: "number", label: "Mililitros" },
    { name: "hue", type: "text", label: "Color (hex)" },
    {
      name: "allergens",
      type: "select",
      hasMany: true,
      label: "Alérgenos",
      options: ALLERGENS.map((a) => ({ label: a.label.es, value: a.id })),
    },
    { name: "available", type: "checkbox", defaultValue: true, label: "Disponible" },
    { name: "order", type: "number", defaultValue: 0, label: "Orden" },
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

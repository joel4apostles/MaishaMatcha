import type { CollectionConfig } from "payload";
import { ALLERGENS } from "@/lib/allergens";
import { editorialAccess } from "../access";
import { changed, writeAudit } from "../audit";

/**
 * The carta. Prices are IVA-included cents per channel: the counter price
 * always, an online price only when it differs. Allergens follow EU
 * 1169/2011 and show on the website and the POS. Every price or
 * availability change is written to the audit log.
 */
export const MenuItems: CollectionConfig = {
  slug: "menu-items",
  labels: { singular: "Bebida", plural: "Carta" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "priceCents", "available", "signature"],
  },
  defaultSort: "order",
  access: editorialAccess,
  fields: [
    { name: "name", type: "text", required: true, label: "Nombre" },
    {
      name: "category",
      type: "relationship",
      relationTo: "menu-categories",
      required: true,
      label: "Categoría",
    },
    {
      type: "row",
      fields: [
        {
          name: "priceCents",
          type: "number",
          required: true,
          min: 0,
          label: "Precio en barra (céntimos)",
          admin: { description: "IVA incluido. 450 = 4,50 €." },
        },
        {
          name: "onlinePriceCents",
          type: "number",
          min: 0,
          label: "Precio online (céntimos)",
          admin: { description: "Vacío = mismo precio que en barra." },
        },
      ],
    },
    {
      name: "taxRate",
      type: "relationship",
      relationTo: "tax-rates",
      required: true,
      label: "IVA",
    },
    {
      name: "available",
      type: "checkbox",
      defaultValue: true,
      label: "Disponible",
      admin: { description: "Desmarca para \"agotado\" en la web y en la barra." },
    },
    {
      name: "allergens",
      type: "select",
      hasMany: true,
      label: "Alérgenos",
      options: ALLERGENS.map((a) => ({ label: a.label.es, value: a.id })),
      admin: {
        description:
          "Los alérgenos de las opciones elegidas se suman en el ticket y en la web.",
      },
    },
    {
      name: "modifierGroups",
      type: "relationship",
      relationTo: "modifier-groups",
      hasMany: true,
      label: "Opciones que admite",
    },
    {
      name: "color",
      type: "text",
      required: true,
      label: "Color",
      admin: { description: "El tono de la bebida, hex (#6B7F5E)." },
    },
    { name: "description", type: "textarea", required: true, localized: true, label: "Descripción" },
    { name: "origin", type: "text", localized: true, label: "Origen" },
    {
      name: "signature",
      type: "checkbox",
      defaultValue: false,
      label: "Firma",
      admin: { description: "Aparece en la portada (máximo 4)." },
    },
    { name: "photo", type: "upload", relationTo: "media", label: "Foto" },
    { name: "order", type: "number", defaultValue: 0, label: "Orden" },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== "update") return doc;
        const price = changed(previousDoc, doc, ["priceCents", "onlinePriceCents", "taxRate"]);
        if (price) await writeAudit(req, { action: "price.change", entity: "menu-items", entityId: doc.id, ...price });
        const avail = changed(previousDoc, doc, ["available"]);
        if (avail) await writeAudit(req, { action: "availability.change", entity: "menu-items", entityId: doc.id, ...avail });
        return doc;
      },
    ],
  },
};

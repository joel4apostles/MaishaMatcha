import type { CollectionConfig } from "payload";
import { ALLERGENS } from "@/lib/allergens";
import { editorialAccess } from "../access";
import { integerCents } from "../validators";
import { changed, writeAudit } from "../audit";

/**
 * The carta. Prices are IVA-included cents per channel: the counter price
 * always, an online price only when it differs. Allergens follow EU
 * 1169/2011 and show on the website and the POS. Every price or
 * availability change is written to the audit log.
 */
export const MenuItems: CollectionConfig = {
  slug: "menu-items",
  labels: { singular: { es: "Bebida", en: "Drink" }, plural: { es: "Carta", en: "Menu" } },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "category", "priceCents", "available", "signature"],
  },
  defaultSort: "order",
  access: editorialAccess,
  fields: [
    { name: "name", type: "text", required: true, label: { es: "Nombre", en: "Name" } },
    {
      name: "category",
      type: "relationship",
      relationTo: "menu-categories",
      required: true,
      label: { es: "Categoría", en: "Category" },
    },
    {
      type: "row",
      fields: [
        {
          name: "priceCents",
          type: "number",
          required: true,
          min: 0,
          validate: integerCents,
          label: { es: "Precio en barra (céntimos)", en: "Bar price (cents)" },
          admin: { description: { es: "IVA incluido. 450 = 4,50 €.", en: "VAT included. 450 = 4.50 €." } },
        },
        {
          name: "onlinePriceCents",
          type: "number",
          min: 0,
          validate: integerCents,
          label: { es: "Precio online (céntimos)", en: "Online price (cents)" },
          admin: { description: { es: "Vacío = mismo precio que en barra.", en: "Empty = same price as at the bar." } },
        },
      ],
    },
    {
      name: "taxRate",
      type: "relationship",
      relationTo: "tax-rates",
      required: true,
      label: { es: "IVA", en: "VAT" },
    },
    {
      name: "defaultGrams",
      type: "number",
      min: 0,
      max: 20,
      label: { es: "Gramos de matcha (receta)", en: "Grams of matcha (recipe)" },
      admin: {
        description: { es: "La barra lo propone y el barista lo ajusta a lo que pesa de verdad. Vacío = no se pesa.", en: "The bar suggests it and the barista adjusts it to what is really weighed. Empty = not weighed." },
      },
    },
    {
      name: "stock",
      type: "number",
      min: 0,
      label: { es: "Unidades (tienda)", en: "Units (shop)" },
      admin: {
        description: { es: "Solo para productos de la tienda. Vacío = sin límite. Baja sola con cada venta y vuelve si se anula. A 0 sale como agotado.", en: "Shop products only. Empty = no limit. Goes down with each sale and back if voided. At 0 it shows as sold out." },
      },
    },
    {
      name: "available",
      type: "checkbox",
      defaultValue: true,
      label: { es: "Disponible", en: "Available" },
      admin: { description: { es: "Desmarca para \"agotado\" en la web y en la barra.", en: "Untick for \"sold out\" on the website and at the bar." } },
    },
    {
      name: "allergens",
      type: "select",
      hasMany: true,
      label: { es: "Alérgenos", en: "Allergens" },
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
      label: { es: "Opciones que admite", en: "Options it accepts" },
    },
    {
      name: "color",
      type: "text",
      required: true,
      label: { es: "Color", en: "Colour" },
      admin: { description: { es: "El tono de la bebida, hex (#6B7F5E).", en: "The drink's tone, hex (#6B7F5E)." } },
    },
    { name: "description", type: "textarea", required: true, localized: true, label: { es: "Descripción", en: "Description" } },
    { name: "origin", type: "text", localized: true, label: { es: "Origen", en: "Origin" } },
    {
      name: "signature",
      type: "checkbox",
      defaultValue: false,
      label: { es: "Firma", en: "Signature" },
      admin: { description: { es: "Aparece en la portada (máximo 4).", en: "Shown on the home page (up to 4)." } },
    },
    { name: "photo", type: "upload", relationTo: "media", label: { es: "Foto", en: "Photo" } },
    {
      name: "ritual",
      type: "textarea",
      localized: true,
      label: { es: "Cómo se usa (tienda)", en: "How to use it (shop)" },
      admin: { description: { es: "Solo productos de la tienda. Opcional: si está vacío, la página del producto no muestra esta parte.", en: "Shop products only. Optional: if empty, the product page leaves this part out." } },
    },
    {
      name: "pairsWith",
      type: "relationship",
      relationTo: "menu-items",
      hasMany: true,
      maxRows: 3,
      label: { es: "Combina con (tienda)", en: "Pairs with (shop)" },
      admin: { description: { es: "Hasta tres productos de la tienda que se sugieren en la página de este.", en: "Up to three shop products suggested on this product's page." } },
    },
    { name: "order", type: "number", defaultValue: 0, label: { es: "Orden", en: "Order" } },
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

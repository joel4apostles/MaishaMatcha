import type { CollectionConfig } from "payload";
import { anyone, nobody, owner } from "../access";
import { integer } from "../validators";

/**
 * IVA rates as configuration, never hardcoded. Stored in basis points
 * (1000 = 10 %). Rates are archived (inactive), not deleted, because past
 * tickets reference them.
 */
export const TaxRates: CollectionConfig = {
  slug: "tax-rates",
  labels: { singular: { es: "Tipo de IVA", en: "VAT rate" }, plural: { es: "Tipos de IVA", en: "VAT rates" } },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "rateBasisPoints", "active"],
    description: { es: "Confirma los tipos con tu gestor antes de vender.", en: "Check the rates with your accountant before selling." },
  },
  access: { read: anyone, create: owner, update: owner, delete: nobody },
  fields: [
    { name: "name", type: "text", required: true, label: { es: "Nombre", en: "Name" } },
    {
      name: "rateBasisPoints",
      type: "number",
      required: true,
      min: 0,
      max: 10000,
      label: { es: "Tipo (puntos básicos)", en: "Rate (basis points)" },
      admin: { description: "1000 = 10 %, 2100 = 21 %." },
      validate: integer,
    },
    { name: "active", type: "checkbox", defaultValue: true, label: { es: "Activo", en: "Active" } },
  ],
};

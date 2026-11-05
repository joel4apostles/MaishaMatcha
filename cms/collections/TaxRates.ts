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
  labels: { singular: "Tipo de IVA", plural: "Tipos de IVA" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "rateBasisPoints", "active"],
    description: "Confirma los tipos con tu gestor antes de vender.",
  },
  access: { read: anyone, create: owner, update: owner, delete: nobody },
  fields: [
    { name: "name", type: "text", required: true, label: "Nombre" },
    {
      name: "rateBasisPoints",
      type: "number",
      required: true,
      min: 0,
      max: 10000,
      label: "Tipo (puntos básicos)",
      admin: { description: "1000 = 10 %, 2100 = 21 %." },
      validate: integer,
    },
    { name: "active", type: "checkbox", defaultValue: true, label: "Activo" },
  ],
};

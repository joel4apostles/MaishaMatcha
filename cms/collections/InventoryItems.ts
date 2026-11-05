import type { CollectionConfig } from "payload";
import { anyStaff, nobody, ownerOrManager } from "../access";
import { integerCents } from "../validators";

export const InventoryItems: CollectionConfig = {
  slug: "inventory-items",
  labels: { singular: "Ingrediente", plural: "Inventario" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "stock", "unit", "lowStockAt", "supplier"],
    description: "El stock solo cambia con movimientos: el registro es la verdad.",
  },
  // Never deleted: movements and recipes point at these rows.
  access: { read: anyStaff, create: ownerOrManager, update: ownerOrManager, delete: nobody },
  fields: [
    { name: "name", type: "text", required: true, label: "Nombre" },
    {
      name: "unit",
      type: "select",
      required: true,
      defaultValue: "g",
      label: "Unidad",
      options: ["g", "kg", "ml", "l", "uds"].map((u) => ({ label: u, value: u })),
    },
    {
      name: "stock",
      type: "number",
      defaultValue: 0,
      label: "Stock",
      // Written only by the ledger hook (atomic SQL), never by any user.
      access: { create: () => false, update: () => false },
      admin: {
        readOnly: true,
        description: "Lo mantienen los movimientos; no se edita a mano.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "lowStockAt",
          type: "number",
          min: 0,
          label: "Punto de pedido",
          admin: { description: "Al bajar de aquí se prepara un pedido al proveedor." },
        },
        {
          name: "reorderQuantity",
          type: "number",
          min: 0,
          label: "Cantidad a pedir",
          admin: { description: "Vacío = hasta el nivel ideal." },
        },
        {
          name: "parLevel",
          type: "number",
          min: 0,
          label: "Nivel ideal",
        },
      ],
    },
    {
      name: "costCentsPer1000",
      type: "number",
      min: 0,
      label: "Coste por 1000 unidades (céntimos)",
      admin: { description: "Matcha a 300 €/kg con unidad g: 30000. Leche a 1,20 €/l con unidad ml: 120." },
      validate: integerCents,
    },
    { name: "supplier", type: "relationship", relationTo: "suppliers", label: "Proveedor habitual" },
    {
      name: "shelfLifeDays",
      type: "number",
      min: 0,
      label: "Vida útil (días)",
      admin: { description: "Para perecederos: los lotes avisan antes de caducar." },
    },
  ],
};

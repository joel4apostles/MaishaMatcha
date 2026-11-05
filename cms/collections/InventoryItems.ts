import type { CollectionConfig } from "payload";
import { anyStaff, nobody, ownerOrManager } from "../access";

export const InventoryItems: CollectionConfig = {
  slug: "inventory-items",
  labels: { singular: "Ingrediente", plural: "Inventario" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "stock", "unit", "lowStockAt"],
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
      name: "lowStockAt",
      type: "number",
      label: "Aviso de stock bajo",
      admin: { description: "Avisar cuando el stock baje de esta cantidad." },
    },
  ],
};

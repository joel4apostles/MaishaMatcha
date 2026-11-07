import type { CollectionConfig } from "payload";
import { anyStaff, nobody, ownerOrManager } from "../access";
import { integerCents } from "../validators";

export const InventoryItems: CollectionConfig = {
  slug: "inventory-items",
  labels: { singular: { es: "Ingrediente", en: "Ingredient" }, plural: { es: "Inventario", en: "Inventory" } },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "stock", "unit", "lowStockAt", "supplier"],
    description: { es: "El stock solo cambia con movimientos: el registro es la verdad.", en: "Stock only changes through movements: the ledger is the truth." },
  },
  // Never deleted: movements and recipes point at these rows.
  access: { read: anyStaff, create: ownerOrManager, update: ownerOrManager, delete: nobody },
  fields: [
    { name: "name", type: "text", required: true, label: { es: "Nombre", en: "Name" } },
    {
      name: "unit",
      type: "select",
      required: true,
      defaultValue: "g",
      label: { es: "Unidad", en: "Unit" },
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
        description: { es: "Lo mantienen los movimientos; no se edita a mano.", en: "Kept by the movements; not edited by hand." },
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "lowStockAt",
          type: "number",
          min: 0,
          label: { es: "Punto de pedido", en: "Reorder point" },
          admin: { description: { es: "Al bajar de aquí se prepara un pedido al proveedor.", en: "Below this level a supplier order is prepared." } },
        },
        {
          name: "reorderQuantity",
          type: "number",
          min: 0,
          label: { es: "Cantidad a pedir", en: "Quantity to order" },
          admin: { description: { es: "Vacío = hasta el nivel ideal.", en: "Empty = up to the ideal level." } },
        },
        {
          name: "parLevel",
          type: "number",
          min: 0,
          label: { es: "Nivel ideal", en: "Ideal level" },
        },
      ],
    },
    {
      name: "costCentsPer1000",
      type: "number",
      min: 0,
      label: { es: "Coste por 1000 unidades (céntimos)", en: "Cost per 1000 units (cents)" },
      admin: { description: { es: "Matcha a 300 €/kg con unidad g: 30000. Leche a 1,20 €/l con unidad ml: 120.", en: "Matcha at 300 €/kg with unit g: 30000. Milk at 1.20 €/l with unit ml: 120." } },
      validate: integerCents,
    },
    { name: "supplier", type: "relationship", relationTo: "suppliers", label: { es: "Proveedor habitual", en: "Usual supplier" } },
    {
      name: "shelfLifeDays",
      type: "number",
      min: 0,
      label: { es: "Vida útil (días)", en: "Shelf life (days)" },
      admin: { description: { es: "Para perecederos: los lotes avisan antes de caducar.", en: "For perishables: batches warn before they expire." } },
    },
  ],
};

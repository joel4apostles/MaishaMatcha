import type { CollectionConfig } from "payload";

/**
 * Append-only stock ledger (PRD phase 6 pattern). Each movement adjusts its
 * item's cached stock via hook; movements are never edited or deleted.
 */
export const StockMovements: CollectionConfig = {
  slug: "stock-movements",
  admin: {
    defaultColumns: ["item", "delta", "reason", "createdAt"],
    description: "Append-only: corrections are new movements, not edits.",
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: "item",
      type: "relationship",
      relationTo: "inventory-items",
      required: true,
    },
    {
      name: "delta",
      type: "number",
      required: true,
      admin: { description: "+ receives stock, − consumes it" },
    },
    {
      name: "reason",
      type: "select",
      required: true,
      options: [
        { label: "Compra", value: "purchase" },
        { label: "Consumo", value: "usage" },
        { label: "Merma", value: "waste" },
        { label: "Ajuste", value: "adjustment" },
      ],
    },
    { name: "note", type: "text" },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== "create") return;
        const itemId = typeof doc.item === "object" ? doc.item.id : doc.item;
        const item = await req.payload.findByID({
          collection: "inventory-items",
          id: itemId,
        });
        await req.payload.update({
          collection: "inventory-items",
          id: itemId,
          data: { stock: (item.stock ?? 0) + doc.delta },
        });
      },
    ],
  },
};

import type { CollectionConfig } from "payload";

export const InventoryItems: CollectionConfig = {
  slug: "inventory-items",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "stock", "unit", "lowStockAt"],
    description:
      "Stock changes ONLY via Stock Movements — the ledger is the truth.",
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "unit",
      type: "select",
      required: true,
      defaultValue: "g",
      options: ["g", "kg", "ml", "l", "uds"].map((u) => ({ label: u, value: u })),
    },
    {
      name: "stock",
      type: "number",
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: "Maintained by movements, never edited directly.",
      },
    },
    {
      name: "lowStockAt",
      type: "number",
      admin: { description: "Warn when stock falls below this" },
    },
  ],
};

import type { CollectionConfig } from "payload";

/**
 * The counter's order board. Custom drinks arrive as recipe codes
 * (CLA·TON·YUZ·F) from the builder card; carta drinks by name.
 */
export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    useAsTitle: "summary",
    defaultColumns: ["summary", "code", "status", "priceCents", "createdAt"],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  defaultSort: "-createdAt",
  fields: [
    {
      name: "summary",
      type: "text",
      required: true,
      admin: { description: "Drink name or composed summary" },
    },
    {
      name: "code",
      type: "text",
      admin: { description: "Recipe code from the builder card, if custom" },
    },
    {
      name: "member",
      type: "relationship",
      relationTo: "members",
      admin: { description: "The subscriber who ordered, if a member" },
    },
    { name: "customerName", type: "text" },
    { name: "priceCents", type: "number" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "nueva",
      options: [
        { label: "Nueva", value: "nueva" },
        { label: "Preparando", value: "preparando" },
        { label: "Lista", value: "lista" },
        { label: "Entregada", value: "entregada" },
        { label: "Cancelada", value: "cancelada" },
      ],
    },
    { name: "note", type: "textarea" },
  ],
};

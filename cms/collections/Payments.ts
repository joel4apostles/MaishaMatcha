import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/** Money received for an order. Append-only; reversals are Refunds. */
export const Payments: CollectionConfig = {
  slug: "payments",
  labels: { singular: "Cobro", plural: "Cobros" },
  admin: {
    defaultColumns: ["order", "method", "amountCents", "staff", "createdAt"],
    description: "Solo se añaden. Una devolución es un registro aparte.",
  },
  defaultSort: "-createdAt",
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "order", type: "relationship", relationTo: "orders", required: true, label: "Pedido" },
    { name: "shift", type: "relationship", relationTo: "shifts", label: "Turno" },
    {
      name: "method",
      type: "select",
      required: true,
      label: "Método",
      options: [
        { label: "Efectivo", value: "cash" },
        { label: "Tarjeta (datáfono)", value: "card_terminal" },
        { label: "Tarjeta (Stripe)", value: "card_stripe" },
        { label: "Online", value: "online" },
      ],
    },
    { name: "amountCents", type: "number", required: true, label: "Importe (céntimos)" },
    { name: "tenderedCents", type: "number", label: "Entregado (céntimos)" },
    { name: "changeCents", type: "number", label: "Cambio (céntimos)" },
    { name: "providerRef", type: "text", label: "Referencia del proveedor" },
    { name: "staff", type: "relationship", relationTo: "users", label: "Cobrado por" },
  ],
};

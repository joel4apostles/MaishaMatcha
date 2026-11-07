import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/** Money received for an order. Append-only; reversals are Refunds. */
export const Payments: CollectionConfig = {
  slug: "payments",
  labels: { singular: { es: "Cobro", en: "Payment" }, plural: { es: "Cobros", en: "Payments" } },
  admin: {
    defaultColumns: ["order", "method", "amountCents", "staff", "createdAt"],
    description: { es: "Solo se añaden. Una devolución es un registro aparte.", en: "Append only. A refund is a separate record." },
  },
  defaultSort: "-createdAt",
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "order", type: "relationship", relationTo: "orders", required: true, label: { es: "Pedido", en: "Order" } },
    { name: "shift", type: "relationship", relationTo: "shifts", label: { es: "Turno", en: "Shift" } },
    {
      name: "method",
      type: "select",
      required: true,
      label: { es: "Método", en: "Method" },
      options: [
        { label: { es: "Efectivo", en: "Cash" }, value: "cash" },
        { label: { es: "Tarjeta (datáfono)", en: "Card (terminal)" }, value: "card_terminal" },
        { label: { es: "Tarjeta (Stripe)", en: "Card (Stripe)" }, value: "card_stripe" },
        { label: "Online", value: "online" },
      ],
    },
    { name: "amountCents", type: "number", required: true, label: { es: "Importe (céntimos)", en: "Amount (cents)" } },
    { name: "tenderedCents", type: "number", label: { es: "Entregado (céntimos)", en: "Tendered (cents)" } },
    { name: "changeCents", type: "number", label: { es: "Cambio (céntimos)", en: "Change (cents)" } },
    { name: "providerRef", type: "text", label: { es: "Referencia del proveedor", en: "Supplier reference" } },
    { name: "staff", type: "relationship", relationTo: "users", label: { es: "Cobrado por", en: "Charged by" } },
  ],
};

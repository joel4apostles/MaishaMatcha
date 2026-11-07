import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/**
 * Money returned on a paid order, full or partial. Append-only, always with
 * a reason, the person who did it, and the approver when the amount was
 * above that person's refund limit. Each refund issues a corrective invoice
 * (R5) in the same hash chain.
 */
export const Refunds: CollectionConfig = {
  slug: "refunds",
  labels: { singular: { es: "Devolución", en: "Refund" }, plural: { es: "Devoluciones", en: "Refunds" } },
  admin: { defaultColumns: ["order", "amountCents", "method", "reason", "staff", "createdAt"] },
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
    { name: "reason", type: "textarea", required: true, label: { es: "Motivo", en: "Reason" } },
    { name: "staff", type: "relationship", relationTo: "users", label: { es: "Hecha por", en: "Made by" } },
    { name: "approvedBy", type: "relationship", relationTo: "users", label: { es: "Aprobada por", en: "Approved by" } },
    { name: "invoice", type: "relationship", relationTo: "invoices", label: { es: "Factura rectificativa", en: "Corrective invoice" } },
  ],
};

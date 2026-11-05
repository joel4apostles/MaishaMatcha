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
  labels: { singular: "Devolución", plural: "Devoluciones" },
  admin: { defaultColumns: ["order", "amountCents", "method", "reason", "staff", "createdAt"] },
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
    { name: "reason", type: "textarea", required: true, label: "Motivo" },
    { name: "staff", type: "relationship", relationTo: "users", label: "Hecha por" },
    { name: "approvedBy", type: "relationship", relationTo: "users", label: "Aprobada por" },
    { name: "invoice", type: "relationship", relationTo: "invoices", label: "Factura rectificativa" },
  ],
};

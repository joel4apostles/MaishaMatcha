import type { CollectionConfig } from "payload";
import { anyStaff, nobody } from "../access";

/**
 * A sale. Created ONLY by the counter's server actions (lib/pos/orders.ts),
 * which price every line on the server from the carta: the client never
 * sends a price. Lines snapshot names, prices, IVA and options at sale time,
 * so later carta edits never rewrite history. Never deleted; a void is a
 * status, a refund is a Refund record.
 */
export const Orders: CollectionConfig = {
  slug: "orders",
  labels: { singular: "Pedido", plural: "Pedidos" },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "status", "paymentStatus", "totalCents", "staff", "createdAt"],
    description: "Se crean desde la barra o la web. Aquí se consultan; no se editan.",
  },
  defaultSort: "-createdAt",
  access: { read: anyStaff, create: nobody, update: nobody, delete: nobody },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // One spelling per customer, so accounts and erasure find every order.
        if (data?.customerEmail) data.customerEmail = String(data.customerEmail).trim().toLowerCase();
        return data;
      },
    ],
  },
  fields: [
    { name: "label", type: "text", admin: { readOnly: true, description: "Número visible: 0042" } },
    {
      type: "row",
      fields: [
        {
          name: "channel",
          type: "select",
          required: true,
          defaultValue: "counter",
          label: "Canal",
          options: [
            { label: "Barra", value: "counter" },
            { label: "Web", value: "online" },
            { label: "Mesa (QR)", value: "table" },
          ],
        },
        {
          name: "service",
          type: "select",
          required: true,
          defaultValue: "here",
          label: "Servicio",
          options: [
            { label: "Aquí", value: "here" },
            { label: "Para llevar", value: "takeaway" },
          ],
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "received",
          label: "Estado",
          options: [
            { label: "Recibido", value: "received" },
            { label: "Preparando", value: "preparing" },
            { label: "Listo", value: "ready" },
            { label: "Entregado", value: "collected" },
            { label: "Anulado", value: "cancelled" },
          ],
        },
        {
          name: "paymentStatus",
          type: "select",
          required: true,
          defaultValue: "unpaid",
          label: "Pago",
          options: [
            { label: "Pendiente", value: "unpaid" },
            { label: "Pagado", value: "paid" },
            { label: "Devuelto en parte", value: "partially_refunded" },
            { label: "Devuelto", value: "refunded" },
          ],
        },
      ],
    },
    {
      name: "lines",
      type: "array",
      label: "Líneas",
      admin: { readOnly: true },
      fields: [
        { name: "menuItem", type: "relationship", relationTo: "menu-items", label: "Producto" },
        { name: "name", type: "text", required: true, label: "Nombre" },
        { name: "quantity", type: "number", required: true, min: 1, label: "Cantidad" },
        { name: "unitCents", type: "number", required: true, label: "Precio unidad (céntimos)" },
        { name: "taxRateBasisPoints", type: "number", required: true, label: "IVA (pb)" },
        { name: "modifiers", type: "json", label: "Opciones" },
        { name: "grams", type: "number", label: "Matcha medido (g)" },
        { name: "note", type: "text", label: "Nota" },
      ],
    },
    { name: "totalCents", type: "number", required: true, label: "Total (céntimos)", admin: { readOnly: true } },
    { name: "taxBreakdown", type: "json", label: "Desglose de IVA", admin: { readOnly: true } },
    { name: "note", type: "textarea", label: "Nota del pedido" },
    { name: "customerName", type: "text", label: "Cliente" },
    { name: "payOnline", type: "checkbox", defaultValue: false, label: "Pago online", admin: { readOnly: true } },
    { name: "customerEmail", type: "email", label: "Email del cliente" },
    { name: "customerPhone", type: "text", label: "Teléfono del cliente" },
    { name: "pickupAt", type: "date", label: "Recogida", admin: { date: { pickerAppearance: "dayAndTime" } } },
    { name: "readyNotifiedAt", type: "date", label: "Aviso de listo enviado", admin: { readOnly: true } },
    {
      name: "publicToken",
      type: "text",
      unique: true,
      index: true,
      admin: { hidden: true },
      access: { read: () => false },
    },
    { name: "member", type: "relationship", relationTo: "members", label: "Socio" },
    {
      name: "kind",
      type: "select",
      defaultValue: "sale",
      label: "Tipo",
      admin: { readOnly: true },
      options: [
        { label: "Venta", value: "sale" },
        { label: "Cuota de socio fundador", value: "membership" },
      ],
    },
    { name: "staff", type: "relationship", relationTo: "users", label: "Atendido por", admin: { readOnly: true } },
    { name: "device", type: "relationship", relationTo: "pos-devices", label: "Tablet", admin: { readOnly: true } },
    { name: "shift", type: "relationship", relationTo: "shifts", label: "Turno", admin: { readOnly: true } },
    { name: "statusChangedAt", type: "date", label: "Último cambio de estado", admin: { readOnly: true } },
    {
      name: "idempotencyKey",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { hidden: true },
    },
  ],
};

import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";
import { shipToFields } from "../shipTo";

/**
 * A sale. Created ONLY by the counter's server actions (lib/pos/orders.ts),
 * which price every line on the server from the carta: the client never
 * sends a price. Lines snapshot names, prices, IVA and options at sale time,
 * so later carta edits never rewrite history. Never deleted; a void is a
 * status, a refund is a Refund record.
 */
export const Orders: CollectionConfig = {
  slug: "orders",
  labels: { singular: { es: "Pedido", en: "Order" }, plural: { es: "Pedidos", en: "Orders" } },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "status", "paymentStatus", "totalCents", "staff", "createdAt"],
    description: { es: "Se crean desde la barra o la web. Aquí se consultan; no se editan.", en: "Created from the bar or the website. Viewed here; not edited." },
  },
  defaultSort: "-createdAt",
  // Customer contact details and addresses: owner and manager. The counter
  // reads through its own server code, never this API.
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
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
    { name: "label", type: "text", admin: { readOnly: true, description: { es: "Número visible: 0042", en: "Visible number: 0042" } } },
    {
      type: "row",
      fields: [
        {
          name: "channel",
          type: "select",
          required: true,
          defaultValue: "counter",
          label: { es: "Canal", en: "Channel" },
          options: [
            { label: { es: "Barra", en: "Bar" }, value: "counter" },
            { label: "Web", value: "online" },
            { label: { es: "Mesa (QR)", en: "Table (QR)" }, value: "table" },
          ],
        },
        {
          name: "service",
          type: "select",
          required: true,
          defaultValue: "here",
          label: { es: "Servicio", en: "Service" },
          options: [
            { label: { es: "Aquí", en: "Here" }, value: "here" },
            { label: { es: "Para llevar", en: "Takeaway" }, value: "takeaway" },
          ],
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "received",
          label: { es: "Estado", en: "Status" },
          options: [
            { label: { es: "Recibido", en: "Received" }, value: "received" },
            { label: { es: "Preparando", en: "Preparing" }, value: "preparing" },
            { label: { es: "Listo", en: "Ready" }, value: "ready" },
            { label: { es: "Entregado", en: "Collected" }, value: "collected" },
            { label: { es: "Anulado", en: "Voided" }, value: "cancelled" },
          ],
        },
        {
          name: "paymentStatus",
          type: "select",
          required: true,
          defaultValue: "unpaid",
          label: { es: "Pago", en: "Payment" },
          options: [
            { label: { es: "Pendiente", en: "Pending" }, value: "unpaid" },
            { label: { es: "Pagado", en: "Paid" }, value: "paid" },
            { label: { es: "Devuelto en parte", en: "Partly refunded" }, value: "partially_refunded" },
            { label: { es: "Devuelto", en: "Refunded" }, value: "refunded" },
          ],
        },
      ],
    },
    {
      name: "lines",
      type: "array",
      label: { es: "Líneas", en: "Lines" },
      admin: { readOnly: true },
      fields: [
        { name: "menuItem", type: "relationship", relationTo: "menu-items", label: { es: "Producto", en: "Product" } },
        { name: "name", type: "text", required: true, label: { es: "Nombre", en: "Name" } },
        { name: "quantity", type: "number", required: true, min: 1, label: { es: "Cantidad", en: "Quantity" } },
        { name: "unitCents", type: "number", required: true, label: { es: "Precio unidad (céntimos)", en: "Unit price (cents)" } },
        { name: "taxRateBasisPoints", type: "number", required: true, label: { es: "IVA (pb)", en: "VAT (bp)" } },
        { name: "modifiers", type: "json", label: { es: "Opciones", en: "Options" } },
        { name: "grams", type: "number", label: { es: "Matcha medido (g)", en: "Matcha measured (g)" } },
        { name: "note", type: "text", label: { es: "Nota", en: "Note" } },
      ],
    },
    { name: "totalCents", type: "number", required: true, label: { es: "Total (céntimos)", en: "Total (cents)" }, admin: { readOnly: true } },
    { name: "taxBreakdown", type: "json", label: { es: "Desglose de IVA", en: "VAT breakdown" }, admin: { readOnly: true } },
    { name: "note", type: "textarea", label: { es: "Nota del pedido", en: "Order note" } },
    { name: "customerName", type: "text", label: { es: "Cliente", en: "Customer" } },
    { name: "payOnline", type: "checkbox", defaultValue: false, label: { es: "Pago online", en: "Online payment" }, admin: { readOnly: true } },
    { name: "customerEmail", type: "email", label: { es: "Email del cliente", en: "Customer email" } },
    { name: "customerPhone", type: "text", label: { es: "Teléfono del cliente", en: "Customer phone" } },
    { name: "table", type: "number", min: 1, max: 60, label: { es: "Mesa", en: "Table" }, admin: { readOnly: true } },
    { name: "pickupAt", type: "date", label: { es: "Recogida", en: "Pickup" }, admin: { date: { pickerAppearance: "dayAndTime" } } },
    { name: "readyNotifiedAt", type: "date", label: { es: "Aviso de listo enviado", en: "Ready notice sent" }, admin: { readOnly: true } },
    {
      name: "publicToken",
      type: "text",
      unique: true,
      index: true,
      admin: { hidden: true },
      access: { read: () => false },
    },
    { name: "member", type: "relationship", relationTo: "members", label: { es: "Socio", en: "Member" } },
    {
      name: "kind",
      type: "select",
      defaultValue: "sale",
      label: { es: "Tipo", en: "Type" },
      admin: { readOnly: true },
      options: [
        { label: { es: "Venta", en: "Sale" }, value: "sale" },
        { label: { es: "Cuota de socio fundador", en: "Founding membership fee" }, value: "membership" },
        { label: { es: "Suscripción premium", en: "Monthly subscription" }, value: "subscription" },
      ],
    },
    {
      name: "fulfilment",
      type: "select",
      label: { es: "Entrega de la caja", en: "Box delivery" },
      admin: { readOnly: true, condition: (data) => data?.kind === "subscription" },
      options: [
        { label: { es: "Recoge en el salón", en: "Collects at the salon" }, value: "pickup" },
        { label: { es: "Envío a casa", en: "Home delivery" }, value: "shipping" },
      ],
    },
    {
      name: "shipTo",
      type: "group",
      label: { es: "Enviar a", en: "Ship to" },
      admin: { condition: (data) => data?.fulfilment === "shipping" },
      fields: shipToFields(true),
    },
    { name: "shippedAt", type: "date", label: { es: "Enviada", en: "Shipped" }, admin: { readOnly: true, condition: (data) => data?.fulfilment === "shipping" } },
    { name: "staff", type: "relationship", relationTo: "users", label: { es: "Atendido por", en: "Served by" }, admin: { readOnly: true } },
    { name: "device", type: "relationship", relationTo: "pos-devices", label: "Tablet", admin: { readOnly: true } },
    { name: "shift", type: "relationship", relationTo: "shifts", label: { es: "Turno", en: "Shift" }, admin: { readOnly: true } },
    { name: "statusChangedAt", type: "date", label: { es: "Último cambio de estado", en: "Last status change" }, admin: { readOnly: true } },
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

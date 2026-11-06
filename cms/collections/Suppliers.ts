import type { CollectionConfig } from "payload";
import { receiveLines, sendPurchaseOrder } from "@/lib/inventory";
import { nobody, owner, ownerOrManager } from "../access";
import { integerCents } from "../validators";

export const Suppliers: CollectionConfig = {
  slug: "suppliers",
  labels: { singular: "Proveedor", plural: "Proveedores" },
  admin: { useAsTitle: "name", defaultColumns: ["name", "email", "leadTimeDays", "autoSend"] },
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: owner },
  fields: [
    { name: "name", type: "text", required: true, label: "Nombre" },
    { name: "contactName", type: "text", label: "Persona de contacto" },
    { name: "email", type: "email", required: true, label: "Email de pedidos" },
    { name: "phone", type: "text", label: "Teléfono" },
    { name: "country", type: "text", label: "País" },
    {
      type: "row",
      fields: [
        { name: "leadTimeDays", type: "number", min: 0, label: "Plazo de entrega (días)" },
        { name: "minOrderCents", type: "number", min: 0, label: "Pedido mínimo (céntimos)", validate: integerCents },
      ],
    },
    {
      name: "autoSend",
      type: "checkbox",
      defaultValue: false,
      label: "Enviar pedidos automáticamente",
      admin: { description: "Apagado: cada pedido espera tu aprobación. Recomendado." },
    },
    { name: "notes", type: "textarea", label: "Notas" },
  ],
};

export const SupplierProducts: CollectionConfig = {
  slug: "supplier-products",
  labels: { singular: "Producto de proveedor", plural: "Catálogo de proveedores" },
  admin: { defaultColumns: ["supplier", "ingredient", "packSize", "priceCents"] },
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: ownerOrManager },
  fields: [
    { name: "supplier", type: "relationship", relationTo: "suppliers", required: true, label: "Proveedor" },
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: "Ingrediente" },
    { name: "sku", type: "text", label: "Referencia" },
    {
      name: "packSize",
      type: "number",
      required: true,
      min: 0,
      label: "Tamaño del envase",
      admin: { description: "En la unidad del ingrediente: una lata de 100 g = 100." },
    },
    { name: "priceCents", type: "number", required: true, min: 0, label: "Precio por envase (céntimos)", validate: integerCents },
  ],
};

/**
 * Purchase orders. Drafts are created by the system when an ingredient
 * crosses its reorder point (one open draft per supplier, never one per
 * sale). Owner or manager approves; approval emails the supplier and logs
 * it. Receiving adds the stock. Never deleted; a wrong order is cancelled.
 */
export const PurchaseOrders: CollectionConfig = {
  slug: "purchase-orders",
  labels: { singular: "Pedido a proveedor", plural: "Pedidos a proveedores" },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "supplier", "status", "totalCents", "createdAt"],
    description: "Borradores automáticos: revisa, aprueba y se envían al proveedor.",
  },
  defaultSort: "-createdAt",
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: nobody },
  fields: [
    { name: "label", type: "text", label: "Número", admin: { readOnly: true } },
    { name: "pdf", type: "ui", admin: { components: { Field: "/cms/components/PoPdfLink#PoPdfLink" } } },
    { name: "supplier", type: "relationship", relationTo: "suppliers", required: true, label: "Proveedor" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      label: "Estado",
      options: [
        { label: "Borrador", value: "draft" },
        { label: "Aprobado y enviado", value: "sent" },
        { label: "Recibido en parte", value: "partially_received" },
        { label: "Recibido", value: "received" },
        { label: "Cancelado", value: "cancelled" },
      ],
    },
    {
      name: "lines",
      type: "array",
      label: "Líneas",
      fields: [
        { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: "Ingrediente" },
        { name: "packs", type: "number", required: true, min: 1, label: "Envases" },
        { name: "packSize", type: "number", required: true, min: 0, label: "Tamaño del envase" },
        { name: "unitPriceCents", type: "number", min: 0, label: "Precio por envase (céntimos)" },
        { name: "receivedPacks", type: "number", min: 0, defaultValue: 0, label: "Envases recibidos" },
      ],
    },
    { name: "totalCents", type: "number", label: "Total (céntimos)", admin: { readOnly: true } },
    { name: "note", type: "textarea", label: "Nota para el proveedor" },
    { name: "approvedBy", type: "relationship", relationTo: "users", label: "Aprobado por", admin: { readOnly: true } },
    { name: "sentAt", type: "date", label: "Enviado", admin: { readOnly: true } },
    { name: "emailStatus", type: "text", label: "Envío por email", admin: { readOnly: true } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req, context }) => {
        if (operation !== "update" || context.skipPoHooks) return doc;
        // Approving = setting a draft to "sent": email the supplier now.
        if (previousDoc?.status === "draft" && doc.status === "sent" && !doc.sentAt) {
          const by = req.user?.collection === "users" ? (req.user.id as number) : null;
          await sendPurchaseOrder(req.payload, doc.id, by, req);
        }
        // Receiving = raising "envases recibidos" on a line.
        const prev = (previousDoc?.lines ?? []) as { receivedPacks?: number | null }[];
        const grew = (doc.lines ?? []).some((l: { receivedPacks?: number | null }, i: number) => (l.receivedPacks ?? 0) > (prev[i]?.receivedPacks ?? 0));
        if (grew) {
          await receiveLines(req, doc, prev);
          const lines = (doc.lines ?? []) as { packs: number; receivedPacks?: number | null }[];
          const all = lines.every((l) => (l.receivedPacks ?? 0) >= l.packs);
          await req.payload.update({
            collection: "purchase-orders",
            id: doc.id,
            req,
            overrideAccess: true,
            context: { skipPoHooks: true },
            data: { status: all ? "received" : "partially_received" },
          });
        }
        return doc;
      },
    ],
  },
};

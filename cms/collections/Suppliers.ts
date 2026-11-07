import type { CollectionConfig } from "payload";
import { receiveLines, sendPurchaseOrder } from "@/lib/inventory";
import { nobody, owner, ownerOrManager } from "../access";
import { integerCents } from "../validators";

export const Suppliers: CollectionConfig = {
  slug: "suppliers",
  labels: { singular: { es: "Proveedor", en: "Supplier" }, plural: { es: "Proveedores", en: "Suppliers" } },
  admin: { useAsTitle: "name", defaultColumns: ["name", "email", "leadTimeDays", "autoSend"] },
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: owner },
  fields: [
    { name: "name", type: "text", required: true, label: { es: "Nombre", en: "Name" } },
    { name: "contactName", type: "text", label: { es: "Persona de contacto", en: "Contact person" } },
    { name: "email", type: "email", required: true, label: { es: "Email de pedidos", en: "Orders email" } },
    { name: "phone", type: "text", label: { es: "Teléfono", en: "Phone" } },
    { name: "country", type: "text", label: { es: "País", en: "Country" } },
    {
      type: "row",
      fields: [
        { name: "leadTimeDays", type: "number", min: 0, label: { es: "Plazo de entrega (días)", en: "Lead time (days)" } },
        { name: "minOrderCents", type: "number", min: 0, label: { es: "Pedido mínimo (céntimos)", en: "Minimum order (cents)" }, validate: integerCents },
      ],
    },
    {
      name: "autoSend",
      type: "checkbox",
      defaultValue: false,
      label: { es: "Enviar pedidos automáticamente", en: "Send supplier orders automatically" },
      admin: { description: { es: "Apagado: cada pedido espera tu aprobación. Recomendado.", en: "Off: every order waits for your approval. Recommended." } },
    },
    { name: "notes", type: "textarea", label: { es: "Notas", en: "Notes" } },
  ],
};

export const SupplierProducts: CollectionConfig = {
  slug: "supplier-products",
  labels: { singular: { es: "Producto de proveedor", en: "Supplier product" }, plural: { es: "Catálogo de proveedores", en: "Supplier catalogue" } },
  admin: { defaultColumns: ["supplier", "ingredient", "packSize", "priceCents"] },
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: ownerOrManager },
  fields: [
    { name: "supplier", type: "relationship", relationTo: "suppliers", required: true, label: { es: "Proveedor", en: "Supplier" } },
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: { es: "Ingrediente", en: "Ingredient" } },
    { name: "sku", type: "text", label: { es: "Referencia", en: "Reference" } },
    {
      name: "packSize",
      type: "number",
      required: true,
      min: 0,
      label: { es: "Tamaño del envase", en: "Pack size" },
      admin: { description: { es: "En la unidad del ingrediente: una lata de 100 g = 100.", en: "In the ingredient's unit: a 100 g tin = 100." } },
    },
    { name: "priceCents", type: "number", required: true, min: 0, label: { es: "Precio por envase (céntimos)", en: "Price per pack (cents)" }, validate: integerCents },
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
  labels: { singular: { es: "Pedido a proveedor", en: "Supplier order" }, plural: { es: "Pedidos a proveedores", en: "Supplier orders" } },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "supplier", "status", "totalCents", "createdAt"],
    description: { es: "Borradores automáticos: revisa, aprueba y se envían al proveedor.", en: "Automatic drafts: review and approve, then they go to the supplier." },
  },
  defaultSort: "-createdAt",
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: nobody },
  fields: [
    { name: "label", type: "text", label: { es: "Número", en: "Number" }, admin: { readOnly: true } },
    { name: "pdf", type: "ui", admin: { components: { Field: "/cms/components/PoPdfLink#PoPdfLink" } } },
    { name: "supplier", type: "relationship", relationTo: "suppliers", required: true, label: { es: "Proveedor", en: "Supplier" } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      label: { es: "Estado", en: "Status" },
      options: [
        { label: { es: "Borrador", en: "Draft" }, value: "draft" },
        { label: { es: "Aprobado y enviado", en: "Approved and sent" }, value: "sent" },
        { label: { es: "Recibido en parte", en: "Partly received" }, value: "partially_received" },
        { label: { es: "Recibido", en: "Received" }, value: "received" },
        { label: { es: "Cancelado", en: "Cancelled" }, value: "cancelled" },
      ],
    },
    {
      name: "lines",
      type: "array",
      label: { es: "Líneas", en: "Lines" },
      fields: [
        { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: { es: "Ingrediente", en: "Ingredient" } },
        { name: "packs", type: "number", required: true, min: 1, label: { es: "Envases", en: "Packs" } },
        { name: "packSize", type: "number", required: true, min: 0, label: { es: "Tamaño del envase", en: "Pack size" } },
        { name: "unitPriceCents", type: "number", min: 0, label: { es: "Precio por envase (céntimos)", en: "Price per pack (cents)" } },
        { name: "receivedPacks", type: "number", min: 0, defaultValue: 0, label: { es: "Envases recibidos", en: "Packs received" } },
      ],
    },
    { name: "totalCents", type: "number", label: { es: "Total (céntimos)", en: "Total (cents)" }, admin: { readOnly: true } },
    { name: "note", type: "textarea", label: { es: "Nota para el proveedor", en: "Note for the supplier" } },
    { name: "approvedBy", type: "relationship", relationTo: "users", label: { es: "Aprobado por", en: "Approved by" }, admin: { readOnly: true } },
    { name: "sentAt", type: "date", label: { es: "Enviado", en: "Sent" }, admin: { readOnly: true } },
    { name: "emailStatus", type: "text", label: { es: "Envío por email", en: "Email delivery" }, admin: { readOnly: true } },
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

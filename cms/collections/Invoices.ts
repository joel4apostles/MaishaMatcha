import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/**
 * Invoice records (factura simplificada for counter sales), designed for
 * Spain's anti-fraud rules (Ley 11/2021, RD 1007/2023, VERI*FACTU):
 * gap-free numbering per series, each record chained to the previous by a
 * SHA-256 fingerprint, a QR payload, and no edits or deletions ever.
 * Corrections are new records (facturas rectificativas).
 *
 * NOT YET SUBMITTED to the AEAT: `aeatStatus` stays "pending" until the
 * submission module (company e-certificate) exists. See POS-PLAN.md.
 */
export const Invoices: CollectionConfig = {
  slug: "invoices",
  labels: { singular: "Factura", plural: "Facturas" },
  admin: {
    useAsTitle: "fullNumber",
    defaultColumns: ["fullNumber", "type", "totalCents", "issuedAt", "aeatStatus"],
    description: "Registro inalterable. Las correcciones son facturas rectificativas.",
  },
  defaultSort: "-issuedAt",
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "fullNumber", type: "text", required: true, unique: true, label: "Número" },
    { name: "series", type: "text", required: true, label: "Serie" },
    { name: "number", type: "number", required: true, label: "Correlativo" },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "F2",
      label: "Tipo",
      options: [
        { label: "F2 · Simplificada", value: "F2" },
        { label: "F1 · Completa", value: "F1" },
        { label: "R5 · Rectificativa simplificada", value: "R5" },
      ],
    },
    { name: "order", type: "relationship", relationTo: "orders", required: true, label: "Pedido" },
    { name: "issuedAt", type: "date", required: true, label: "Fecha de expedición" },
    { name: "issuerNif", type: "text", label: "NIF del emisor" },
    { name: "totalCents", type: "number", required: true, label: "Importe total (céntimos)" },
    { name: "taxCents", type: "number", required: true, label: "Cuota total (céntimos)" },
    { name: "taxBreakdown", type: "json", label: "Desglose de IVA" },
    { name: "hash", type: "text", required: true, index: true, label: "Huella" },
    { name: "previousHash", type: "text", label: "Huella anterior" },
    { name: "qrUrl", type: "text", label: "URL del QR" },
    {
      name: "aeatStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      label: "Estado AEAT",
      options: [
        { label: "Pendiente de envío", value: "pending" },
        { label: "Aceptada", value: "accepted" },
        { label: "Rechazada", value: "rejected" },
      ],
    },
  ],
};

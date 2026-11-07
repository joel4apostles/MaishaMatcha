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
  labels: { singular: { es: "Factura", en: "Invoice" }, plural: { es: "Facturas", en: "Invoices" } },
  admin: {
    useAsTitle: "fullNumber",
    defaultColumns: ["fullNumber", "type", "totalCents", "issuedAt", "aeatStatus"],
    description: { es: "Registro inalterable. Las correcciones son facturas rectificativas.", en: "Unalterable record. Corrections are corrective invoices." },
  },
  defaultSort: "-issuedAt",
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "fullNumber", type: "text", required: true, unique: true, label: { es: "Número", en: "Number" } },
    { name: "series", type: "text", required: true, label: { es: "Serie", en: "Series" } },
    { name: "number", type: "number", required: true, label: { es: "Correlativo", en: "Sequential" } },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "F2",
      label: { es: "Tipo", en: "Type" },
      options: [
        { label: { es: "F2 · Simplificada", en: "F2 · Simplified" }, value: "F2" },
        { label: { es: "F1 · Completa", en: "F1 · Full" }, value: "F1" },
        { label: { es: "F3 · Completa en sustitución de simplificada", en: "F3 · Full, replacing a simplified one" }, value: "F3" },
        { label: { es: "R5 · Rectificativa simplificada", en: "R5 · Simplified corrective" }, value: "R5" },
      ],
    },
    { name: "order", type: "relationship", relationTo: "orders", required: true, label: { es: "Pedido", en: "Order" } },
    { name: "rectifies", type: "relationship", relationTo: "invoices", label: { es: "Rectifica a", en: "Corrects" } },
    { name: "replaces", type: "relationship", relationTo: "invoices", label: { es: "Sustituye a (simplificada)", en: "Replaces (simplified)" } },
    {
      type: "group",
      name: "customer",
      label: { es: "Destinatario (factura completa)", en: "Recipient (full invoice)" },
      fields: [
        { name: "name", type: "text", label: { es: "Nombre o razón social", en: "Name or company name" } },
        { name: "taxId", type: "text", label: "NIF / NIE / CIF / VAT" },
        { name: "address", type: "text", label: { es: "Domicilio", en: "Address" } },
      ],
    },
    { name: "issuedAt", type: "date", required: true, label: { es: "Fecha de expedición", en: "Issue date" } },
    { name: "issuerNif", type: "text", label: { es: "NIF del emisor", en: "Issuer tax ID" } },
    { name: "totalCents", type: "number", required: true, label: { es: "Importe total (céntimos)", en: "Total amount (cents)" } },
    { name: "taxCents", type: "number", required: true, label: { es: "Cuota total (céntimos)", en: "Total tax (cents)" } },
    { name: "taxBreakdown", type: "json", label: { es: "Desglose de IVA", en: "VAT breakdown" } },
    { name: "hash", type: "text", required: true, index: true, label: { es: "Huella", en: "Hash" } },
    { name: "previousHash", type: "text", label: { es: "Huella anterior", en: "Previous hash" } },
    { name: "qrUrl", type: "text", label: { es: "URL del QR", en: "QR URL" } },
    {
      name: "aeatStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      label: { es: "Estado AEAT", en: "AEAT status" },
      options: [
        { label: { es: "Pendiente de envío", en: "Waiting to send" }, value: "pending" },
        { label: { es: "Aceptada", en: "Accepted" }, value: "accepted" },
        { label: { es: "Rechazada", en: "Rejected" }, value: "rejected" },
      ],
    },
  ],
};

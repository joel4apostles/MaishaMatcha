import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/**
 * Who did what, when and why, for every sensitive action. Append-only:
 * written by server hooks with overrideAccess, never through the API.
 */
export const AuditLog: CollectionConfig = {
  slug: "audit-log",
  labels: { singular: "Registro", plural: "Registro de actividad" },
  admin: {
    useAsTitle: "action",
    defaultColumns: ["createdAt", "action", "actor", "entity", "reason"],
    description: "Solo lectura. Cada acción sensible deja aquí su rastro.",
  },
  defaultSort: "-createdAt",
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "action", type: "text", required: true, index: true, label: "Acción" },
    { name: "actor", type: "relationship", relationTo: "users", label: "Quién" },
    { name: "device", type: "relationship", relationTo: "pos-devices", label: "Dispositivo" },
    { name: "entity", type: "text", required: true, label: "Colección" },
    { name: "entityId", type: "text", label: "Documento" },
    { name: "reason", type: "textarea", label: "Motivo" },
    { name: "before", type: "json", label: "Antes" },
    { name: "after", type: "json", label: "Después" },
  ],
};

import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/**
 * Who did what, when and why, for every sensitive action. Append-only:
 * written by server hooks with overrideAccess, never through the API.
 */
export const AuditLog: CollectionConfig = {
  slug: "audit-log",
  labels: { singular: { es: "Registro", en: "Record" }, plural: { es: "Registro de actividad", en: "Activity log" } },
  admin: {
    useAsTitle: "action",
    defaultColumns: ["createdAt", "action", "actor", "entity", "reason"],
    description: { es: "Solo lectura. Cada acción sensible deja aquí su rastro.", en: "Read only. Every sensitive action leaves its trace here." },
  },
  defaultSort: "-createdAt",
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "action", type: "text", required: true, index: true, label: { es: "Acción", en: "Action" } },
    { name: "actor", type: "relationship", relationTo: "users", label: { es: "Quién", en: "Who" } },
    { name: "device", type: "relationship", relationTo: "pos-devices", label: { es: "Dispositivo", en: "Device" } },
    { name: "entity", type: "text", required: true, label: { es: "Colección", en: "Collection" } },
    { name: "entityId", type: "text", label: { es: "Documento", en: "Document" } },
    { name: "reason", type: "textarea", label: { es: "Motivo", en: "Reason" } },
    { name: "before", type: "json", label: { es: "Antes", en: "Before" } },
    { name: "after", type: "json", label: { es: "Después", en: "After" } },
  ],
};

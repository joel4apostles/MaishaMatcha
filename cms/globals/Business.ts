import type { GlobalConfig } from "payload";
import { hasRole } from "@/lib/auth/roles";

/**
 * The business details printed on every ticket and used for VERI*FACTU.
 * Owner only. Until NIF and legal name are filled in, tickets say so.
 */
export const Business: GlobalConfig = {
  slug: "business",
  label: "Empresa",
  admin: { group: "Control" },
  access: {
    read: ({ req }) => hasRole(req.user, "owner", "manager", "barista"),
    update: ({ req }) => hasRole(req.user, "owner"),
  },
  fields: [
    { name: "legalName", type: "text", label: "Razón social" },
    { name: "tradeName", type: "text", label: "Nombre comercial", defaultValue: "maisha matcha" },
    { name: "nif", type: "text", label: "NIF" },
    { name: "address", type: "text", label: "Dirección fiscal", defaultValue: "Plaza Cetina, 3, Murcia" },
    {
      name: "invoiceSeries",
      type: "text",
      label: "Serie de tickets",
      defaultValue: "T",
      admin: { description: "Prefijo de las facturas simplificadas. Cámbialo solo con tu gestor." },
    },
    { name: "receiptFooter", type: "textarea", label: "Pie del ticket", localized: true },
    {
      name: "targetMarginPercent",
      type: "number",
      min: 0,
      max: 100,
      defaultValue: 65,
      label: "Margen objetivo (%)",
      admin: { description: "Avisa de las bebidas cuyo margen baje de aquí." },
    },
  ],
};

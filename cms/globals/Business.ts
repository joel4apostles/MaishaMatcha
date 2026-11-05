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
      type: "collapsible",
      label: "Pedidos online",
      fields: [
        {
          name: "onlineOrdering",
          type: "checkbox",
          defaultValue: false,
          label: "Aceptar pedidos online",
          admin: { description: "Apagado: la web dice que los pedidos online llegan pronto." },
        },
        {
          type: "row",
          fields: [
            { name: "openingTime", type: "text", defaultValue: "08:00", label: "Abre", admin: { description: "HH:MM" } },
            { name: "closingTime", type: "text", defaultValue: "18:00", label: "Cierra", admin: { description: "HH:MM" } },
          ],
        },
        {
          name: "openDays",
          type: "select",
          hasMany: true,
          label: "Días abiertos",
          defaultValue: ["tue", "wed", "thu", "fri", "sat", "sun"],
          options: [
            { label: "Lunes", value: "mon" },
            { label: "Martes", value: "tue" },
            { label: "Miércoles", value: "wed" },
            { label: "Jueves", value: "thu" },
            { label: "Viernes", value: "fri" },
            { label: "Sábado", value: "sat" },
            { label: "Domingo", value: "sun" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "slotMinutes", type: "number", defaultValue: 15, min: 5, max: 60, label: "Minutos por franja" },
            { name: "slotCapacity", type: "number", defaultValue: 6, min: 1, max: 100, label: "Pedidos por franja" },
            { name: "leadMinutes", type: "number", defaultValue: 15, min: 0, max: 240, label: "Antelación mínima (min)" },
          ],
        },
      ],
    },
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

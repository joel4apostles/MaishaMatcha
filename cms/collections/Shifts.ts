import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/**
 * A till session on one tablet: opened with a cash float, closed with a
 * counted amount. The Z report (sales by method and IVA) is frozen into
 * `report` at close. Written only by the counter's server actions.
 */
export const Shifts: CollectionConfig = {
  slug: "shifts",
  labels: { singular: "Turno", plural: "Turnos" },
  admin: {
    useAsTitle: "label",
    defaultColumns: ["label", "status", "floatCents", "differenceCents", "openedAt", "closedAt"],
  },
  defaultSort: "-openedAt",
  access: { read: ownerOrManager, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "label", type: "text", admin: { readOnly: true } },
    { name: "device", type: "relationship", relationTo: "pos-devices", required: true, label: "Tablet" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      label: "Estado",
      options: [
        { label: "Abierto", value: "open" },
        { label: "Cerrado", value: "closed" },
      ],
    },
    { name: "openedBy", type: "relationship", relationTo: "users", label: "Abierto por" },
    { name: "openedAt", type: "date", required: true, label: "Apertura" },
    { name: "floatCents", type: "number", required: true, label: "Fondo de caja (céntimos)" },
    { name: "closedBy", type: "relationship", relationTo: "users", label: "Cerrado por" },
    { name: "closedAt", type: "date", label: "Cierre" },
    { name: "expectedCashCents", type: "number", label: "Efectivo esperado (céntimos)" },
    { name: "countedCashCents", type: "number", label: "Efectivo contado (céntimos)" },
    { name: "differenceCents", type: "number", label: "Diferencia (céntimos)" },
    { name: "report", type: "json", label: "Informe Z" },
  ],
};

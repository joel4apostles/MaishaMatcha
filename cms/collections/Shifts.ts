import type { CollectionConfig } from "payload";
import { nobody, ownerOrManager } from "../access";

/**
 * A till session on one tablet: opened with a cash float, closed with a
 * counted amount. The Z report (sales by method and IVA) is frozen into
 * `report` at close. Written only by the counter's server actions.
 */
export const Shifts: CollectionConfig = {
  slug: "shifts",
  labels: { singular: { es: "Turno", en: "Shift" }, plural: { es: "Turnos", en: "Shifts" } },
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
      label: { es: "Estado", en: "Status" },
      options: [
        { label: { es: "Abierto", en: "Open" }, value: "open" },
        { label: { es: "Cerrado", en: "Closed" }, value: "closed" },
      ],
    },
    { name: "openedBy", type: "relationship", relationTo: "users", label: { es: "Abierto por", en: "Opened by" } },
    { name: "openedAt", type: "date", required: true, label: { es: "Apertura", en: "Opening" } },
    { name: "floatCents", type: "number", required: true, label: { es: "Fondo de caja (céntimos)", en: "Opening float (cents)" } },
    { name: "closedBy", type: "relationship", relationTo: "users", label: { es: "Cerrado por", en: "Closed by" } },
    { name: "closedAt", type: "date", label: { es: "Cierre", en: "Closing" } },
    { name: "expectedCashCents", type: "number", label: { es: "Efectivo esperado (céntimos)", en: "Cash expected (cents)" } },
    { name: "countedCashCents", type: "number", label: { es: "Efectivo contado (céntimos)", en: "Cash counted (cents)" } },
    { name: "differenceCents", type: "number", label: { es: "Diferencia (céntimos)", en: "Difference (cents)" } },
    { name: "report", type: "json", label: { es: "Informe Z", en: "Z report" } },
  ],
};

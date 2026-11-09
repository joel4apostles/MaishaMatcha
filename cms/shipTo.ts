import type { Field } from "payload";

/**
 * A postal address in Spain for the monthly box (Stripe Checkout collects
 * it). On the member it is the current address; on each box order it is a
 * snapshot, so a later move never rewrites where a past box went.
 */
export const shipToFields = (readOnly: boolean): Field[] => [
  {
    type: "row",
    fields: [
      { name: "name", type: "text", label: { es: "Destinatario", en: "Recipient" }, admin: { readOnly } },
      { name: "phone", type: "text", label: { es: "Teléfono", en: "Phone" }, admin: { readOnly } },
    ],
  },
  { name: "line1", type: "text", label: { es: "Dirección", en: "Address" }, admin: { readOnly } },
  { name: "line2", type: "text", label: { es: "Piso, puerta", en: "Flat, door" }, admin: { readOnly } },
  {
    type: "row",
    fields: [
      { name: "postalCode", type: "text", label: { es: "Código postal", en: "Postcode" }, admin: { readOnly } },
      { name: "city", type: "text", label: { es: "Ciudad", en: "City" }, admin: { readOnly } },
      { name: "province", type: "text", label: { es: "Provincia", en: "Province" }, admin: { readOnly } },
    ],
  },
];

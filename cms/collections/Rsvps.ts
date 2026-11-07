import type { CollectionConfig } from "payload";
import { nobody, owner, ownerOrManager } from "../access";

/** Seats booked at events. Written only by the server (capacity is locked). */
export const Rsvps: CollectionConfig = {
  slug: "rsvps",
  labels: { singular: { es: "Reserva", en: "Booking" }, plural: { es: "Reservas", en: "Bookings" } },
  admin: { defaultColumns: ["event", "member", "seats", "status", "createdAt"] },
  access: { read: ownerOrManager, create: nobody, update: ownerOrManager, delete: owner },
  indexes: [{ fields: ["event", "member"], unique: true }],
  fields: [
    { name: "event", type: "relationship", relationTo: "events", required: true, label: { es: "Evento", en: "Event" } },
    { name: "member", type: "relationship", relationTo: "members", required: true, label: { es: "Socio", en: "Member" } },
    { name: "seats", type: "number", required: true, min: 1, max: 2, defaultValue: 1, label: { es: "Plazas", en: "Seats" } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "going",
      label: { es: "Estado", en: "Status" },
      options: [
        { label: { es: "Viene", en: "Going" }, value: "going" },
        { label: { es: "Cancelada", en: "Cancelled" }, value: "cancelled" },
      ],
    },
  ],
};

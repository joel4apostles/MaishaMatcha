import type { CollectionConfig } from "payload";
import { nobody, owner, ownerOrManager } from "../access";

/** Seats booked at events. Written only by the server (capacity is locked). */
export const Rsvps: CollectionConfig = {
  slug: "rsvps",
  labels: { singular: "Reserva", plural: "Reservas" },
  admin: { defaultColumns: ["event", "member", "seats", "status", "createdAt"] },
  access: { read: ownerOrManager, create: nobody, update: ownerOrManager, delete: owner },
  indexes: [{ fields: ["event", "member"], unique: true }],
  fields: [
    { name: "event", type: "relationship", relationTo: "events", required: true, label: "Evento" },
    { name: "member", type: "relationship", relationTo: "members", required: true, label: "Socio" },
    { name: "seats", type: "number", required: true, min: 1, max: 2, defaultValue: 1, label: "Plazas" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "going",
      label: "Estado",
      options: [
        { label: "Viene", value: "going" },
        { label: "Cancelada", value: "cancelled" },
      ],
    },
  ],
};

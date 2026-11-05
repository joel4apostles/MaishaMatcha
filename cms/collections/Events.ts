import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

/**
 * Salon events. Bookable when they have a date (startsAt) and a capacity;
 * otherwise they show as "date to be announced". Members-only events are
 * for founding members.
 */
export const Events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Evento", plural: "Eventos" },
  admin: { useAsTitle: "title", defaultColumns: ["title", "startsAt", "capacity", "membersOnly"] },
  access: editorialAccess,
  fields: [
    { name: "title", type: "text", required: true, localized: true, label: "Título" },
    {
      name: "when",
      type: "text",
      required: true,
      localized: true,
      label: "Cuándo (texto)",
      admin: { description: "Lo que se lee en la web, p. ej. \"Sábado 14, 19:00\" o \"Fecha por anunciar\"." },
    },
    { name: "description", type: "textarea", required: true, localized: true, label: "Descripción" },
    {
      type: "row",
      fields: [
        { name: "startsAt", type: "date", label: "Fecha y hora", admin: { date: { pickerAppearance: "dayAndTime" } } },
        { name: "capacity", type: "number", min: 1, max: 200, label: "Plazas" },
      ],
    },
    { name: "membersOnly", type: "checkbox", defaultValue: true, label: "Solo socios fundadores" },
    { name: "photo", type: "upload", relationTo: "media", label: "Foto" },
    { name: "order", type: "number", defaultValue: 0, label: "Orden" },
  ],
};

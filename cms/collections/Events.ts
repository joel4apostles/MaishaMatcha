import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

/**
 * Salon events. Bookable when they have a date (startsAt) and a capacity;
 * otherwise they show as "date to be announced". Members-only events are
 * for founding members.
 */
export const Events: CollectionConfig = {
  slug: "events",
  labels: { singular: { es: "Evento", en: "Event" }, plural: { es: "Eventos", en: "Events" } },
  admin: { useAsTitle: "title", defaultColumns: ["title", "startsAt", "capacity", "membersOnly"] },
  access: editorialAccess,
  fields: [
    { name: "title", type: "text", required: true, localized: true, label: { es: "Título", en: "Title" } },
    {
      name: "when",
      type: "text",
      required: true,
      localized: true,
      label: { es: "Cuándo (texto)", en: "When (text)" },
      admin: { description: { es: "Lo que se lee en la web, p. ej. \"Sábado 14, 19:00\" o \"Fecha por anunciar\".", en: "What the website shows, e.g. \"Saturday 14, 19:00\" or \"Date to be announced\"." } },
    },
    { name: "description", type: "textarea", required: true, localized: true, label: { es: "Descripción", en: "Description" } },
    {
      type: "row",
      fields: [
        { name: "startsAt", type: "date", label: { es: "Fecha y hora", en: "Date and time" }, admin: { date: { pickerAppearance: "dayAndTime" } } },
        { name: "capacity", type: "number", min: 1, max: 200, label: { es: "Plazas", en: "Seats" } },
      ],
    },
    { name: "membersOnly", type: "checkbox", defaultValue: true, label: { es: "Solo socios fundadores", en: "Founding members only" } },
    { name: "photo", type: "upload", relationTo: "media", label: { es: "Foto", en: "Photo" } },
    { name: "order", type: "number", defaultValue: 0, label: { es: "Orden", en: "Order" } },
  ],
};

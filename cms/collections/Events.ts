import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

export const Events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Evento", plural: "Eventos" },
  admin: { useAsTitle: "title", defaultColumns: ["title", "when", "membersOnly"] },
  access: editorialAccess,
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    { name: "when", type: "text", required: true, localized: true },
    { name: "description", type: "textarea", required: true, localized: true },
    { name: "membersOnly", type: "checkbox", defaultValue: true },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "order", type: "number", defaultValue: 0 },
  ],
};

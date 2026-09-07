import type { CollectionConfig } from "payload";

export const Events: CollectionConfig = {
  slug: "events",
  admin: { useAsTitle: "title", defaultColumns: ["title", "when", "membersOnly"] },
  access: { read: () => true },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    { name: "when", type: "text", required: true, localized: true },
    { name: "description", type: "textarea", required: true, localized: true },
    { name: "membersOnly", type: "checkbox", defaultValue: true },
    { name: "photo", type: "upload", relationTo: "media" },
    { name: "order", type: "number", defaultValue: 0 },
  ],
};

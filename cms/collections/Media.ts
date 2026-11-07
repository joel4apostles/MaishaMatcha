import type { CollectionConfig } from "payload";
import { editorialAccess } from "../access";

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: { es: "Imagen", en: "Image" }, plural: { es: "Imágenes", en: "Images" } },
  upload: {
    staticDir: "media",
    imageSizes: [
      { name: "thumb", width: 480 },
      { name: "card", width: 960 },
      { name: "wide", width: 1800 },
    ],
    mimeTypes: ["image/*"],
  },
  access: editorialAccess,
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      localized: true,
    },
  ],
};

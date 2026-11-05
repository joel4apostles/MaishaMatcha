import type { CollectionConfig } from "payload";
import { owner, ownerOrManager } from "../access";

/**
 * The salon's members — founding fifty first, premium subscribers later.
 * Admin-managed for now; Phase 2 (Stripe) adds self-serve auth + checkout,
 * and this collection becomes the account record those flows attach to.
 */
export const Members: CollectionConfig = {
  slug: "members",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "tier", "status"],
  },
  // Customer personal data: owner and manager only. Owner may delete on a
  // GDPR erasure request.
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: owner },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true, unique: true },
    {
      name: "tier",
      type: "select",
      required: true,
      defaultValue: "founding",
      options: [
        { label: "Socio fundador", value: "founding" },
        { label: "Premium", value: "premium" },
        { label: "Lista de espera", value: "waitlist" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Activo", value: "active" },
        { label: "Pausado", value: "paused" },
        { label: "Baja", value: "cancelled" },
      ],
    },
    {
      name: "favoriteRecipeCode",
      type: "text",
      admin: { description: "Their saved drink code (CLA·TON·YUZ·F)" },
    },
    { name: "notes", type: "textarea" },
  ],
};

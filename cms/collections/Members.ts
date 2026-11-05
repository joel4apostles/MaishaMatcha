import type { CollectionConfig } from "payload";
import { hiddenField, owner, ownerOrManager } from "../access";

/**
 * Customer accounts. Optional: nobody needs one to order. Signing in is by
 * an emailed link (no passwords). Founding members are members whose
 * founding payment Stripe confirmed. Personal data: owner and manager only;
 * the member can delete their own account from /cuenta (GDPR erasure).
 */
export const Members: CollectionConfig = {
  slug: "members",
  labels: { singular: "Socio", plural: "Socios" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "tier", "foundingNumber", "emailOptIn"],
  },
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: owner },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.email) data.email = String(data.email).trim().toLowerCase();
        return data;
      },
    ],
  },
  fields: [
    { name: "name", type: "text", required: true, label: "Nombre" },
    { name: "email", type: "email", required: true, unique: true, label: "Email" },
    {
      name: "tier",
      type: "select",
      required: true,
      defaultValue: "customer",
      label: "Tipo",
      options: [
        { label: "Cliente", value: "customer" },
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
      label: "Estado",
      options: [
        { label: "Activo", value: "active" },
        { label: "Pausado", value: "paused" },
        { label: "Baja", value: "cancelled" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "foundingNumber", type: "number", label: "Nº de socio fundador", admin: { readOnly: true } },
        { name: "foundingSince", type: "date", label: "Fundador desde", admin: { readOnly: true } },
      ],
    },
    {
      name: "emailOptIn",
      type: "checkbox",
      defaultValue: false,
      label: "Acepta cartas por email",
      admin: { description: "Solo lo cambia el socio. Las campañas se envían únicamente a quien lo aceptó." },
    },
    {
      name: "locale",
      type: "select",
      defaultValue: "es",
      label: "Idioma",
      options: [
        { label: "Español", value: "es" },
        { label: "English", value: "en" },
      ],
    },
    { name: "favoriteRecipeCode", type: "text", label: "Receta favorita" },
    { name: "notes", type: "textarea", label: "Notas internas" },
    // Bumped to sign the member out everywhere.
    { name: "sessionVersion", type: "number", defaultValue: 0, access: { read: hiddenField, update: hiddenField }, admin: { hidden: true } },
    { name: "lastSignInAt", type: "date", label: "Última entrada", admin: { readOnly: true } },
  ],
};

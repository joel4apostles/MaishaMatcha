import type { CollectionConfig } from "payload";
import { hiddenField, owner, ownerField, ownerOrManager } from "../access";

/**
 * Customer accounts. Optional: nobody needs one to order. Signing in is by
 * an emailed link (no passwords). Founding members are members whose
 * founding payment Stripe confirmed. Personal data: owner and manager only;
 * the member can delete their own account from /cuenta (GDPR erasure).
 */
export const Members: CollectionConfig = {
  slug: "members",
  labels: { singular: { es: "Socio", en: "Member" }, plural: { es: "Socios", en: "Members" } },
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
    { name: "name", type: "text", required: true, label: { es: "Nombre", en: "Name" } },
    { name: "email", type: "email", required: true, unique: true, label: "Email" },
    {
      name: "tier",
      type: "select",
      required: true,
      defaultValue: "customer",
      label: { es: "Tipo", en: "Type" },
      access: { update: ownerField },
      options: [
        { label: { es: "Cliente", en: "Customer" }, value: "customer" },
        { label: { es: "Socio fundador", en: "Founding member" }, value: "founding" },
        { label: { es: "Premium", en: "Monthly subscription" }, value: "premium" },
        { label: { es: "Lista de espera", en: "Waiting list" }, value: "waitlist" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      label: { es: "Estado", en: "Status" },
      options: [
        { label: { es: "Activo", en: "Active" }, value: "active" },
        { label: { es: "Pausado", en: "Paused" }, value: "paused" },
        { label: { es: "Baja", en: "Inactive" }, value: "cancelled" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "foundingNumber", type: "number", label: { es: "Nº de socio fundador", en: "Founding member no." }, access: { create: hiddenField, update: hiddenField }, admin: { readOnly: true } },
        { name: "foundingSince", type: "date", label: { es: "Fundador desde", en: "Founder since" }, access: { create: hiddenField, update: hiddenField }, admin: { readOnly: true } },
      ],
    },
    {
      type: "collapsible",
      label: { es: "Suscripción premium", en: "Monthly subscription" },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "subscriptionStatus",
              type: "select",
              defaultValue: "none",
              label: { es: "Estado", en: "Status" },
              access: { create: hiddenField, update: hiddenField },
              admin: { readOnly: true },
              options: [
                { label: { es: "Sin suscripción", en: "No subscription" }, value: "none" },
                { label: { es: "Activa", en: "Active" }, value: "active" },
                { label: { es: "Pago pendiente", en: "Payment pending" }, value: "past_due" },
                { label: { es: "Cancelada", en: "Cancelled" }, value: "cancelled" },
              ],
            },
            { name: "subscriptionPeriodEnd", type: "date", label: { es: "Pagada hasta", en: "Paid until" }, access: { create: hiddenField, update: hiddenField }, admin: { readOnly: true } },
            { name: "cancelAtPeriodEnd", type: "checkbox", label: { es: "Termina al final del periodo", en: "Ends at the end of the period" }, access: { create: hiddenField, update: hiddenField }, admin: { readOnly: true } },
          ],
        },
        // Stripe references: server only, never shown or editable.
        { name: "stripeCustomerId", type: "text", index: true, access: { read: hiddenField, create: hiddenField, update: hiddenField }, admin: { hidden: true } },
        { name: "stripeSubscriptionId", type: "text", index: true, access: { read: hiddenField, create: hiddenField, update: hiddenField }, admin: { hidden: true } },
        // Time of the last subscription event applied: older events are ignored.
        { name: "subscriptionEventAt", type: "number", access: { read: hiddenField, create: hiddenField, update: hiddenField }, admin: { hidden: true } },
      ],
    },
    {
      name: "emailOptIn",
      type: "checkbox",
      defaultValue: false,
      label: { es: "Acepta cartas por email", en: "Accepts email letters" },
      // Consent belongs to the member: only their own account page sets it.
      access: { create: hiddenField, update: hiddenField },
      admin: { description: { es: "Solo lo cambia el socio. Las campañas se envían únicamente a quien lo aceptó.", en: "Only the member changes it. Campaigns go only to those who accepted." } },
    },
    {
      name: "locale",
      type: "select",
      defaultValue: "es",
      label: { es: "Idioma", en: "Language" },
      options: [
        { label: "Español", value: "es" },
        { label: "English", value: "en" },
      ],
    },
    { name: "favoriteRecipeCode", type: "text", label: { es: "Receta favorita", en: "Favourite recipe" } },
    { name: "notes", type: "textarea", label: { es: "Notas internas", en: "Internal notes" } },
    // Bumped to sign the member out everywhere.
    { name: "sessionVersion", type: "number", defaultValue: 0, access: { read: hiddenField, update: hiddenField }, admin: { hidden: true } },
    { name: "lastSignInAt", type: "date", label: { es: "Última entrada", en: "Last entry" }, admin: { readOnly: true } },
  ],
};

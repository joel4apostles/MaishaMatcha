import { APIError, type CollectionConfig } from "payload";
import { hiddenField, owner, ownerField, ownerOrManager } from "../access";
import { shipToFields } from "../shipTo";

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
    // Never erase someone Stripe still bills (owner delete in the admin too):
    // cancel the subscription first, then delete.
    beforeDelete: [
      async ({ id, req }) => {
        const { subscriptionLive } = await import("@/lib/premium");
        if (await subscriptionLive(req.payload, Number(id))) {
          throw new APIError("Tiene una suscripción activa: cancélala en Stripe antes de borrar al socio.", 400, null, true);
        }
        // Same erasure as the member's own page: contact details and
        // addresses off the kept orders, bookings removed.
        const { scrubMemberData } = await import("@/lib/members");
        await scrubMemberData(req.payload, Number(id), req);
      },
    ],
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
      access: { create: ownerField, update: ownerField },
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
        // The paid order that gave the place: a repeated Stripe notice for the
        // same order is "already done", never a second payment to refund.
        { name: "foundingOrder", type: "number", access: { read: hiddenField, create: hiddenField, update: hiddenField }, admin: { hidden: true } },
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
        {
          name: "boxDelivery",
          type: "select",
          defaultValue: "pickup",
          label: { es: "Caja mensual", en: "Monthly box" },
          options: [
            { label: { es: "Recoge en el salón", en: "Collects at the salon" }, value: "pickup" },
            { label: { es: "Envío a casa", en: "Home delivery" }, value: "shipping" },
          ],
          admin: { description: { es: "Lo elige al suscribirse. El cambio vale desde la próxima caja.", en: "Chosen when subscribing. A change applies from the next box." } },
        },
        {
          name: "shipTo",
          type: "group",
          label: { es: "Dirección de envío", en: "Delivery address" },
          admin: { condition: (data) => data?.boxDelivery === "shipping" },
          fields: shipToFields(false),
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

import type { CollectionConfig } from "payload";
import { hasRole } from "@/lib/auth/roles";
import { owner, ownerOrManager } from "../access";

/**
 * Email letters to members who said yes to them (emailOptIn). Written by
 * owner or manager; only the owner can send. Flow: draft → "Enviar prueba"
 * to yourself → status "Aprobada" sends once to the audience, with a
 * one-click unsubscribe link in every email.
 */
export const Campaigns: CollectionConfig = {
  slug: "campaigns",
  labels: { singular: "Carta por email", plural: "Cartas por email" },
  admin: { useAsTitle: "subject", defaultColumns: ["subject", "audience", "status", "sentCount", "sentAt"] },
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: owner },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req, context }) => {
        if (context?.system) return data;
        // A sent letter is history: it cannot be edited or sent again.
        if (originalDoc?.status === "sent") {
          throw new Error("Esta carta ya se envió.");
        }
        if (data.status === "approved" && !hasRole(req.user, "owner")) {
          throw new Error("Solo la propietaria o el propietario puede aprobar el envío.");
        }
        if (data.status === "approved" && originalDoc?.status !== "approved") data.approvedBy = req.user?.id;
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation, context }) => {
        if (context?.system) return doc;
        const { sendCampaign, sendCampaignTest } = await import("@/lib/campaigns");
        if (doc.sendTestTo && doc.sendTestTo !== previousDoc?.sendTestTo) await sendCampaignTest(req.payload, doc);
        if (operation === "update" && doc.status === "approved" && previousDoc?.status !== "approved") {
          await sendCampaign(req.payload, doc, req);
        }
        return doc;
      },
    ],
  },
  fields: [
    { name: "subject", type: "text", required: true, maxLength: 120, label: "Asunto" },
    { name: "title", type: "text", required: true, maxLength: 120, label: "Titular" },
    {
      name: "body",
      type: "textarea",
      required: true,
      label: "Texto",
      admin: { description: "Párrafos separados por una línea en blanco. Sin exclamaciones ni rayas, como el resto de la marca." },
    },
    {
      name: "audience",
      type: "select",
      required: true,
      defaultValue: "all",
      label: "Para",
      options: [
        { label: "Todos los que aceptaron cartas", value: "all" },
        { label: "Solo socios fundadores", value: "founding" },
      ],
    },
    {
      name: "locale",
      type: "select",
      required: true,
      defaultValue: "es",
      label: "Idioma de la carta",
      admin: { description: "Se envía a quienes tienen ese idioma en su cuenta." },
      options: [
        { label: "Español", value: "es" },
        { label: "English", value: "en" },
      ],
    },
    {
      name: "sendTestTo",
      type: "email",
      label: "Enviar prueba a",
      admin: { description: "Escribe tu email y guarda: llega una prueba. No cuenta como envío." },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      label: "Estado",
      options: [
        { label: "Borrador", value: "draft" },
        { label: "Aprobada (se envía al guardar)", value: "approved" },
        { label: "Enviada", value: "sent" },
      ],
    },
    { name: "sentCount", type: "number", label: "Enviadas", admin: { readOnly: true } },
    { name: "sentAt", type: "date", label: "Enviada el", admin: { readOnly: true } },
    { name: "approvedBy", type: "relationship", relationTo: "users", label: "Aprobada por", admin: { readOnly: true } },
  ],
};

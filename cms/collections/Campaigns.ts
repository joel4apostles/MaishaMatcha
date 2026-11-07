import type { CollectionConfig } from "payload";
import { hasRole } from "@/lib/auth/roles";
import { query, sql, table } from "../db";
import { owner, ownerOrManager } from "../access";

/**
 * Email letters to members who said yes to them (emailOptIn). Written by
 * owner or manager; only the owner can send. Flow: draft → "Enviar prueba"
 * to yourself → status "Aprobada" sends once to the audience, with a
 * one-click unsubscribe link in every email.
 */
export const Campaigns: CollectionConfig = {
  slug: "campaigns",
  labels: { singular: { es: "Carta por email", en: "Email letter" }, plural: { es: "Cartas por email", en: "Email letters" } },
  admin: { useAsTitle: "subject", defaultColumns: ["subject", "audience", "status", "sentCount", "sentAt"] },
  access: { read: ownerOrManager, create: ownerOrManager, update: ownerOrManager, delete: owner },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, context }) => {
        if (context?.system) return data;
        if (data.sendTestTo && data.sendTestTo !== originalDoc?.sendTestTo && String(data.sendTestTo).toLowerCase() !== String(req.user?.email ?? "").toLowerCase()) {
          throw new Error("La prueba solo se envía a tu propio email.");
        }
        // Two approving saves at once: the row lock lets only one see "draft".
        if (data.status === "approved" && originalDoc?.id && originalDoc.status !== "approved") {
          const rows = await query(req.payload, sql`select status from ${table(req.payload, "campaigns")} where id = ${originalDoc.id} for update`, req);
          if (rows[0]?.status !== "draft") throw new Error("Esta carta ya se envió.");
        }
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
    { name: "subject", type: "text", required: true, maxLength: 120, label: { es: "Asunto", en: "Subject" } },
    { name: "title", type: "text", required: true, maxLength: 120, label: { es: "Titular", en: "Holder" } },
    {
      name: "body",
      type: "textarea",
      required: true,
      label: { es: "Texto", en: "Text" },
      admin: { description: { es: "Párrafos separados por una línea en blanco. Sin exclamaciones ni rayas, como el resto de la marca.", en: "Paragraphs separated by a blank line. No exclamation marks or dashes, like the rest of the brand." } },
    },
    {
      name: "audience",
      type: "select",
      required: true,
      defaultValue: "all",
      label: { es: "Para", en: "For" },
      options: [
        { label: { es: "Todos los que aceptaron cartas", en: "Everyone who accepted letters" }, value: "all" },
        { label: { es: "Solo socios fundadores", en: "Founding members only" }, value: "founding" },
      ],
    },
    {
      name: "locale",
      type: "select",
      required: true,
      defaultValue: "es",
      label: { es: "Idioma de la carta", en: "Menu language" },
      admin: { description: { es: "Se envía a quienes tienen ese idioma en su cuenta.", en: "Sent to everyone with that language on their account." } },
      options: [
        { label: "Español", value: "es" },
        { label: "English", value: "en" },
      ],
    },
    {
      name: "sendTestTo",
      type: "email",
      label: { es: "Enviar prueba a", en: "Send a test to" },
      admin: { description: { es: "Escribe tu email y guarda: llega una prueba. No cuenta como envío.", en: "Enter your email and save: a test arrives. It does not count as a send." } },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      label: { es: "Estado", en: "Status" },
      options: [
        { label: { es: "Borrador", en: "Draft" }, value: "draft" },
        { label: { es: "Aprobada (se envía al guardar)", en: "Approved (sent on save)" }, value: "approved" },
        { label: { es: "Enviada", en: "Sent" }, value: "sent" },
      ],
    },
    { name: "sentCount", type: "number", label: { es: "Enviadas", en: "Sent" }, admin: { readOnly: true } },
    { name: "sentAt", type: "date", label: { es: "Enviada el", en: "Sent on" }, admin: { readOnly: true } },
    { name: "approvedBy", type: "relationship", relationTo: "users", label: { es: "Aprobada por", en: "Approved by" }, admin: { readOnly: true } },
  ],
};

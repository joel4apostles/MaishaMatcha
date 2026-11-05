import { APIError, type CollectionConfig } from "payload";
import { hasRole, canUseBackOffice } from "@/lib/auth/roles";
import { hashPin, pinProblem } from "@/lib/pos/pin";
import { hiddenField, nobody, owner, ownerField } from "../access";
import { changed, writeAudit } from "../audit";
import { integerCents } from "../validators";

/**
 * Staff accounts (never customers). Owner creates, edits and deactivates
 * staff; accounts are never deleted, so history keeps its authors.
 * Baristas cannot open /admin: they sign in on the counter tablet with a PIN.
 */
export const Users: CollectionConfig = {
  slug: "users",
  labels: { singular: "Persona del equipo", plural: "Equipo" },
  auth: {
    tokenExpiration: 60 * 60 * 12,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role", "active"],
  },
  access: {
    admin: ({ req }) => canUseBackOffice(req.user),
    create: owner,
    read: ({ req }) => {
      if (hasRole(req.user, "owner", "manager")) return true;
      if (req.user?.collection === "users") return { id: { equals: req.user.id } };
      return false;
    },
    update: ({ req }) => {
      if (hasRole(req.user, "owner")) return true;
      if (hasRole(req.user, "manager", "barista")) return { id: { equals: req.user!.id } };
      return false;
    },
    delete: nobody,
  },
  fields: [
    { name: "name", type: "text", required: true, label: "Nombre" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "barista",
      label: "Rol",
      access: { create: ownerField, update: ownerField },
      options: [
        { label: "Propietario", value: "owner" },
        { label: "Encargado", value: "manager" },
        { label: "Barista", value: "barista" },
      ],
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      label: "Activo",
      access: { create: ownerField, update: ownerField },
      admin: { description: "Desactiva en lugar de borrar: el historial conserva su nombre." },
    },
    {
      name: "refundLimitCents",
      type: "number",
      defaultValue: 0,
      min: 0,
      validate: integerCents,
      label: "Límite de devolución (céntimos)",
      access: { create: ownerField, update: ownerField },
      admin: {
        description: "Devoluciones por encima de esta cantidad necesitan a un encargado. 500 = 5,00 €.",
      },
    },
    {
      name: "pin",
      type: "text",
      virtual: true,
      label: "Nuevo PIN de barra",
      access: { read: hiddenField },
      admin: {
        description: "De 4 a 6 cifras. Se guarda cifrado; nadie puede leerlo después.",
      },
      validate: (value: string | null | undefined) =>
        !value ? true : (pinProblem(value) ?? true),
    },
    { name: "pinHash", type: "text", hidden: true, access: { read: hiddenField, update: hiddenField, create: hiddenField } },
    { name: "pinFailedCount", type: "number", hidden: true, defaultValue: 0, access: { read: hiddenField, update: hiddenField, create: hiddenField } },
    { name: "pinLockedUntil", type: "date", hidden: true, access: { read: hiddenField, update: hiddenField, create: hiddenField } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        // Nobody can demote or deactivate themselves (no owner lock-out).
        if (operation === "update" && originalDoc && req.user?.id === originalDoc.id) {
          const demoting = data.role !== undefined && data.role !== originalDoc.role;
          const deactivating = data.active === false && originalDoc.active !== false;
          if (demoting || deactivating) {
            throw new APIError(
              "No puedes cambiar tu propio rol ni desactivarte. Pide a otro propietario que lo haga.",
              400,
              null,
              true,
            );
          }
        }
        // The very first account (create-first-user) is the owner.
        if (operation === "create") {
          const { totalDocs } = await req.payload.count({
            collection: "users",
            overrideAccess: true,
            req,
          });
          if (totalDocs === 0) {
            // In production nobody but the named owner can claim the empty
            // database through /admin/create-first-user.
            const allowed = process.env.FIRST_OWNER_EMAIL?.trim().toLowerCase();
            if (process.env.VERCEL && (!allowed || String(data.email ?? "").toLowerCase() !== allowed)) {
              throw new APIError(
                "La primera cuenta solo puede crearla el propietario indicado en FIRST_OWNER_EMAIL.",
                403,
                null,
                true,
              );
            }
            data.role = "owner";
            data.active = true;
          }
        }
        if (typeof data.pin === "string" && data.pin.length > 0) {
          data.pinHash = await hashPin(data.pin);
          data.pinFailedCount = 0;
          data.pinLockedUntil = null;
          // Per document: req.context is shared by every doc in a bulk update.
          const ids = (req.context.pinChangedIds as Set<unknown> | undefined) ?? new Set();
          ids.add(originalDoc?.id);
          req.context.pinChangedIds = ids;
        }
        delete data.pin;
        return data;
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user.active === false) {
          throw new APIError("Esta cuenta está desactivada.", 403, null, true);
        }
        // Password login (admin + REST API) is for owner and manager only.
        // Baristas sign in with their PIN on a registered counter tablet.
        if (!canUseBackOffice(user)) {
          throw new APIError("Los baristas entran con su PIN en la tablet de la barra.", 403, null, true);
        }
        return user;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== "update") return doc;
        const diff = changed(previousDoc, doc, ["role", "active", "refundLimitCents"]);
        if (diff?.after.role !== undefined) {
          await writeAudit(req, { action: "staff.role", entity: "users", entityId: doc.id, ...pick(diff, "role") });
        }
        if (diff?.after.active !== undefined) {
          await writeAudit(req, { action: "staff.active", entity: "users", entityId: doc.id, ...pick(diff, "active") });
        }
        if (diff?.after.refundLimitCents !== undefined) {
          await writeAudit(req, { action: "staff.refund-limit", entity: "users", entityId: doc.id, ...pick(diff, "refundLimitCents") });
        }
        if ((req.context.pinChangedIds as Set<unknown> | undefined)?.has(doc.id)) {
          await writeAudit(req, { action: "staff.pin", entity: "users", entityId: doc.id });
        }
        return doc;
      },
    ],
  },
};

function pick(
  diff: { before: Record<string, unknown>; after: Record<string, unknown> },
  key: string,
) {
  return { before: { [key]: diff.before[key] }, after: { [key]: diff.after[key] } };
}

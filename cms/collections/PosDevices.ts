import type { CollectionConfig } from "payload";
import { hiddenField, nobody, owner } from "../access";

/**
 * Counter tablets the owner has registered once (from /pos/registrar while
 * signed in to /admin). Staff PIN login only works on an active device.
 * Created only by the server action; deactivate to revoke a lost tablet.
 */
export const PosDevices: CollectionConfig = {
  slug: "pos-devices",
  labels: { singular: "Dispositivo de barra", plural: "Dispositivos de barra" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "active", "lastSeenAt", "createdAt"],
    description: "Desactiva un dispositivo perdido para revocarlo al instante.",
  },
  access: { read: owner, create: nobody, update: owner, delete: nobody },
  fields: [
    { name: "name", type: "text", required: true, label: "Nombre" },
    { name: "active", type: "checkbox", defaultValue: true, label: "Activo" },
    {
      name: "tokenHash",
      type: "text",
      required: true,
      unique: true,
      index: true,
      hidden: true,
      access: { read: hiddenField, update: hiddenField },
    },
    {
      name: "registeredBy",
      type: "relationship",
      relationTo: "users",
      label: "Registrado por",
      admin: { readOnly: true },
    },
    { name: "lastSeenAt", type: "date", label: "Último uso", admin: { readOnly: true } },
  ],
};

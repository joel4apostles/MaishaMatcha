import type { CollectionConfig } from "payload";
import { hiddenField, nobody, owner } from "../access";

/**
 * Counter tablets the owner has registered once (from /pos/registrar while
 * signed in to /admin). Staff PIN login only works on an active device.
 * Created only by the server action; deactivate to revoke a lost tablet.
 */
export const PosDevices: CollectionConfig = {
  slug: "pos-devices",
  labels: { singular: { es: "Dispositivo de barra", en: "Bar device" }, plural: { es: "Dispositivos de barra", en: "Bar devices" } },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "active", "lastSeenAt", "createdAt"],
    description: { es: "Desactiva un dispositivo perdido para revocarlo al instante.", en: "Deactivate a lost device to revoke it at once." },
  },
  access: { read: owner, create: nobody, update: owner, delete: nobody },
  fields: [
    { name: "name", type: "text", required: true, label: { es: "Nombre", en: "Name" } },
    { name: "active", type: "checkbox", defaultValue: true, label: { es: "Activo", en: "Active" } },
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
      label: { es: "Registrado por", en: "Recorded by" },
      admin: { readOnly: true },
    },
    { name: "lastSeenAt", type: "date", label: { es: "Último uso", en: "Last used" }, admin: { readOnly: true } },
  ],
};

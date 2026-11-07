import type { CollectionConfig } from "payload";
import { nobody, owner } from "../access";

/**
 * Gap-free counters (invoice series, order labels), advanced with ONE
 * atomic UPDATE ... RETURNING inside the sale's transaction. The row lock
 * this takes also serialises the invoice hash chain: the next sale waits
 * until this one has committed its fingerprint.
 */
export const Sequences: CollectionConfig = {
  slug: "sequences",
  labels: { singular: { es: "Secuencia", en: "Sequence" }, plural: { es: "Secuencias", en: "Sequences" } },
  admin: { useAsTitle: "key", hidden: true },
  access: { read: owner, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: "key", type: "text", required: true, unique: true, index: true },
    { name: "value", type: "number", required: true, defaultValue: 0 },
    { name: "lastHash", type: "text" },
  ],
};

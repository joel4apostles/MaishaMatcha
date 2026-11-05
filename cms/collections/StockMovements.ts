import type { CollectionConfig, PayloadRequest } from "payload";
import { anyStaff, nobody } from "../access";
import { writeAudit } from "../audit";
import { query, sql, table } from "../db";

const NEEDS_REASON = new Set(["waste", "adjustment"]);

/**
 * Append-only stock ledger. Each movement adds its delta to the item's cached
 * stock with ONE atomic SQL increment inside the request's transaction, so
 * concurrent sales cannot overwrite each other and a failed request leaves
 * neither the movement nor the stock change behind. Corrections are new
 * movements; nothing is edited or deleted.
 */
export const StockMovements: CollectionConfig = {
  slug: "stock-movements",
  labels: { singular: "Movimiento", plural: "Movimientos de stock" },
  admin: {
    defaultColumns: ["item", "delta", "reason", "createdBy", "createdAt"],
    description: "Solo se añaden: una corrección es un movimiento nuevo.",
  },
  defaultSort: "-createdAt",
  access: { read: anyStaff, create: anyStaff, update: nobody, delete: nobody },
  fields: [
    {
      name: "item",
      type: "relationship",
      relationTo: "inventory-items",
      required: true,
      label: "Ingrediente",
    },
    {
      name: "delta",
      type: "number",
      required: true,
      label: "Cantidad",
      admin: { description: "+ entra stock, − sale stock (en la unidad del ingrediente)." },
      validate: (v: number | null | undefined) =>
        typeof v === "number" && Number.isFinite(v) && v !== 0 ? true : "Indica una cantidad distinta de cero.",
    },
    {
      name: "reason",
      type: "select",
      required: true,
      label: "Motivo",
      options: [
        { label: "Compra", value: "purchase" },
        { label: "Venta", value: "sale" },
        { label: "Consumo", value: "usage" },
        { label: "Merma", value: "waste" },
        { label: "Recuento", value: "count" },
        { label: "Ajuste", value: "adjustment" },
      ],
    },
    {
      name: "note",
      type: "text",
      label: "Nota",
      validate: (v: string | null | undefined, { siblingData }: { siblingData: { reason?: string } }) =>
        NEEDS_REASON.has(siblingData?.reason ?? "") && !v?.trim()
          ? "Explica el motivo de la merma o del ajuste."
          : true,
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      label: "Registrado por",
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === "create" && req.user?.collection === "users") {
          data.createdBy = req.user.id;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== "create") return doc;
        const itemId = typeof doc.item === "object" ? doc.item.id : doc.item;
        await incrementStock(req, itemId, doc.delta);
        if (doc.reason === "waste" || doc.reason === "adjustment") {
          await writeAudit(req, {
            action: doc.reason === "waste" ? "stock.waste" : "stock.adjustment",
            entity: "stock-movements",
            entityId: doc.id,
            reason: doc.note,
            after: { item: itemId, delta: doc.delta },
          });
        }
        return doc;
      },
    ],
  },
};

/** stock = stock + delta, as one statement, on the request's transaction. */
async function incrementStock(req: PayloadRequest, itemId: number | string, delta: number) {
  const items = table(req.payload, "inventory_items");
  await query(
    req.payload,
    sql`update ${items} set stock = coalesce(stock, 0) + ${delta} where id = ${itemId}`,
    req,
  );
}

import type { CollectionConfig } from "payload";
import { anyStaff, nobody, ownerOrManager } from "../access";

/**
 * Bill of materials: what one unit of a drink, or one choice of an option,
 * takes from inventory. Every paid sale deducts these from stock. A line
 * marked "usa los gramos medidos" deducts the barista's measured grams for
 * that sale instead of the fixed quantity (the founder's counter flow).
 */
export const RecipeLines: CollectionConfig = {
  slug: "recipe-lines",
  labels: { singular: "Línea de receta", plural: "Recetas" },
  admin: {
    defaultColumns: ["target", "ingredient", "quantity", "usesMeasuredGrams"],
    description: "Qué gasta cada bebida y cada opción. Cada venta lo descuenta del inventario.",
  },
  access: { read: anyStaff, create: ownerOrManager, update: ownerOrManager, delete: ownerOrManager },
  fields: [
    {
      name: "target",
      type: "relationship",
      relationTo: ["menu-items", "modifiers"],
      required: true,
      label: "Bebida u opción",
    },
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: "Ingrediente" },
    {
      name: "quantity",
      type: "number",
      required: true,
      min: 0,
      label: "Cantidad por unidad",
      admin: { description: "En la unidad del ingrediente (g, ml, uds)." },
    },
    {
      name: "usesMeasuredGrams",
      type: "checkbox",
      defaultValue: false,
      label: "Usa los gramos medidos",
      admin: { description: "Para el matcha: descuenta lo que el barista pesó en esa venta." },
    },
  ],
};

export const StockCounts: CollectionConfig = {
  slug: "stock-counts",
  labels: { singular: "Recuento", plural: "Recuentos" },
  admin: {
    defaultColumns: ["ingredient", "countedQuantity", "difference", "createdAt"],
    description: "Escribe lo que hay de verdad: el sistema crea el ajuste por la diferencia.",
  },
  defaultSort: "-createdAt",
  access: { read: anyStaff, create: anyStaff, update: nobody, delete: nobody },
  fields: [
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: "Ingrediente" },
    { name: "countedQuantity", type: "number", required: true, min: 0, label: "Cantidad contada" },
    { name: "difference", type: "number", label: "Diferencia", admin: { readOnly: true } },
    { name: "note", type: "text", label: "Nota" },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        const ingredientId = typeof data.ingredient === "object" ? data.ingredient.id : data.ingredient;
        const item = await req.payload.findByID({ collection: "inventory-items", id: ingredientId, req, depth: 0, overrideAccess: true });
        data.difference = Math.round(((data.countedQuantity ?? 0) - (item.stock ?? 0)) * 1000) / 1000;
        return data;
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== "create" || !doc.difference) return doc;
        const ingredientId = typeof doc.ingredient === "object" ? doc.ingredient.id : doc.ingredient;
        await req.payload.create({
          collection: "stock-movements",
          req,
          overrideAccess: true,
          user: req.user,
          data: { item: ingredientId, delta: doc.difference, reason: "count", note: doc.note || "Recuento" },
        });
        return doc;
      },
    ],
  },
};

export const Batches: CollectionConfig = {
  slug: "batches",
  labels: { singular: "Lote", plural: "Lotes" },
  admin: {
    defaultColumns: ["ingredient", "lot", "quantity", "expiresOn"],
    description: "Lotes recibidos de perecederos, con su caducidad.",
  },
  defaultSort: "expiresOn",
  access: { read: anyStaff, create: ownerOrManager, update: ownerOrManager, delete: nobody },
  fields: [
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: "Ingrediente" },
    { name: "lot", type: "text", label: "Lote" },
    { name: "quantity", type: "number", required: true, min: 0, label: "Cantidad recibida" },
    { name: "expiresOn", type: "date", label: "Caduca", admin: { date: { pickerAppearance: "dayOnly" } } },
    { name: "purchaseOrder", type: "relationship", relationTo: "purchase-orders", label: "Pedido a proveedor" },
  ],
};

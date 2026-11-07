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
  labels: { singular: { es: "Línea de receta", en: "Recipe line" }, plural: { es: "Recetas", en: "Recipes" } },
  admin: {
    defaultColumns: ["target", "ingredient", "quantity", "usesMeasuredGrams"],
    description: { es: "Qué gasta cada bebida y cada opción. Cada venta lo descuenta del inventario.", en: "What each drink and option uses. Every sale deducts it from the inventory." },
  },
  access: { read: anyStaff, create: ownerOrManager, update: ownerOrManager, delete: ownerOrManager },
  fields: [
    {
      name: "target",
      type: "relationship",
      relationTo: ["menu-items", "modifiers"],
      required: true,
      label: { es: "Bebida u opción", en: "Drink or option" },
    },
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: { es: "Ingrediente", en: "Ingredient" } },
    {
      name: "quantity",
      type: "number",
      required: true,
      min: 0,
      label: { es: "Cantidad por unidad", en: "Quantity per unit" },
      admin: { description: { es: "En la unidad del ingrediente (g, ml, uds).", en: "In the ingredient's unit (g, ml, units)." } },
    },
    {
      name: "usesMeasuredGrams",
      type: "checkbox",
      defaultValue: false,
      label: { es: "Usa los gramos medidos", en: "Use the measured grams" },
      admin: { description: { es: "Para el matcha: descuenta lo que el barista pesó en esa venta.", en: "For matcha: deducts what the barista weighed in that sale." } },
    },
  ],
};

export const StockCounts: CollectionConfig = {
  slug: "stock-counts",
  labels: { singular: { es: "Recuento", en: "Count" }, plural: { es: "Recuentos", en: "Stock counts" } },
  admin: {
    defaultColumns: ["ingredient", "countedQuantity", "difference", "createdAt"],
    description: { es: "Escribe lo que hay de verdad: el sistema crea el ajuste por la diferencia.", en: "Enter what is really there: the system creates the adjustment for the difference." },
  },
  defaultSort: "-createdAt",
  access: { read: anyStaff, create: anyStaff, update: nobody, delete: nobody },
  fields: [
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: { es: "Ingrediente", en: "Ingredient" } },
    { name: "countedQuantity", type: "number", required: true, min: 0, label: { es: "Cantidad contada", en: "Counted quantity" } },
    { name: "difference", type: "number", label: { es: "Diferencia", en: "Difference" }, admin: { readOnly: true } },
    { name: "note", type: "text", label: { es: "Nota", en: "Note" } },
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
  labels: { singular: { es: "Lote", en: "Batch" }, plural: { es: "Lotes", en: "Batches" } },
  admin: {
    defaultColumns: ["ingredient", "lot", "quantity", "expiresOn"],
    description: { es: "Lotes recibidos de perecederos, con su caducidad.", en: "Perishable batches received, with their expiry." },
  },
  defaultSort: "expiresOn",
  access: { read: anyStaff, create: ownerOrManager, update: ownerOrManager, delete: nobody },
  fields: [
    { name: "ingredient", type: "relationship", relationTo: "inventory-items", required: true, label: { es: "Ingrediente", en: "Ingredient" } },
    { name: "lot", type: "text", label: { es: "Lote", en: "Batch" } },
    { name: "quantity", type: "number", required: true, min: 0, label: { es: "Cantidad recibida", en: "Quantity received" } },
    { name: "expiresOn", type: "date", label: { es: "Caduca", en: "Expires" }, admin: { date: { pickerAppearance: "dayOnly" } } },
    { name: "purchaseOrder", type: "relationship", relationTo: "purchase-orders", label: { es: "Pedido a proveedor", en: "Supplier order" } },
  ],
};

import type { GlobalConfig } from "payload";
import { hasRole } from "@/lib/auth/roles";

/**
 * The business details printed on every ticket and used for VERI*FACTU.
 * Owner only. Until NIF and legal name are filled in, tickets say so.
 */
export const Business: GlobalConfig = {
  slug: "business",
  label: { es: "Empresa", en: "Company" },
  admin: { group: "Control" },
  access: {
    read: ({ req }) => hasRole(req.user, "owner", "manager", "barista"),
    update: ({ req }) => hasRole(req.user, "owner"),
  },
  fields: [
    { name: "legalName", type: "text", label: { es: "Razón social", en: "Company name" } },
    { name: "tradeName", type: "text", label: { es: "Nombre comercial", en: "Trade name" }, defaultValue: "maisha matcha" },
    { name: "nif", type: "text", label: { es: "NIF", en: "Tax ID (NIF)" } },
    { name: "address", type: "text", label: { es: "Dirección fiscal", en: "Tax address" }, defaultValue: "Plaza Cetina, 3, Murcia" },
    {
      name: "invoiceSeries",
      type: "text",
      label: { es: "Serie de tickets", en: "Receipt series" },
      defaultValue: "T",
      admin: { description: { es: "Prefijo de las facturas simplificadas. Cámbialo solo con tu gestor.", en: "Prefix for simplified invoices. Change it only with your accountant." } },
    },
    {
      name: "fullInvoiceSeries",
      type: "text",
      label: { es: "Serie de facturas completas", en: "Full invoice series" },
      defaultValue: "F",
      admin: { description: { es: "Prefijo de las facturas completas (con NIF del cliente). Cámbialo solo con tu gestor.", en: "Prefix for full invoices (with the customer's tax ID). Change it only with your accountant." } },
    },
    { name: "receiptFooter", type: "textarea", label: { es: "Pie del ticket", en: "Receipt footer" }, localized: true },
    {
      type: "collapsible",
      label: { es: "Pedidos online", en: "Online orders" },
      fields: [
        {
          name: "onlineOrdering",
          type: "checkbox",
          defaultValue: false,
          label: { es: "Aceptar pedidos online", en: "Accept online orders" },
          admin: { description: { es: "Apagado: la web dice que los pedidos online llegan pronto.", en: "Off: the website says online ordering is coming soon." } },
        },
        {
          type: "row",
          fields: [
            { name: "openingTime", type: "text", defaultValue: "08:00", label: { es: "Abre", en: "Opens" }, admin: { description: "HH:MM" } },
            { name: "closingTime", type: "text", defaultValue: "18:00", label: { es: "Cierra", en: "Closes" }, admin: { description: "HH:MM" } },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "tableOrdering",
              type: "checkbox",
              defaultValue: false,
              label: { es: "Pedidos desde la mesa (QR)", en: "Table ordering (QR)" },
              admin: { description: { es: "Cada mesa tiene su QR (imprímelos en la barra: Mesas). Funciona en horario de apertura.", en: "Each table has its own QR (print them at the bar: Mesas). Works during opening hours." } },
            },
            { name: "tableCount", type: "number", min: 1, max: 60, defaultValue: 8, label: { es: "Número de mesas", en: "Number of tables" } },
          ],
        },
        {
          name: "openDays",
          type: "select",
          hasMany: true,
          label: { es: "Días abiertos", en: "Open days" },
          defaultValue: ["tue", "wed", "thu", "fri", "sat", "sun"],
          options: [
            { label: { es: "Lunes", en: "Monday" }, value: "mon" },
            { label: { es: "Martes", en: "Tuesday" }, value: "tue" },
            { label: { es: "Miércoles", en: "Wednesday" }, value: "wed" },
            { label: { es: "Jueves", en: "Thursday" }, value: "thu" },
            { label: { es: "Viernes", en: "Friday" }, value: "fri" },
            { label: { es: "Sábado", en: "Saturday" }, value: "sat" },
            { label: { es: "Domingo", en: "Sunday" }, value: "sun" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "slotMinutes", type: "number", defaultValue: 15, min: 5, max: 60, label: { es: "Minutos por franja", en: "Minutes per slot" } },
            { name: "slotCapacity", type: "number", defaultValue: 6, min: 1, max: 100, label: { es: "Pedidos por franja", en: "Orders per slot" } },
            { name: "leadMinutes", type: "number", defaultValue: 15, min: 0, max: 240, label: { es: "Antelación mínima (min)", en: "Minimum notice (min)" } },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: { es: "Socios fundadores", en: "Founding members" },
      fields: [
        {
          name: "foundingOpen",
          type: "checkbox",
          defaultValue: false,
          label: { es: "Abrir la membresía fundadora en la web", en: "Open the founding membership on the website" },
          admin: { description: { es: "Necesita precio, IVA y Stripe configurado. Se cierra sola al llegar al límite.", en: "Needs a price, VAT and Stripe set up. Closes itself when the limit is reached." } },
        },
        {
          type: "row",
          fields: [
            { name: "foundingPriceCents", type: "number", min: 100, label: { es: "Precio (céntimos, IVA incluido)", en: "Price (cents, VAT included)" } },
            { name: "foundingCap", type: "number", min: 1, defaultValue: 50, label: { es: "Plazas", en: "Seats" } },
            { name: "foundingTaxRate", type: "relationship", relationTo: "tax-rates", label: { es: "IVA de la cuota", en: "VAT on the fee" } },
          ],
        },
        { name: "foundingPerks", type: "textarea", localized: true, label: { es: "Qué incluye (una línea por ventaja)", en: "What it includes (one line per benefit)" } },
      ],
    },
    {
      type: "collapsible",
      label: { es: "Suscripción premium", en: "Monthly subscription" },
      fields: [
        {
          name: "premiumOpen",
          type: "checkbox",
          defaultValue: false,
          label: { es: "Abrir la suscripción premium en la web", en: "Open the monthly subscription on the website" },
          admin: { description: { es: "Mensual, con Stripe. Necesita precio, IVA y Stripe configurado.", en: "Monthly, with Stripe. Needs a price, VAT and Stripe set up." } },
        },
        {
          type: "row",
          fields: [
            { name: "premiumMonthlyCents", type: "number", min: 100, label: { es: "Precio al mes (céntimos, IVA incluido)", en: "Monthly price (cents, VAT included)" } },
            {
              name: "premiumFoundingMonthlyCents",
              type: "number",
              min: 100,
              label: { es: "Precio fundador al mes (céntimos)", en: "Founding monthly price (cents)" },
              admin: { description: { es: "El precio que se prometió a los socios fundadores. Vacío = el mismo.", en: "The price promised to founding members. Empty = the same." } },
            },
            { name: "premiumTaxRate", type: "relationship", relationTo: "tax-rates", label: { es: "IVA de la cuota", en: "VAT on the fee" } },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "premiumProduct",
              type: "relationship",
              relationTo: "menu-items",
              label: { es: "Producto de la caja mensual", en: "Monthly box product" },
              filterOptions: { "category.shop": { equals: true } },
              admin: {
                description: {
                  es: "La lata (de la Tienda) que cada suscriptor recibe cada mes. Se descuenta una unidad por caja. Vacío = la cuota no incluye producto.",
                  en: "The tin (from the Shop) every subscriber gets each month. One unit is taken per box. Empty = the fee includes no product.",
                },
              },
            },
            {
              name: "premiumShippingCents",
              type: "number",
              min: 0,
              label: { es: "Envío a casa al mes (céntimos, IVA incluido)", en: "Home delivery per month (cents, VAT included)" },
              admin: {
                description: {
                  es: "Vacío = solo recogida en el salón. Solo direcciones en España; las etiquetas las compras tú (Correos u otro).",
                  en: "Empty = pickup at the salon only. Addresses in Spain only; you buy the labels (Correos or another).",
                },
              },
            },
          ],
        },
        { name: "premiumPerks", type: "textarea", localized: true, label: { es: "Qué incluye (una línea por ventaja)", en: "What it includes (one line per benefit)" } },
      ],
    },
    {
      name: "targetMarginPercent",
      type: "number",
      min: 0,
      max: 100,
      defaultValue: 65,
      label: { es: "Margen objetivo (%)", en: "Target margin (%)" },
      admin: { description: { es: "Avisa de las bebidas cuyo margen baje de aquí.", en: "Flags drinks whose margin drops below this." } },
    },
  ],
};

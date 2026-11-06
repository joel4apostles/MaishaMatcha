import type { GlobalConfig } from "payload";
import { hasRole } from "@/lib/auth/roles";

/**
 * The business details printed on every ticket and used for VERI*FACTU.
 * Owner only. Until NIF and legal name are filled in, tickets say so.
 */
export const Business: GlobalConfig = {
  slug: "business",
  label: "Empresa",
  admin: { group: "Control" },
  access: {
    read: ({ req }) => hasRole(req.user, "owner", "manager", "barista"),
    update: ({ req }) => hasRole(req.user, "owner"),
  },
  fields: [
    { name: "legalName", type: "text", label: "Razón social" },
    { name: "tradeName", type: "text", label: "Nombre comercial", defaultValue: "maisha matcha" },
    { name: "nif", type: "text", label: "NIF" },
    { name: "address", type: "text", label: "Dirección fiscal", defaultValue: "Plaza Cetina, 3, Murcia" },
    {
      name: "invoiceSeries",
      type: "text",
      label: "Serie de tickets",
      defaultValue: "T",
      admin: { description: "Prefijo de las facturas simplificadas. Cámbialo solo con tu gestor." },
    },
    {
      name: "fullInvoiceSeries",
      type: "text",
      label: "Serie de facturas completas",
      defaultValue: "F",
      admin: { description: "Prefijo de las facturas completas (con NIF del cliente). Cámbialo solo con tu gestor." },
    },
    { name: "receiptFooter", type: "textarea", label: "Pie del ticket", localized: true },
    {
      type: "collapsible",
      label: "Pedidos online",
      fields: [
        {
          name: "onlineOrdering",
          type: "checkbox",
          defaultValue: false,
          label: "Aceptar pedidos online",
          admin: { description: "Apagado: la web dice que los pedidos online llegan pronto." },
        },
        {
          type: "row",
          fields: [
            { name: "openingTime", type: "text", defaultValue: "08:00", label: "Abre", admin: { description: "HH:MM" } },
            { name: "closingTime", type: "text", defaultValue: "18:00", label: "Cierra", admin: { description: "HH:MM" } },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "tableOrdering",
              type: "checkbox",
              defaultValue: false,
              label: "Pedidos desde la mesa (QR)",
              admin: { description: "Cada mesa tiene su QR (imprímelos en la barra: Mesas). Funciona en horario de apertura." },
            },
            { name: "tableCount", type: "number", min: 1, max: 60, defaultValue: 8, label: "Número de mesas" },
          ],
        },
        {
          name: "openDays",
          type: "select",
          hasMany: true,
          label: "Días abiertos",
          defaultValue: ["tue", "wed", "thu", "fri", "sat", "sun"],
          options: [
            { label: "Lunes", value: "mon" },
            { label: "Martes", value: "tue" },
            { label: "Miércoles", value: "wed" },
            { label: "Jueves", value: "thu" },
            { label: "Viernes", value: "fri" },
            { label: "Sábado", value: "sat" },
            { label: "Domingo", value: "sun" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "slotMinutes", type: "number", defaultValue: 15, min: 5, max: 60, label: "Minutos por franja" },
            { name: "slotCapacity", type: "number", defaultValue: 6, min: 1, max: 100, label: "Pedidos por franja" },
            { name: "leadMinutes", type: "number", defaultValue: 15, min: 0, max: 240, label: "Antelación mínima (min)" },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Socios fundadores",
      fields: [
        {
          name: "foundingOpen",
          type: "checkbox",
          defaultValue: false,
          label: "Abrir la membresía fundadora en la web",
          admin: { description: "Necesita precio, IVA y Stripe configurado. Se cierra sola al llegar al límite." },
        },
        {
          type: "row",
          fields: [
            { name: "foundingPriceCents", type: "number", min: 100, label: "Precio (céntimos, IVA incluido)" },
            { name: "foundingCap", type: "number", min: 1, defaultValue: 50, label: "Plazas" },
            { name: "foundingTaxRate", type: "relationship", relationTo: "tax-rates", label: "IVA de la cuota" },
          ],
        },
        { name: "foundingPerks", type: "textarea", localized: true, label: "Qué incluye (una línea por ventaja)" },
      ],
    },
    {
      type: "collapsible",
      label: "Suscripción premium",
      fields: [
        {
          name: "premiumOpen",
          type: "checkbox",
          defaultValue: false,
          label: "Abrir la suscripción premium en la web",
          admin: { description: "Mensual, con Stripe. Necesita precio, IVA y Stripe configurado." },
        },
        {
          type: "row",
          fields: [
            { name: "premiumMonthlyCents", type: "number", min: 100, label: "Precio al mes (céntimos, IVA incluido)" },
            {
              name: "premiumFoundingMonthlyCents",
              type: "number",
              min: 100,
              label: "Precio fundador al mes (céntimos)",
              admin: { description: "El precio que se prometió a los socios fundadores. Vacío = el mismo." },
            },
            { name: "premiumTaxRate", type: "relationship", relationTo: "tax-rates", label: "IVA de la cuota" },
          ],
        },
        { name: "premiumPerks", type: "textarea", localized: true, label: "Qué incluye (una línea por ventaja)" },
      ],
    },
    {
      name: "targetMarginPercent",
      type: "number",
      min: 0,
      max: 100,
      defaultValue: 65,
      label: "Margen objetivo (%)",
      admin: { description: "Avisa de las bebidas cuyo margen baje de aquí." },
    },
  ],
};

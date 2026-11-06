/**
 * Admin home logic, kept pure so it can be tested: the launch checklist
 * and the short description of each collection on the dashboard.
 */

export type SetupInput = {
  legalName?: string | null;
  nif?: string | null;
  stripe: boolean;
  email: boolean;
  shopProducts: number;
  foundingReady: boolean;
  upcomingEvents: number;
  onlineOrdering: boolean;
};

export type SetupStep = { key: string; label: string; hint: string; done: boolean; href?: string };

const EMPRESA = "/admin/globals/business";

/** What must be true before the salon opens online, in the order to do it. */
export function setupSteps(s: SetupInput): SetupStep[] {
  return [
    { key: "company", label: "Datos de la empresa", hint: "Razón social y NIF, para tickets y facturas.", done: Boolean(s.legalName?.trim() && s.nif?.trim()), href: EMPRESA },
    { key: "cards", label: "Pago con tarjeta", hint: "Claves de Stripe en Vercel (las añade quien lleva la web).", done: s.stripe },
    { key: "email", label: "Correo", hint: "Clave de Resend en Vercel, para confirmaciones y cartas.", done: s.email },
    { key: "shop", label: "Productos en la tienda", hint: "Al menos uno, con foto, precio y unidades.", done: s.shopProducts > 0, href: "/admin/collections/menu-items" },
    { key: "founding", label: "Socios fundadores", hint: "Precio, IVA, plazas y el interruptor en Empresa.", done: s.foundingReady, href: EMPRESA },
    { key: "events", label: "Un evento con fecha", hint: "Fecha y plazas, para poder reservar.", done: s.upcomingEvents > 0, href: "/admin/collections/events" },
    { key: "online", label: "Pedidos online", hint: "El interruptor en Empresa, cuando la barra esté lista.", done: s.onlineOrdering, href: EMPRESA },
  ];
}

/** One line under each collection name: what it is for, in the salon's words. */
export const COLLECTION_NOTES: Record<string, string> = {
  orders: "Cada venta: barra, web y mesa",
  payments: "Cobros por método",
  refunds: "Devoluciones hechas",
  shifts: "Aperturas y cierres de caja",
  "pos-devices": "Tablets registradas",
  "menu-items": "Bebidas, mochis y productos de la tienda",
  "menu-categories": "Secciones de la carta y la tienda",
  "modifier-groups": "Preparación, leches, extras",
  modifiers: "Cada opción y su precio",
  "tax-rates": "Tipos de IVA",
  "inventory-items": "Ingredientes y su stock",
  "recipe-lines": "Gramos por bebida",
  "stock-movements": "Cada entrada y salida",
  "stock-counts": "Recuentos de inventario",
  batches: "Lotes y caducidades",
  "purchase-orders": "Borradores, aprobados y recibidos",
  suppliers: "Contacto y correo para pedidos",
  "supplier-products": "Qué vende cada proveedor",
  members: "Clientes con cuenta y socios",
  rsvps: "Reservas de eventos",
  users: "Equipo y permisos",
  events: "Fechas, plazas y fotos",
  campaigns: "Borradores y enviadas",
  "story-chapters": "Capítulos de la historia",
  media: "Fotos",
  invoices: "Tickets y facturas emitidos",
  "audit-log": "Quién hizo qué",
  sequences: "Numeración de facturas",
  business: "Empresa, horarios, interruptores",
};

/** Opened rarely: listed under "Más" so the daily ones stand out. */
export const SECONDARY = new Set([
  "payments",
  "pos-devices",
  "modifiers",
  "tax-rates",
  "recipe-lines",
  "stock-movements",
  "batches",
  "supplier-products",
  "story-chapters",
  "audit-log",
  "sequences",
]);

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

export type Lang = "es" | "en";
export type SetupStep = { key: string; label: string; hint: string; done: boolean; href?: string };

const EMPRESA = "/admin/globals/business";

/** What must be true before the salon opens online, in the order to do it. */
export function setupSteps(s: SetupInput, lang: Lang = "es"): SetupStep[] {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  return [
    { key: "company", label: L("Datos de la empresa", "Company details"), hint: L("Razón social y NIF, para tickets y facturas.", "Company name and tax ID, for receipts and invoices."), done: Boolean(s.legalName?.trim() && s.nif?.trim()), href: EMPRESA },
    { key: "cards", label: L("Pago con tarjeta", "Card payments"), hint: L("Claves de Stripe en Vercel (las añade quien lleva la web).", "Stripe keys in Vercel (added by whoever runs the website)."), done: s.stripe },
    { key: "email", label: L("Correo", "Email"), hint: L("Clave de Resend en Vercel, para confirmaciones y cartas.", "Resend key in Vercel, for confirmations and letters."), done: s.email },
    { key: "shop", label: L("Productos en la tienda", "Shop products"), hint: L("Al menos uno, con foto, precio y unidades.", "At least one, with photo, price and units."), done: s.shopProducts > 0, href: "/admin/collections/menu-items" },
    { key: "founding", label: L("Socios fundadores", "Founding members"), hint: L("Precio, IVA, plazas y el interruptor en Empresa.", "Price, VAT, places and the switch in Company."), done: s.foundingReady, href: EMPRESA },
    { key: "events", label: L("Un evento con fecha", "An event with a date"), hint: L("Fecha y plazas, para poder reservar.", "Date and seats, so people can book."), done: s.upcomingEvents > 0, href: "/admin/collections/events" },
    { key: "online", label: L("Pedidos online", "Online orders"), hint: L("El interruptor en Empresa, cuando la barra esté lista.", "The switch in Company, when the bar is ready."), done: s.onlineOrdering, href: EMPRESA },
  ];
}

/** One line under each collection name: what it is for, in the salon's words. */
export const COLLECTION_NOTES_EN: Record<string, string> = {
  "orders": "Every sale: bar, web and table",
  "payments": "Payments by method",
  "refunds": "Refunds made",
  "shifts": "Till openings and closings",
  "pos-devices": "Registered tablets",
  "menu-items": "Drinks, mochis and shop products",
  "menu-categories": "Menu and shop sections",
  "modifier-groups": "Preparation, milks, extras",
  "modifiers": "Each option and its price",
  "tax-rates": "VAT rates",
  "inventory-items": "Ingredients and their stock",
  "recipe-lines": "Grams per drink",
  "stock-movements": "Every stock in and out",
  "stock-counts": "Inventory counts",
  "batches": "Batches and expiry",
  "purchase-orders": "Drafts, approved and received",
  "suppliers": "Contact and ordering email",
  "supplier-products": "What each supplier sells",
  "members": "Customers with an account and members",
  "rsvps": "Event bookings",
  "users": "Team and permissions",
  "events": "Dates, seats and photos",
  "campaigns": "Drafts and sent",
  "story-chapters": "Story chapters",
  "media": "Photos",
  "invoices": "Receipts and invoices issued",
  "audit-log": "Who did what",
  "sequences": "Invoice numbering",
  "business": "Company, hours, switches"
};

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

/** The dashboard's own words, per admin language. */
export const DASH = {
  es: {
    today: "Hoy", quick: "Accesos rápidos", openBar: "Abrir la caja", newProduct: "Nuevo producto", newEvent: "Nuevo evento", newLetter: "Nueva carta", seeSite: "Ver la web",
    sales: "Ventas", orders: "Pedidos", avg: "Ticket medio", onShift: "En turno", nobody: "Nadie", weekAgo: "Hace una semana", refunds: "Devoluciones",
    setup: "Para abrir", next: "Siguiente", of: "de", stepsDone: "Pasos hechos", done: "hecho", todo: "pendiente",
    pending: "Necesita tu atención", nothing: "Nada pendiente. Todo en orden.", salesToday: "Ventas de hoy", noSales: "Sin ventas todavía.",
    accountant: "Para la gestoría", invoicesCsv: "facturas del mes (CSV)", vatCsv: "IVA del mes (CSV)", all: "Todo", more: "Más",
    webOrders: (n: number) => `${n} ${n === 1 ? "pedido web o de mesa" : "pedidos web o de mesa"} por preparar`,
    refundFlags: (n: number) => `${n} ${n === 1 ? "pago marcado" : "pagos marcados"} DEVOLVER: devuélvelo en Stripe y marca el pedido como devuelto`,
    po: (label: string, supplier: string, total: string) => `Pedido ${label} a ${supplier} por aprobar · ${total}`,
    letters: (n: number) => `${n} ${n === 1 ? "carta" : "cartas"} por email en borrador`,
    boxesShip: (n: number) => `${n} ${n === 1 ? "caja de suscriptor" : "cajas de suscriptores"} por enviar`,
    boxesPickup: (n: number) => `${n} ${n === 1 ? "caja" : "cajas"} esperando en la barra`,
    filling: (title: string, taken: number, cap: number) => (taken >= cap ? `${title}: completo (${cap} plazas)` : `${title}: ${taken} de ${cap} plazas reservadas`),
    low: "Stock bajo", expiring: "Caduca pronto", margin: "Margen bajo",
    channel: { counter: "Barra", online: "Web", table: "Mesa" } as Record<string, string>,
    method: { cash: "Efectivo", card_terminal: "Tarjeta (datáfono)", card_stripe: "Tarjeta (Stripe)", online: "Online" } as Record<string, string>,
  },
  en: {
    today: "Today", quick: "Quick actions", openBar: "Open the till", newProduct: "New product", newEvent: "New event", newLetter: "New letter", seeSite: "See the website",
    sales: "Sales", orders: "Orders", avg: "Average ticket", onShift: "On shift", nobody: "Nobody", weekAgo: "A week ago", refunds: "Refunds",
    setup: "Before opening", next: "Next", of: "of", stepsDone: "Steps done", done: "done", todo: "to do",
    pending: "Waiting on you", nothing: "Nothing waiting. All in order.", salesToday: "Sales today", noSales: "No sales yet.",
    accountant: "For the accountant", invoicesCsv: "this month's invoices (CSV)", vatCsv: "this month's VAT (CSV)", all: "Everything", more: "More",
    webOrders: (n: number) => `${n} web or table ${n === 1 ? "order" : "orders"} to prepare`,
    refundFlags: (n: number) => `${n} ${n === 1 ? "payment" : "payments"} flagged DEVOLVER: refund in Stripe and mark the order refunded`,
    po: (label: string, supplier: string, total: string) => `Order ${label} to ${supplier} awaiting approval · ${total}`,
    letters: (n: number) => `${n} email ${n === 1 ? "letter" : "letters"} in draft`,
    boxesShip: (n: number) => `${n} subscriber ${n === 1 ? "box" : "boxes"} to post`,
    boxesPickup: (n: number) => `${n} ${n === 1 ? "box" : "boxes"} waiting at the bar`,
    filling: (title: string, taken: number, cap: number) => (taken >= cap ? `${title}: full (${cap} seats)` : `${title}: ${taken} of ${cap} seats booked`),
    low: "Low stock", expiring: "Expires soon", margin: "Low margin",
    channel: { counter: "Bar", online: "Web", table: "Table" } as Record<string, string>,
    method: { cash: "Cash", card_terminal: "Card (terminal)", card_stripe: "Card (Stripe)", online: "Online" } as Record<string, string>,
  },
} as const;

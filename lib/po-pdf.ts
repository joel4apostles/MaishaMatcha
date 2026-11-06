import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * A clean A4 purchase order (Spanish and English labels: suppliers are in
 * the Netherlands and Japan). Brand colours, hairlines, no decoration.
 * Standard PDF fonts only (no network, no embedding); text outside their
 * character set is transliterated rather than breaking the file.
 */
export type PoPdfInput = {
  label: string;
  date: Date;
  business: { name: string; legalName?: string | null; nif?: string | null; address?: string | null; email?: string | null };
  supplier: { name: string; contactName?: string | null; email: string; country?: string | null };
  lines: { name: string; packs: number; packSize: number; unit: string; unitPriceCents?: number | null }[];
  note?: string | null;
};

const SUMI = rgb(0x1c / 255, 0x1b / 255, 0x18 / 255);
const MUTED = rgb(0.42, 0.41, 0.38);
const WOOD = rgb(0xb0 / 255, 0x8d / 255, 0x57 / 255);

// WinAnsi covers Spanish and most European text; anything else is simplified.
const safe = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E -ÿ€]/g, (c) => c.normalize("NFD").replace(/[^\x20-\x7E]/g, "") || "?");

const euro = (cents: number) =>
  `${(cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export async function purchaseOrderPdf(po: PoPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Pedido ${po.label}`);
  doc.setProducer("maisha matcha");
  const page = doc.addPage([595.28, 841.89]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const M = 56;
  const W = page.getWidth() - 2 * M;
  let y = page.getHeight() - M;

  const text = (s: string, x: number, size = 10, font = regular, color = SUMI) => page.drawText(safe(s), { x, y, size, font, color });
  const right = (s: string, xRight: number, size = 10, font = regular, color = SUMI) =>
    page.drawText(safe(s), { x: xRight - font.widthOfTextAtSize(safe(s), size), y, size, font, color });
  const rule = (color = WOOD, thickness = 0.5) => page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness, color });

  // Header: who orders, and the order itself.
  text(po.business.name.toLowerCase(), M, 13, bold, rgb(0x78 / 255, 0x60 / 255, 0));
  right("Pedido de compra / Purchase order", M + W, 10, regular, MUTED);
  y -= 22;
  text(po.business.legalName || "", M, 9, regular, MUTED);
  right(po.label, M + W, 20, serif);
  y -= 13;
  if (po.business.nif) text(`NIF ${po.business.nif}`, M, 9, regular, MUTED);
  y -= 13;
  text(po.business.address || "", M, 9, regular, MUTED);
  right(po.date.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" }), M + W, 9, regular, MUTED);
  y -= 13;
  if (po.business.email) text(po.business.email, M, 9, regular, MUTED);

  // Supplier.
  y -= 34;
  text("PROVEEDOR / SUPPLIER", M, 7.5, regular, MUTED);
  y -= 15;
  text(po.supplier.name, M, 11, bold);
  y -= 13;
  for (const l of [po.supplier.contactName, po.supplier.email, po.supplier.country].filter(Boolean) as string[]) {
    text(l, M, 9, regular, MUTED);
    y -= 12;
  }

  // Lines.
  y -= 22;
  const cQty = M + W * 0.55;
  const cUnit = M + W * 0.78;
  text("ARTICULO / ITEM", M, 7.5, regular, MUTED);
  right("CANTIDAD / QUANTITY", cQty + 60, 7.5, regular, MUTED);
  right("PRECIO / PRICE", cUnit + 30, 7.5, regular, MUTED);
  right("TOTAL", M + W, 7.5, regular, MUTED);
  y -= 8;
  rule();
  let total = 0;
  let priced = true;
  for (const l of po.lines) {
    y -= 18;
    if (y < M + 120) break; // one page is plenty for a reorder; never overflow
    const lineTotal = l.unitPriceCents != null ? l.unitPriceCents * l.packs : null;
    if (lineTotal == null) priced = false;
    else total += lineTotal;
    text(l.name, M, 10);
    right(`${l.packs} × ${l.packSize} ${l.unit}`, cQty + 60, 10);
    right(l.unitPriceCents != null ? euro(l.unitPriceCents) : "—", cUnit + 30, 10);
    right(lineTotal != null ? euro(lineTotal) : "—", M + W, 10);
    y -= 8;
    rule(rgb(0.86, 0.83, 0.77), 0.4);
  }
  if (priced && po.lines.length) {
    y -= 22;
    right("Total (sin IVA / excl. VAT)", cUnit + 30, 9, regular, MUTED);
    right(euro(total), M + W, 12, bold);
  }

  // Note and delivery.
  if (po.note) {
    y -= 36;
    text("NOTA / NOTE", M, 7.5, regular, MUTED);
    for (const chunk of safe(po.note).match(/.{1,95}(\s|$)/g) ?? []) {
      y -= 13;
      text(chunk.trim(), M, 9.5);
    }
  }
  y = M + 40;
  rule();
  y -= 16;
  text(`Entregar en / Deliver to: ${po.business.address || ""}`, M, 9, regular, MUTED);
  y -= 13;
  text("Gracias / Thank you.", M, 9, regular, MUTED);
  return doc.save();
}

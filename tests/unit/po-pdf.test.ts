import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { purchaseOrderPdf } from "@/lib/po-pdf";

describe("purchase order PDF", () => {
  it("renders a one-page A4 PDF, survives non-Latin text", async () => {
    const bytes = await purchaseOrderPdf({
      label: "PO-0007",
      date: new Date("2026-11-06T10:00:00Z"),
      business: { name: "maisha matcha", legalName: "Maisha SL", nif: "B12345674", address: "Plaza Cetina, 3, Murcia", email: "hola@maishamatcha.es" },
      supplier: { name: "Uji Tea Co. 宇治", email: "orders@example.jp", country: "Japón" },
      lines: [
        { name: "Matcha ceremonial Uji", packs: 4, packSize: 100, unit: "g", unitPriceCents: 4200 },
        { name: "Leche de avena", packs: 12, packSize: 1, unit: "l", unitPriceCents: null },
      ],
      note: "Entrega por la mañana, antes de las 11:00, por favor.",
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
    expect(doc.getTitle()).toBe("Pedido PO-0007");
  });
});

/**
 * Turning OCR text (from a phone photo) into suggestions. Pure and
 * deliberately conservative: it only SUGGESTS; a person confirms every
 * number before anything is saved (build prompt section 2).
 */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9,.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Words of a name that matter for matching (drops tiny words). */
const keyWords = (name: string) => norm(name).split(" ").filter((w) => w.length >= 3);

/** How well an OCR line matches a name: share of its key words present (0..1). */
export function matchScore(line: string, name: string) {
  const words = keyWords(name);
  if (!words.length) return 0;
  const l = norm(line);
  return words.filter((w) => l.includes(w)).length / words.length;
}

const firstInt = (s: string) => {
  const m = /(?:^|\s)(\d{1,3})(?:\s*(?:x|×|uds?|ud\.|u\.|pcs|cajas?|latas?)\b|\s)/i.exec(` ${s} `);
  return m ? Number(m[1]) : null;
};

export type DeliveryLine = { index: number; name: string; orderedPacks: number };
export type DeliverySuggestion = { index: number; packs: number | null; line: string | null; score: number };

/**
 * For each line of the purchase order, the best OCR line and the quantity
 * read from it. Unmatched lines get null (the person fills them in).
 */
export function suggestDelivery(text: string, lines: DeliveryLine[]): DeliverySuggestion[] {
  const ocr = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((po) => {
    let best: { line: string; score: number } | null = null;
    for (const l of ocr) {
      const score = matchScore(l, po.name);
      if (score > (best?.score ?? 0)) best = { line: l, score };
    }
    if (!best || best.score < 0.5) return { index: po.index, packs: null, line: null, score: 0 };
    const qty = firstInt(best.line);
    // A quantity far above what was ordered is more likely a code or a price.
    const packs = qty != null && qty > 0 && qty <= po.orderedPacks * 3 ? qty : null;
    return { index: po.index, packs, line: best.line, score: best.score };
  });
}

export type TicketItem = { id: number; name: string };
export type TicketSuggestion = { menuItemId: number; name: string; quantity: number; line: string };

/** Items of the carta found on a paper ticket, with a quantity (default 1). */
export function suggestTicket(text: string, items: TicketItem[]): TicketSuggestion[] {
  const out: TicketSuggestion[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let best: { item: TicketItem; score: number } | null = null;
    for (const item of items) {
      const score = matchScore(line, item.name);
      // Prefer the longer (more specific) name on ties: "Mochi especial" over "Mochi".
      if (score > (best?.score ?? 0) || (best && score === best.score && item.name.length > best.item.name.length)) best = { item, score };
    }
    if (!best || best.score < 1) continue;
    const qty = firstInt(line);
    out.push({ menuItemId: best.item.id, name: best.item.name, quantity: qty && qty <= 20 ? qty : 1, line });
  }
  return out;
}

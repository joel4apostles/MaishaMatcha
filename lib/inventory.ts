import type { Payload, PayloadRequest } from "payload";
import { writeAudit } from "@/cms/audit";
import { query, sql, table } from "@/cms/db";

/**
 * Inventory, server only: recipe deduction on sale, stock counts, reorder
 * drafts per supplier, purchase-order sending and receiving, alerts and
 * margins. Unit conventions: an ingredient's stock and recipe quantities
 * share its unit; costs are cents per 1000 units.
 */
const rid = (v: unknown): number => (typeof v === "object" && v ? (v as { id: number }).id : (v as number));

type SoldLine = { menuItem?: number | { id: number } | null; quantity: number; grams?: number | null; modifiers?: unknown };

/** Deduct every recipe line of a paid order from stock, in the sale's transaction. */
export async function deductForOrder(req: PayloadRequest, order: { id: number; lines?: SoldLine[] | null }) {
  const lines = order.lines ?? [];
  if (lines.length === 0) return [];
  const itemIds = [...new Set(lines.map((l) => rid(l.menuItem)).filter(Boolean))];
  const keys = [...new Set(lines.flatMap((l) => ((l.modifiers as { key: string }[] | null) ?? []).map((m) => m.key)))];
  const mods = keys.length
    ? await req.payload.find({ collection: "modifiers", req, depth: 0, limit: 500, overrideAccess: true, where: { key: { in: keys } } })
    : { docs: [] };
  const modIdByKey = new Map(mods.docs.map((m) => [m.key, m.id]));
  const recipe = await req.payload.find({
    collection: "recipe-lines",
    req,
    depth: 0,
    limit: 2000,
    overrideAccess: true,
    where: {
      or: [
        ...(itemIds.length ? [{ and: [{ "target.relationTo": { equals: "menu-items" } }, { "target.value": { in: itemIds } }] }] : []),
        ...(mods.docs.length
          ? [{ and: [{ "target.relationTo": { equals: "modifiers" } }, { "target.value": { in: mods.docs.map((m) => m.id) } }] }]
          : []),
      ],
    },
  });
  const usage = new Map<number, number>();
  for (const line of lines) {
    const itemId = rid(line.menuItem);
    const modIds = ((line.modifiers as { key: string }[] | null) ?? []).map((m) => modIdByKey.get(m.key)).filter(Boolean);
    for (const r of recipe.docs) {
      const target = r.target as { relationTo: string; value: number | { id: number } };
      const tid = rid(target.value);
      const applies = (target.relationTo === "menu-items" && tid === itemId) || (target.relationTo === "modifiers" && modIds.includes(tid));
      if (!applies) continue;
      const perUnit = r.usesMeasuredGrams && line.grams ? line.grams : r.quantity;
      const ing = rid(r.ingredient);
      usage.set(ing, (usage.get(ing) ?? 0) + perUnit * line.quantity);
    }
  }
  for (const [ingredient, amount] of usage) {
    if (amount <= 0) continue;
    await req.payload.create({
      collection: "stock-movements",
      req,
      overrideAccess: true,
      data: { item: ingredient, delta: -Math.round(amount * 1000) / 1000, reason: "sale", order: order.id },
    });
  }
  return [...usage.keys()];
}

/** Items at or below their reorder point that have a supplier. */
async function needsReorder(payload: Payload, ingredientIds?: number[]) {
  const { docs } = await payload.find({
    collection: "inventory-items",
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    where: {
      and: [
        { lowStockAt: { exists: true } },
        { supplier: { exists: true } },
        ...(ingredientIds?.length ? [{ id: { in: ingredientIds } }] : []),
      ],
    },
  });
  return docs.filter((i) => typeof i.lowStockAt === "number" && (i.stock ?? 0) <= i.lowStockAt);
}

/**
 * Add ingredients that crossed their reorder point to their supplier's open
 * draft (created if needed). An ingredient already on an open draft is not
 * added again: one line per crossing, never one per sale.
 */
export async function draftReorders(payload: Payload, ingredientIds?: number[]) {
  const low = await needsReorder(payload, ingredientIds);
  const touched: number[] = [];
  for (const item of low) {
    const supplierId = rid(item.supplier);
    const open = await payload.find({
      collection: "purchase-orders",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { and: [{ supplier: { equals: supplierId } }, { status: { equals: "draft" } }] },
    });
    const draft = open.docs[0];
    if (draft?.lines?.some((l) => rid(l.ingredient) === item.id)) continue;

    const product = (
      await payload.find({
        collection: "supplier-products",
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { and: [{ supplier: { equals: supplierId } }, { ingredient: { equals: item.id } }] },
      })
    ).docs[0];
    const stock = item.stock ?? 0;
    const needed = item.reorderQuantity ?? Math.max((item.parLevel ?? (item.lowStockAt ?? 0) * 2) - stock, 1);
    const packSize = product?.packSize || needed;
    const packs = Math.max(1, Math.ceil(needed / packSize));
    const line = { ingredient: item.id, packs, packSize, unitPriceCents: product?.priceCents, receivedPacks: 0 };

    if (draft) {
      const lines = [...(draft.lines ?? []).map((l) => ({ ...l, ingredient: rid(l.ingredient) })), line];
      await payload.update({
        collection: "purchase-orders",
        id: draft.id,
        overrideAccess: true,
        data: { lines, totalCents: poTotal(lines) },
      });
      touched.push(draft.id);
    } else {
      const seq = table(payload, "sequences");
      await query(payload, sql`insert into ${seq} (key, value, updated_at, created_at) values ('po', 0, now(), now()) on conflict (key) do nothing`);
      const rows = await query(payload, sql`update ${seq} set value = value + 1 where key = 'po' returning value`);
      const po = await payload.create({
        collection: "purchase-orders",
        overrideAccess: true,
        data: {
          label: `PO-${String(rows[0].value).padStart(4, "0")}`,
          supplier: supplierId,
          status: "draft",
          lines: [line],
          totalCents: poTotal([line]),
        },
      });
      touched.push(po.id);
      const supplier = await payload.findByID({ collection: "suppliers", id: supplierId, depth: 0, overrideAccess: true });
      if (supplier.autoSend) await sendPurchaseOrder(payload, po.id, null);
    }
  }
  return touched;
}

const poTotal = (lines: { packs: number; unitPriceCents?: number | null }[]) =>
  lines.reduce((s, l) => s + l.packs * (l.unitPriceCents ?? 0), 0);

/** Email the order to the supplier (Resend) and mark it sent. */
/** The PDF for a purchase order (attached to the supplier email, downloadable by staff). */
export async function purchaseOrderPdfFor(payload: Payload, poId: number, req?: PayloadRequest) {
  const { purchaseOrderPdf } = await import("@/lib/po-pdf");
  const po = await payload.findByID({ collection: "purchase-orders", id: poId, depth: 1, overrideAccess: true, req });
  const supplier = po.supplier as { name: string; email: string; contactName?: string | null; country?: string | null };
  const business = await payload.findGlobal({ slug: "business", overrideAccess: true, req });
  const bytes = await purchaseOrderPdf({
    label: po.label ?? String(po.id),
    date: new Date(po.sentAt ?? po.createdAt),
    business: { name: business.tradeName || "maisha matcha", legalName: business.legalName, nif: business.nif, address: business.address, email: process.env.RESEND_FROM?.match(/<(.+)>/)?.[1] ?? "hola@maishamatcha.es" },
    supplier: { name: supplier.name, email: supplier.email, contactName: supplier.contactName, country: supplier.country },
    lines: (po.lines ?? []).map((l) => {
      const ing = l.ingredient as { name: string; unit: string };
      return { name: ing.name, packs: l.packs, packSize: l.packSize, unit: ing.unit, unitPriceCents: l.unitPriceCents ?? null };
    }),
    note: po.note,
  });
  return { bytes, filename: `pedido-${(po.label ?? String(po.id)).toLowerCase()}.pdf` };
}

export async function sendPurchaseOrder(payload: Payload, poId: number, approverId: number | null, req?: PayloadRequest) {
  const po = await payload.findByID({ collection: "purchase-orders", id: poId, depth: 1, overrideAccess: true, req });
  const supplier = po.supplier as { name: string; email: string };
  const business = await payload.findGlobal({ slug: "business", overrideAccess: true });
  const rows = (po.lines ?? [])
    .map((l) => {
      const ing = l.ingredient as { name: string; unit: string };
      return `<tr><td style="padding:6px 12px 6px 0">${escapeHtml(ing.name)}</td><td style="padding:6px 12px">${l.packs} × ${l.packSize} ${ing.unit}</td></tr>`;
    })
    .join("");
  const html = `<div style="font-family:Georgia,serif;color:#1C1B18">
    <p>${escapeHtml(business.tradeName || "maisha matcha")} · ${escapeHtml(business.address || "")}</p>
    <h1 style="font-weight:300">Pedido ${escapeHtml(po.label ?? "")}</h1>
    <table style="border-collapse:collapse">${rows}</table>
    ${po.note ? `<p>${escapeHtml(po.note)}</p>` : ""}
    <p>Gracias.</p></div>`;

  let emailStatus = "Sin enviar: falta RESEND_API_KEY.";
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const pdf = await purchaseOrderPdfFor(payload, poId, req);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "maisha matcha <hola@maishamatcha.es>",
        to: supplier.email,
        subject: `Pedido ${po.label} · ${business.tradeName || "maisha matcha"}`,
        html,
        attachments: [{ filename: pdf.filename, content: Buffer.from(pdf.bytes).toString("base64") }],
      }),
    }).catch(() => null);
    emailStatus = res?.ok ? `Enviado a ${supplier.email}` : `Error al enviar (${res?.status ?? "red"})`;
  }
  await payload.update({
    collection: "purchase-orders",
    id: poId,
    overrideAccess: true,
    req,
    context: { skipPoHooks: true },
    data: { status: "sent", sentAt: new Date().toISOString(), approvedBy: approverId ?? undefined, emailStatus },
  });
  await writeAudit(req ?? { payload }, { action: "po.sent", entity: "purchase-orders", entityId: poId, actorId: approverId, after: { emailStatus } });
  return emailStatus;
}

/**
 * Receive packs on a sent order: stock comes in (purchase movements),
 * perishables get a batch with their expiry, and the ingredient's cost
 * follows the supplier's latest price.
 */
export async function receiveLines(
  req: PayloadRequest,
  po: { id: number; lines?: { ingredient: unknown; packs: number; packSize: number; unitPriceCents?: number | null; receivedPacks?: number | null }[] | null },
  previous: { receivedPacks?: number | null }[],
) {
  for (const [i, line] of (po.lines ?? []).entries()) {
    const before = previous[i]?.receivedPacks ?? 0;
    const now = line.receivedPacks ?? 0;
    const packs = now - before;
    if (packs <= 0) continue;
    const ingredientId = rid(line.ingredient);
    await req.payload.create({
      collection: "stock-movements",
      req,
      overrideAccess: true,
      data: { item: ingredientId, delta: packs * line.packSize, reason: "purchase", purchaseOrder: po.id, note: `Recibido ${packs} envase(s)` },
    });
    const ingredient = await req.payload.findByID({ collection: "inventory-items", id: ingredientId, req, depth: 0, overrideAccess: true });
    if (ingredient.shelfLifeDays) {
      const expires = new Date(Date.now() + ingredient.shelfLifeDays * 86400000);
      await req.payload.create({
        collection: "batches",
        req,
        overrideAccess: true,
        data: { ingredient: ingredientId, quantity: packs * line.packSize, expiresOn: expires.toISOString(), purchaseOrder: po.id },
      });
    }
    if (line.unitPriceCents && line.packSize > 0) {
      const cost = Math.round((line.unitPriceCents / line.packSize) * 1000);
      if (cost !== ingredient.costCentsPer1000) {
        await req.payload.update({ collection: "inventory-items", id: ingredientId, req, overrideAccess: true, data: { costCentsPer1000: cost } });
        await writeAudit(req, {
          action: "price.change",
          entity: "inventory-items",
          entityId: ingredientId,
          before: { costCentsPer1000: ingredient.costCentsPer1000 ?? null },
          after: { costCentsPer1000: cost },
          reason: "Precio del proveedor al recibir",
        });
      }
    }
  }
}

export type Alerts = {
  lowStock: { id: number; name: string; stock: number; unit: string; reorderPoint: number }[];
  expiring: { id: number; name: string; expiresOn: string; quantity: number }[];
  lowMargin: { id: number; name: string; marginPercent: number }[];
  draftOrders: { id: number; label: string; supplier: string; totalCents: number }[];
};

/** Per-drink cost (default recipe, measured lines at default grams) and margin. */
export async function margins(payload: Payload) {
  const [items, recipe, ingredients, rates] = await Promise.all([
    payload.find({ collection: "menu-items", depth: 0, limit: 500, overrideAccess: true, locale: "es" }),
    payload.find({ collection: "recipe-lines", depth: 0, limit: 5000, overrideAccess: true, where: { "target.relationTo": { equals: "menu-items" } } }),
    payload.find({ collection: "inventory-items", depth: 0, limit: 1000, overrideAccess: true }),
    payload.find({ collection: "tax-rates", depth: 0, limit: 50, overrideAccess: true }),
  ]);
  const costOf = new Map(ingredients.docs.map((i) => [i.id, i.costCentsPer1000 ?? null]));
  const rateOf = new Map(rates.docs.map((r) => [r.id, r.rateBasisPoints]));
  return items.docs.map((item) => {
    const lines = recipe.docs.filter((r) => rid((r.target as { value: unknown }).value) === item.id);
    let cost = 0;
    let complete = lines.length > 0;
    for (const r of lines) {
      const c = costOf.get(rid(r.ingredient));
      if (c == null) complete = false;
      const qty = r.usesMeasuredGrams ? (item.defaultGrams ?? r.quantity) : r.quantity;
      cost += ((c ?? 0) * qty) / 1000;
    }
    const net = item.priceCents / (1 + (rateOf.get(rid(item.taxRate)) ?? 1000) / 10000);
    return {
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      costCents: Math.round(cost),
      marginPercent: net > 0 ? Math.round(((net - cost) / net) * 100) : 0,
      complete,
    };
  });
}

export async function inventoryAlerts(payload: Payload, targetMarginPercent = 65): Promise<Alerts> {
  const soon = new Date(Date.now() + 3 * 86400000).toISOString();
  const [ingredients, batches, drafts, m] = await Promise.all([
    payload.find({ collection: "inventory-items", depth: 0, limit: 1000, overrideAccess: true, where: { lowStockAt: { exists: true } } }),
    payload.find({ collection: "batches", depth: 1, limit: 200, overrideAccess: true, where: { expiresOn: { less_than_equal: soon } } }),
    payload.find({ collection: "purchase-orders", depth: 1, limit: 50, overrideAccess: true, where: { status: { equals: "draft" } } }),
    margins(payload),
  ]);
  return {
    lowStock: ingredients.docs
      .filter((i) => (i.stock ?? 0) <= (i.lowStockAt ?? -1))
      .map((i) => ({ id: i.id, name: i.name, stock: i.stock ?? 0, unit: i.unit, reorderPoint: i.lowStockAt ?? 0 })),
    expiring: batches.docs.map((b) => ({
      id: b.id,
      name: typeof b.ingredient === "object" && b.ingredient ? b.ingredient.name : "",
      expiresOn: b.expiresOn ?? "",
      quantity: b.quantity,
    })),
    lowMargin: m.filter((x) => x.complete && x.marginPercent < targetMarginPercent).map((x) => ({ id: x.id, name: x.name, marginPercent: x.marginPercent })),
    draftOrders: drafts.docs.map((d) => ({
      id: d.id,
      label: d.label ?? "",
      supplier: typeof d.supplier === "object" && d.supplier ? d.supplier.name : "",
      totalCents: d.totalCents ?? 0,
    })),
  };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

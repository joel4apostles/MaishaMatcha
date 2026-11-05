import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from "payload";
import { query, sql, table } from "@/cms/db";
import type { CatalogItem } from "@/lib/pos/pricing";

/**
 * Shop stock (whole units: tins, chawan, whisks). Taken inside the order's
 * transaction with a conditional update, so two buyers can never both get
 * the last tin; given back when the order is cancelled or voided.
 * Items with no stock number are not counted.
 */
type Line = { menuItem?: unknown; menuItemId?: number; quantity: number };

const itemId = (l: Line) =>
  l.menuItemId ?? (typeof l.menuItem === "object" && l.menuItem ? (l.menuItem as { id: number }).id : (l.menuItem as number | undefined));

function units(lines: Line[], counted: (id: number) => boolean) {
  const need = new Map<number, number>();
  for (const l of lines) {
    const id = itemId(l);
    if (id && counted(id)) need.set(id, (need.get(id) ?? 0) + l.quantity);
  }
  return need;
}

/** false = not enough units of something (nothing is taken then: the caller rolls back). */
export async function takeUnits(req: PayloadRequest, catalog: Map<number, CatalogItem>, lines: Line[]): Promise<boolean> {
  const items = table(req.payload, "menu_items");
  for (const [id, q] of units(lines, (i) => catalog.get(i)?.stock != null)) {
    const rows = await query(req.payload, sql`update ${items} set stock = stock - ${q} where id = ${id} and stock >= ${q} returning stock`, req);
    if (rows.length === 0) return false;
  }
  return true;
}

export async function returnUnits(payload: Payload, lines: Line[], req?: PayloadRequest) {
  const items = table(payload, "menu_items");
  for (const [id, q] of units(lines, () => true)) {
    await query(payload, sql`update ${items} set stock = stock + ${q} where id = ${id} and stock is not null`, req);
  }
}

/**
 * Cancel an order and give its units back, exactly once. One conditional
 * update decides who cancels (a Stripe expiry and a staff void racing each
 * other: only one gets the row), and the units go back in the same
 * transaction. Returns false if it was already cancelled (or paid, when
 * onlyUnpaid).
 */
export async function cancelOrderOnce(payload: Payload, orderId: number, opts: { onlyUnpaid: boolean }) {
  const req = await createLocalReq({}, payload);
  await initTransaction(req);
  try {
    const orders = table(payload, "orders");
    const rows = await query(
      payload,
      opts.onlyUnpaid
        ? sql`update ${orders} set status = 'cancelled', status_changed_at = now() where id = ${orderId} and status <> 'cancelled' and payment_status = 'unpaid' returning id`
        : sql`update ${orders} set status = 'cancelled', status_changed_at = now() where id = ${orderId} and status <> 'cancelled' returning id`,
      req,
    );
    if (rows.length === 0) {
      await commitTransaction(req);
      return false;
    }
    const order = await payload.findByID({ collection: "orders", id: orderId, req, depth: 0, overrideAccess: true });
    await returnUnits(payload, (order.lines ?? []) as Line[], req);
    await commitTransaction(req);
    return true;
  } catch (err) {
    await killTransaction(req);
    throw err;
  }
}

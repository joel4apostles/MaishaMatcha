"use client";

/**
 * Cash sales taken while the tablet is offline. Each keeps the idempotency
 * key it was created with, so syncing the same sale twice (a retry, a
 * second tab) still records ONE order and ONE payment on the server.
 * Stored per browser in localStorage; card payments are never queued.
 */
export type QueuedSale = {
  idempotencyKey: string;
  service: "here" | "takeaway";
  tenderedCents: number;
  totalCents: number;
  queuedAt: string;
  lines: { menuItemId: number; quantity: number; modifierKeys: string[]; grams: number | null; note: string | null }[];
  lastError?: string;
};

const KEY = "maisha_pos_queue_v1";

export function readQueue(): QueuedSale[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedSale[]) : [];
  } catch {
    return [];
  }
}

function write(queue: QueuedSale[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // Storage full or blocked: nothing more we can do on the client.
  }
}

export function enqueue(sale: QueuedSale) {
  const q = readQueue().filter((s) => s.idempotencyKey !== sale.idempotencyKey);
  q.push(sale);
  write(q);
}

export function remove(key: string) {
  write(readQueue().filter((s) => s.idempotencyKey !== key));
}

export function markFailed(key: string, error: string) {
  write(readQueue().map((s) => (s.idempotencyKey === key ? { ...s, lastError: error } : s)));
}

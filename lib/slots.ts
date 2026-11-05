/**
 * Pickup slots for web orders, pure. Times are Spanish local times
 * (Europe/Madrid); the owner sets hours, open days, slot length, capacity
 * and lead time in the admin (Empresa). Unit tested.
 */
export type SlotSettings = {
  openingTime: string; // "08:00"
  closingTime: string; // "18:00"
  openDays: string[]; // ["tue", ...]
  slotMinutes: number;
  slotCapacity: number;
  leadMinutes: number;
};

export type Slot = { start: string; label: string; day: string; available: boolean; remaining: number };

const TZ = "Europe/Madrid";
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** The UTC instant of a local date + "HH:MM" in Madrid. */
export function madridInstant(localDate: string, hhmm: string): Date {
  const guess = new Date(`${localDate}T${hhmm}:00Z`);
  const local = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (local.getTime() - utc.getTime()));
}

const localDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const weekday = (date: string) => DAY_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

/**
 * Slots for today and the next open days (up to `days` calendar days),
 * marking each full or too soon. `taken` maps slot start ISO -> orders.
 */
export function pickupSlots(s: SlotSettings, now: Date, taken: Map<string, number>, days = 2): Slot[] {
  const out: Slot[] = [];
  const earliest = now.getTime() + s.leadMinutes * 60000;
  for (let i = 0; i < days; i++) {
    const date = localDate(new Date(now.getTime() + i * 86400000));
    if (!s.openDays.includes(weekday(date))) continue;
    const open = madridInstant(date, s.openingTime).getTime();
    const close = madridInstant(date, s.closingTime).getTime();
    for (let t = open; t + s.slotMinutes * 60000 <= close; t += s.slotMinutes * 60000) {
      if (t < earliest) continue;
      const start = new Date(t).toISOString();
      const used = taken.get(start) ?? 0;
      out.push({
        start,
        day: date,
        label: new Date(t).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }),
        available: used < s.slotCapacity,
        remaining: Math.max(0, s.slotCapacity - used),
      });
    }
  }
  return out;
}

/** Is this ISO time one of the currently offered, non-full slots? */
export function isBookable(s: SlotSettings, now: Date, taken: Map<string, number>, startIso: string): boolean {
  return pickupSlots(s, now, taken, 2).some((slot) => slot.start === startIso && slot.available);
}

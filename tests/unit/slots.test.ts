import { describe, expect, it } from "vitest";
import { isBookable, madridInstant, pickupSlots, type SlotSettings } from "@/lib/slots";

const settings: SlotSettings = {
  openingTime: "08:00",
  closingTime: "18:00",
  openDays: ["tue", "wed", "thu", "fri", "sat", "sun"],
  slotMinutes: 15,
  slotCapacity: 2,
  leadMinutes: 15,
};

describe("pickup slots", () => {
  it("converts Madrid local times, winter and summer", () => {
    expect(madridInstant("2026-11-07", "08:00").toISOString()).toBe("2026-11-07T07:00:00.000Z");
    expect(madridInstant("2026-07-07", "08:00").toISOString()).toBe("2026-07-07T06:00:00.000Z");
  });

  it("offers slots from now plus lead time until closing", () => {
    // Saturday 7 Nov 2026, 16:52 in Madrid.
    const now = new Date("2026-11-07T15:52:00Z");
    const slots = pickupSlots(settings, now, new Map(), 1);
    expect(slots[0].label).toBe("17:15");
    expect(slots.at(-1)?.label).toBe("17:45");
  });

  it("skips closed days", () => {
    // Monday 9 Nov 2026 is closed: from Sunday evening the next slots are Tuesday... but only 2 days ahead.
    const sundayLate = new Date("2026-11-08T17:30:00Z");
    const slots = pickupSlots(settings, sundayLate, new Map(), 2);
    expect(slots.every((s) => s.day !== "2026-11-09")).toBe(true);
  });

  it("fills slots by capacity", () => {
    const now = new Date("2026-11-07T07:00:00Z");
    const first = pickupSlots(settings, now, new Map(), 1)[0];
    const taken = new Map([[first.start, 2]]);
    expect(pickupSlots(settings, now, taken, 1)[0]).toMatchObject({ available: false, remaining: 0 });
    expect(isBookable(settings, now, taken, first.start)).toBe(false);
    expect(isBookable(settings, now, new Map(), first.start)).toBe(true);
    expect(isBookable(settings, now, new Map(), "2026-11-07T03:00:00.000Z")).toBe(false);
  });
});

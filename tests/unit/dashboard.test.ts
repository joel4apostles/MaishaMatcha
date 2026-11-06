import { describe, expect, it } from "vitest";
import { setupSteps } from "@/lib/dashboard";

const base = { stripe: false, email: false, shopProducts: 0, foundingReady: false, upcomingEvents: 0, onlineOrdering: false };

describe("setupSteps", () => {
  it("starts with nothing done", () => {
    expect(setupSteps(base).every((s) => !s.done)).toBe(true);
  });
  it("needs both legal name and NIF, not blanks", () => {
    expect(setupSteps({ ...base, legalName: "Maisha SL", nif: " " })[0].done).toBe(false);
    expect(setupSteps({ ...base, legalName: "Maisha SL", nif: "B12345678" })[0].done).toBe(true);
  });
  it("is complete when everything is set", () => {
    const all = setupSteps({ legalName: "x", nif: "y", stripe: true, email: true, shopProducts: 2, foundingReady: true, upcomingEvents: 1, onlineOrdering: true });
    expect(all.every((s) => s.done)).toBe(true);
  });
});

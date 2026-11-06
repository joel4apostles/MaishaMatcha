import { describe, expect, it } from "vitest";
import { checkTaxId } from "@/lib/nif";

describe("tax ids for full invoices", () => {
  it("accepts valid NIF, NIE and CIF (with spaces, dashes, ES prefix)", () => {
    expect(checkTaxId("12345678Z")).toMatchObject({ ok: true, kind: "nif" });
    expect(checkTaxId("12.345.678-z")).toMatchObject({ ok: true, value: "12345678Z" });
    expect(checkTaxId("X1234567L")).toMatchObject({ ok: true, kind: "nie" });
    expect(checkTaxId("B12345674")).toMatchObject({ ok: true, kind: "cif" });
    expect(checkTaxId("ESB12345674")).toMatchObject({ ok: true, value: "B12345674" });
  });

  it("rejects wrong check characters", () => {
    expect(checkTaxId("12345678A").ok).toBe(false);
    expect(checkTaxId("X1234567A").ok).toBe(false);
    expect(checkTaxId("B12345675").ok).toBe(false);
    expect(checkTaxId("").ok).toBe(false);
  });

  it("accepts foreign VAT numbers with a country prefix", () => {
    expect(checkTaxId("NL123456789B01")).toMatchObject({ ok: true, kind: "foreign" });
    expect(checkTaxId("FR 12 345678901")).toMatchObject({ ok: true, kind: "foreign" });
  });
});

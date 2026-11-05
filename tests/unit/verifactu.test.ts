import { describe, expect, it } from "vitest";
import {
  aeatDate,
  aeatTimestamp,
  fingerprint,
  fingerprintString,
  fullInvoiceNumber,
  qrUrl,
} from "@/lib/pos/verifactu";

const base = {
  issuerNif: "B12345678",
  fullNumber: "T2026-000001",
  issuedAt: new Date("2026-11-07T09:15:00Z"),
  type: "F2" as const,
  taxCents: 299,
  totalCents: 3290,
  previousHash: null,
  generatedAt: new Date("2026-11-07T09:15:02Z"),
};

describe("VERI*FACTU records", () => {
  it("formats dates and timestamps in Spanish time with offset", () => {
    expect(aeatDate(new Date("2026-11-07T23:30:00Z"))).toBe("08-11-2026");
    expect(aeatTimestamp(new Date("2026-11-07T09:15:02Z"))).toBe("2026-11-07T10:15:02+01:00");
    expect(aeatTimestamp(new Date("2026-07-01T09:00:00Z"))).toBe("2026-07-01T11:00:00+02:00");
  });

  it("builds the fixed fingerprint string", () => {
    expect(fingerprintString(base)).toBe(
      "IDEmisorFactura=B12345678&NumSerieFactura=T2026-000001&FechaExpedicionFactura=07-11-2026" +
        "&TipoFactura=F2&CuotaTotal=2.99&ImporteTotal=32.90&Huella=&FechaHoraHusoGenRegistro=2026-11-07T10:15:02+01:00",
    );
  });

  it("chains each record to the previous fingerprint", () => {
    const first = fingerprint(base);
    expect(first).toMatch(/^[0-9A-F]{64}$/);
    const second = fingerprint({ ...base, fullNumber: "T2026-000002", previousHash: first });
    const forged = fingerprint({ ...base, fullNumber: "T2026-000002", previousHash: "0".repeat(64) });
    expect(second).not.toBe(forged);
    expect(fingerprint(base)).toBe(first);
  });

  it("numbers and QR-encodes tickets", () => {
    expect(fullInvoiceNumber("T", 2026, 42)).toBe("T2026-000042");
    const url = new URL(qrUrl(base));
    expect(url.hostname).toBe("www2.agenciatributaria.gob.es");
    expect(url.searchParams.get("numserie")).toBe("T2026-000001");
    expect(url.searchParams.get("importe")).toBe("32.90");
    expect(url.searchParams.get("fecha")).toBe("07-11-2026");
  });
});

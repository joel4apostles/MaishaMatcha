import { createHash } from "node:crypto";

/**
 * VERI*FACTU record helpers (RD 1007/2023, Orden HAC/1177/2024), pure.
 *
 * The fingerprint ("huella") of an invoice registration record is the
 * upper-case hex SHA-256 of a fixed key=value string that includes the
 * previous record's fingerprint, which chains every record to the one
 * before it. Amounts use a dot and two decimals; the issue date is
 * dd-mm-yyyy; the generation timestamp is ISO 8601 with its UTC offset.
 *
 * This implements the record format. Sending records to the AEAT (and the
 * software producer's declaration) is a separate, still-pending module.
 */
export type InvoiceType = "F1" | "F2" | "R5";

export type FingerprintInput = {
  issuerNif: string;
  fullNumber: string;
  issuedAt: Date;
  type: InvoiceType;
  taxCents: number;
  totalCents: number;
  previousHash: string | null;
  generatedAt: Date;
};

const TZ = "Europe/Madrid";

export const euroAmount = (cents: number) => (cents / 100).toFixed(2);

/** dd-mm-yyyy in Spanish local time. */
export function aeatDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("day")}-${get("month")}-${get("year")}`;
}

/** 2026-11-05T19:30:00+01:00 in Spanish local time. */
export function aeatTimestamp(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const offset = get("timeZoneName").replace("GMT", "") || "+00:00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${offset}`;
}

export function fingerprintString(i: FingerprintInput): string {
  return [
    `IDEmisorFactura=${i.issuerNif}`,
    `NumSerieFactura=${i.fullNumber}`,
    `FechaExpedicionFactura=${aeatDate(i.issuedAt)}`,
    `TipoFactura=${i.type}`,
    `CuotaTotal=${euroAmount(i.taxCents)}`,
    `ImporteTotal=${euroAmount(i.totalCents)}`,
    `Huella=${i.previousHash ?? ""}`,
    `FechaHoraHusoGenRegistro=${aeatTimestamp(i.generatedAt)}`,
  ].join("&");
}

export function fingerprint(i: FingerprintInput): string {
  return createHash("sha256").update(fingerprintString(i), "utf8").digest("hex").toUpperCase();
}

/** The QR every ticket must carry: lets a customer check it with the AEAT. */
export function qrUrl(i: { issuerNif: string; fullNumber: string; issuedAt: Date; totalCents: number }): string {
  const q = new URLSearchParams({
    nif: i.issuerNif,
    numserie: i.fullNumber,
    fecha: aeatDate(i.issuedAt),
    importe: euroAmount(i.totalCents),
  });
  return `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?${q.toString()}`;
}

/** "T2026-000042": series, year, six-digit correlative. */
export function fullInvoiceNumber(series: string, year: number, n: number): string {
  return `${series}${year}-${String(n).padStart(6, "0")}`;
}

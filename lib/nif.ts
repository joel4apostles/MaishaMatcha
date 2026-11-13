/**
 * Spanish tax ids for full invoices: NIF (DNI), NIE and CIF, each with its
 * check character. Foreign customers (EU VAT numbers and others) pass with
 * a country prefix other than ES. Pure, unit tested.
 */
const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

function normalizeTaxId(raw: string) {
  return raw.toUpperCase().replace(/[\s.\-/]/g, "");
}

function validDni(v: string) {
  const m = /^(\d{8})([A-Z])$/.exec(v);
  return Boolean(m && DNI_LETTERS[Number(m[1]) % 23] === m[2]);
}

function validNie(v: string) {
  const m = /^([XYZ])(\d{7})([A-Z])$/.exec(v);
  if (!m) return false;
  return validDni(`${"XYZ".indexOf(m[1])}${m[2]}${m[3]}`);
}

function validCif(v: string) {
  const m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(v);
  if (!m) return false;
  const digits = m[2].split("").map(Number);
  let sum = 0;
  digits.forEach((d, i) => {
    if (i % 2 === 0) {
      const x = d * 2;
      sum += Math.floor(x / 10) + (x % 10);
    } else sum += d;
  });
  const control = (10 - (sum % 10)) % 10;
  const letter = "JABCDEFGHI"[control];
  const kind = m[1];
  if ("PQRSNW".includes(kind)) return m[3] === letter;
  if ("ABEH".includes(kind)) return m[3] === String(control);
  return m[3] === String(control) || m[3] === letter;
}

export type TaxIdCheck = { ok: true; value: string; kind: "nif" | "nie" | "cif" | "foreign" } | { ok: false };

export function checkTaxId(raw: string): TaxIdCheck {
  let v = normalizeTaxId(raw);
  if (v.startsWith("ES")) v = v.slice(2);
  if (validDni(v)) return { ok: true, value: v, kind: "nif" };
  if (validNie(v)) return { ok: true, value: v, kind: "nie" };
  if (validCif(v)) return { ok: true, value: v, kind: "cif" };
  // EU VAT / foreign id: two-letter country prefix, then 4 to 18 characters.
  if (/^[A-Z]{2}[A-Z0-9]{4,18}$/.test(v) && !v.startsWith("ES")) return { ok: true, value: v, kind: "foreign" };
  return { ok: false };
}

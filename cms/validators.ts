import { number } from "payload/shared";

/**
 * Money fields are integer cents. A custom `validate` in Payload REPLACES
 * the built-in one, so this wraps the default number validation (required,
 * min, max) and adds the whole-cents rule on top.
 */
type NumberValidate = typeof number;

export const integerCents: NumberValidate = (value, options) => {
  const base = number(value, options);
  if (base !== true) return base;
  if (value === null || value === undefined) return true;
  const values = Array.isArray(value) ? value : [value];
  return values.every((v) => Number.isInteger(v)) ? true : "Usa céntimos enteros (450 = 4,50 €).";
};

export const integer: NumberValidate = (value, options) => {
  const base = number(value, options);
  if (base !== true) return base;
  if (value === null || value === undefined) return true;
  const values = Array.isArray(value) ? value : [value];
  return values.every((v) => Number.isInteger(v)) ? true : "Debe ser un número entero.";
};

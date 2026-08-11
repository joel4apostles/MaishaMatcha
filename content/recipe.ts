import type { Locale } from "@/i18n/routing";

/**
 * The recipe builder's raw material. Prices are launch drafts in cents,
 * editable here like the carta. Every option carries a short code (for the
 * human-readable recipe code), a hue (for the blended drink swatch), and
 * localized labels.
 */

export type Intensity = {
  id: "suave" | "clasico" | "intenso";
  code: string;
  grams: number;
  surchargeCents: number;
  label: Record<Locale, string>;
  note: Record<Locale, string>;
};

export type Base = {
  id: "agua" | "gas" | "tonica" | "lechecoco" | "aguacoco";
  code: string;
  ml: number;
  surchargeCents: number;
  hue: string;
  label: Record<Locale, string>;
};

export type Fruit = {
  id: "mango" | "fresas" | "yuzu" | "hibiscus";
  code: string;
  surchargeCents: number;
  hue: string;
  label: Record<Locale, string>;
};

export type Temp = {
  id: "frio" | "templado";
  code: string;
  label: Record<Locale, string>;
};

/** Every custom drink starts from the stone-ground matcha. */
export const RECIPE_BASE_PRICE_CENTS = 400;

/** The matcha itself, for color blending. */
export const MATCHA_HUE = "#6B7F5E";

export const intensities: Intensity[] = [
  {
    id: "suave",
    code: "SUA",
    grams: 1.5,
    surchargeCents: 0,
    label: { es: "Suave", en: "Gentle" },
    note: { es: "Ligero, herbáceo", en: "Light, grassy" },
  },
  {
    id: "clasico",
    code: "CLA",
    grams: 2,
    surchargeCents: 50,
    label: { es: "Clásico", en: "Classic" },
    note: { es: "Al estilo usucha", en: "Usucha style" },
  },
  {
    id: "intenso",
    code: "INT",
    grams: 3,
    surchargeCents: 100,
    label: { es: "Intenso", en: "Intense" },
    note: { es: "Denso, para detenerse", en: "Dense, made to pause over" },
  },
];

export const bases: Base[] = [
  {
    id: "agua",
    code: "AGU",
    ml: 120,
    surchargeCents: 0,
    hue: "#E8E4D8",
    label: { es: "Agua", en: "Water" },
  },
  {
    id: "gas",
    code: "GAS",
    ml: 200,
    surchargeCents: 50,
    hue: "#E3E0D2",
    label: { es: "Agua con gas", en: "Sparkling water" },
  },
  {
    id: "tonica",
    code: "TON",
    ml: 200,
    surchargeCents: 100,
    hue: "#DCE0C8",
    label: { es: "Tónica", en: "Tonic" },
  },
  {
    id: "lechecoco",
    code: "LCO",
    ml: 180,
    surchargeCents: 100,
    hue: "#E6DFC9",
    label: { es: "Leche de coco", en: "Coconut milk" },
  },
  {
    id: "aguacoco",
    code: "ACO",
    ml: 200,
    surchargeCents: 100,
    hue: "#DDD3B8",
    label: { es: "Agua de coco", en: "Coconut water" },
  },
];

export const fruits: Fruit[] = [
  {
    id: "mango",
    code: "MAN",
    surchargeCents: 100,
    hue: "#D69A3F",
    label: { es: "Mango", en: "Mango" },
  },
  {
    id: "fresas",
    code: "FRE",
    surchargeCents: 100,
    hue: "#C97C82",
    label: { es: "Fresas", en: "Strawberries" },
  },
  {
    id: "yuzu",
    code: "YUZ",
    surchargeCents: 100,
    hue: "#C0B056",
    label: { es: "Yuzu", en: "Yuzu" },
  },
  {
    id: "hibiscus",
    code: "HIB",
    surchargeCents: 100,
    hue: "#9E4453",
    label: { es: "Hibiscus", en: "Hibiscus" },
  },
];

export const temps: Temp[] = [
  { id: "frio", code: "F", label: { es: "Frío", en: "Cold" } },
  { id: "templado", code: "T", label: { es: "Templado", en: "Warm" } },
];

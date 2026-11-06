import type { Locale } from "@/i18n/routing";
import type { AllergenId } from "@/lib/allergens";

/**
 * The real carta (carta_maisha_elegante_claro.pdf, 2026-11-05): the source
 * the back office and the counter are seeded from. Prices are IVA-included
 * cents. Choices that change a drink (usucha or latte, milk, extras,
 * flavours) are option groups, shared by the counter and, later, the web.
 *
 * Allergens are only filled where EU 1169/2011 makes them certain (dairy
 * milk = milk; oats = gluten). Everything else is for the owner to complete
 * from the supplier's product sheets before opening.
 */
type L = Record<Locale, string>;

export type CartaOption = {
  key: string;
  /** Three letters for the recipe code shown at the counter (LAT, AVE). */
  code?: string;
  /** The ingredient's natural colour, for the builder's live drink tint. */
  hue?: string;
  label: L;
  note?: L;
  priceDeltaCents: number;
  allergens?: AllergenId[];
};

export type CartaGroup = {
  slug: string;
  label: L;
  selection: "single" | "multiple";
  required: boolean;
  options: CartaOption[];
};

export type CartaItem = {
  name: string;
  priceCents: number;
  color: string;
  description: L;
  groups: string[];
  signature?: boolean;
  /** Region of Japan, shown on the carta tasting card. */
  origin?: L;
  /** Grade, shown as the card label (the description may open with it). */
  grade?: L;
};

export type CartaCategory = { slug: string; title: L; items: CartaItem[] };

const LATTE_CENTS = 140;

export const cartaGroups: CartaGroup[] = [
  {
    slug: "preparacion-matcha",
    label: { es: "Preparación", en: "Preparation" },
    selection: "single",
    required: true,
    options: [
      { key: "prep.usucha", code: "USU", label: { es: "Usucha", en: "Usucha" }, note: { es: "En agua", en: "In water" }, priceDeltaCents: 0 },
      { key: "prep.latte", code: "LAT", label: { es: "Latte", en: "Latte" }, priceDeltaCents: LATTE_CENTS },
    ],
  },
  {
    slug: "preparacion-te",
    label: { es: "Preparación", en: "Preparation" },
    selection: "single",
    required: true,
    options: [
      { key: "prep.solo", code: "SOL", label: { es: "Solo", en: "On its own" }, priceDeltaCents: 0 },
      { key: "prep.te-latte", code: "LAT", label: { es: "Latte", en: "Latte" }, priceDeltaCents: LATTE_CENTS },
    ],
  },
  {
    slug: "leche",
    label: { es: "Leche (solo latte)", en: "Milk (latte only)" },
    selection: "single",
    required: false,
    options: [
      { key: "leche.vaca", code: "LEC", hue: "#F1EADB", label: { es: "Leche", en: "Milk" }, priceDeltaCents: 0, allergens: ["milk"] },
      { key: "leche.avena", code: "AVE", hue: "#E6D9BC", label: { es: "Avena", en: "Oat" }, note: { es: "Vegetal", en: "Plant-based" }, priceDeltaCents: 0, allergens: ["gluten"] },
    ],
  },
  {
    slug: "extras",
    label: { es: "Extras para tu bebida", en: "Extras for your drink" },
    selection: "multiple",
    required: false,
    options: [
      { key: "extra.pure-mango", code: "MAN", hue: "#E8A33D", label: { es: "Puré de mango", en: "Mango purée" }, priceDeltaCents: 150 },
      { key: "extra.pure-fresa", code: "FRE", hue: "#D9707A", label: { es: "Puré de fresa", en: "Strawberry purée" }, priceDeltaCents: 150 },
      { key: "extra.pure-maracuya", code: "MAR", hue: "#E2B23C", label: { es: "Puré de fruta de la pasión", en: "Passion fruit purée" }, priceDeltaCents: 150 },
      { key: "extra.coconut-cloud", code: "CCL", hue: "#F4EFE3", label: { es: "Coconut Cloud", en: "Coconut Cloud" }, note: { es: "Capa ligera de crema de coco", en: "A light layer of coconut cream" }, priceDeltaCents: 150 },
      { key: "extra.ube", code: "UBE", hue: "#8C6BB1", label: { es: "Ube", en: "Ube" }, note: { es: "Ñame púrpura, dulce y antioxidante", en: "Purple yam, sweet and antioxidant" }, priceDeltaCents: 200 },
    ],
  },
  {
    slug: "sabor-mochi",
    label: { es: "Sabor", en: "Flavour" },
    selection: "single",
    required: true,
    options: [
      { key: "mochi.matcha", label: { es: "Matcha", en: "Matcha" }, priceDeltaCents: 0 },
      { key: "mochi.coco", label: { es: "Coco", en: "Coconut" }, priceDeltaCents: 0 },
      { key: "mochi.pistacho", label: { es: "Pistacho", en: "Pistachio" }, priceDeltaCents: 0, allergens: ["nuts"] },
    ],
  },
  {
    slug: "sabor-mochi-especial",
    label: { es: "Sabor", en: "Flavour" },
    selection: "single",
    required: true,
    options: [
      { key: "mochi.tiramisu", label: { es: "Tiramisú", en: "Tiramisu" }, priceDeltaCents: 0 },
      { key: "mochi.tarta-queso", label: { es: "Tarta de queso", en: "Cheesecake" }, priceDeltaCents: 0, allergens: ["milk"] },
    ],
  },
  {
    slug: "mezcla-yuzu",
    label: { es: "Con", en: "With" },
    selection: "single",
    required: true,
    options: [
      { key: "yuzu.tonica", label: { es: "Tónica", en: "Tonic" }, priceDeltaCents: 0 },
      { key: "yuzu.gas", label: { es: "Agua con gas", en: "Sparkling water" }, priceDeltaCents: 0 },
    ],
  },
];

const MATCHA_GROUPS = ["preparacion-matcha", "leche", "extras"];
const TEA_GROUPS = ["preparacion-te", "leche", "extras"];

export const carta: CartaCategory[] = [
  {
    slug: "matcha",
    title: { es: "Selección de matcha", en: "Matcha selection" },
    items: [
      {
        name: "Uji",
        origin: { es: "Uji, Kioto", en: "Uji, Kyoto" },
        grade: { es: "Ceremonial", en: "Ceremonial" },
        priceCents: 880,
        color: "#5F7A2C",
        signature: true,
        description: {
          es: "Ceremonial. Dulzor natural, umami profundo y textura sedosa, sin amargor.",
          en: "Ceremonial. Natural sweetness, deep umami and a silken texture, without bitterness.",
        },
        groups: MATCHA_GROUPS,
      },
      {
        name: "Nishio",
        origin: { es: "Nishio, Aichi", en: "Nishio, Aichi" },
        grade: { es: "Ceremonial tradicional", en: "Traditional ceremonial" },
        priceCents: 740,
        color: "#748A38",
        signature: true,
        description: {
          es: "Ceremonial tradicional. Aromático, fresco y equilibrado, de cuerpo cremoso.",
          en: "Traditional ceremonial. Aromatic, fresh and balanced, with a creamy body.",
        },
        groups: MATCHA_GROUPS,
      },
      {
        name: "Kagoshima",
        origin: { es: "Kagoshima, Kiushu", en: "Kagoshima, Kyushu" },
        grade: { es: "Calidad diaria", en: "Everyday grade" },
        priceCents: 620,
        color: "#8A9A4C",
        signature: true,
        description: {
          es: "Calidad diaria. Robusto y vegetal, con notas herbales intensas.",
          en: "Everyday grade. Robust and vegetal, with intense herbal notes.",
        },
        groups: MATCHA_GROUPS,
      },
    ],
  },
  {
    slug: "otros-tes",
    title: { es: "Otros tés japoneses", en: "Other Japanese teas" },
    items: [
      {
        name: "Hojicha",
        priceCents: 660,
        color: "#8A5A3B",
        signature: true,
        description: {
          es: "Té verde tostado al fuego. Muy bajo en cafeína, notas de frutos secos y un toque ahumado.",
          en: "Fire-roasted green tea. Very low in caffeine, with notes of nuts and a hint of smoke.",
        },
        groups: TEA_GROUPS,
      },
      {
        name: "Black Tea",
        priceCents: 660,
        color: "#5B3A2B",
        description: {
          es: "Wakōcha, té negro japonés molido. Estructurado, profundo y reconfortante.",
          en: "Wakōcha, ground Japanese black tea. Structured, deep and comforting.",
        },
        groups: TEA_GROUPS,
      },
    ],
  },
  {
    slug: "mochis",
    title: { es: "Mochis", en: "Mochis" },
    items: [
      {
        name: "Mochi",
        priceCents: 350,
        color: "#C8D29A",
        description: { es: "Matcha, coco o pistacho.", en: "Matcha, coconut or pistachio." },
        groups: ["sabor-mochi"],
      },
      {
        name: "Mochi especial",
        priceCents: 450,
        color: "#E6D9BF",
        description: { es: "Tiramisú o tarta de queso.", en: "Tiramisu or cheesecake." },
        groups: ["sabor-mochi-especial"],
      },
    ],
  },
  {
    slug: "otras-bebidas",
    title: { es: "Otras bebidas", en: "Other drinks" },
    items: [
      {
        name: "Zumo de naranja",
        priceCents: 950,
        color: "#E0912F",
        description: { es: "Natural, exprimido en frío.", en: "Natural, cold-pressed." },
        groups: [],
      },
      {
        name: "Yuzu",
        priceCents: 980,
        color: "#D8C451",
        description: { es: "Con tónica o agua con gas.", en: "With tonic or sparkling water." },
        groups: ["mezcla-yuzu"],
      },
    ],
  },
];

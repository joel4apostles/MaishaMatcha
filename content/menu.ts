import type { Locale } from "@/i18n/routing";

export type MenuItem = {
  id: string;
  /** Drink name — kept in Spanish as a proper noun, not localized. */
  name: string;
  price: string;
  /** The drink's natural hue, seen from above. Used for swatches + hover. */
  color: string;
  origin?: string;
  signature?: boolean;
  description: Record<Locale, string>;
};

export type MenuCategory = {
  id: string;
  title: Record<Locale, string>;
  items: MenuItem[];
};

/**
 * The carta, composed from the founder's ingredient list:
 * matcha · tónica · agua con gas · leche de coco · agua de coco
 * mango · yuzu · fresas · hibiscus
 * Prices are launch drafts, pending confirmation.
 */
export const menu: MenuCategory[] = [
  {
    id: "matcha",
    title: { es: "El matcha", en: "The matcha" },
    items: [
      {
        id: "matcha",
        color: "#6B7F5E",
        name: "Matcha",
        price: "4,50 €",
        origin: "Uji, Kioto",
        signature: true,
        description: {
          es: "Piedra, agua, espuma. Batido al momento.",
          en: "Stone, water, foam. Whisked to order.",
        },
      },
      {
        id: "matcha-coco",
        color: "#ADBB92",
        name: "Matcha Coco",
        price: "5,00 €",
        description: {
          es: "Leche de coco, templado o frío.",
          en: "Coconut milk, warm or cold.",
        },
      },
    ],
  },
  {
    id: "burbujas",
    title: { es: "Con burbujas", en: "With bubbles" },
    items: [
      {
        id: "matcha-tonica",
        color: "#93A96F",
        name: "Matcha Tónica",
        price: "5,50 €",
        signature: true,
        description: {
          es: "Tónica, hielo, piel de yuzu.",
          en: "Tonic water, ice, yuzu peel.",
        },
      },
      {
        id: "matcha-yuzu",
        color: "#C0B056",
        name: "Matcha Yuzu",
        price: "5,50 €",
        description: {
          es: "Cítrico japonés, agua con gas.",
          en: "Japanese citrus, sparkling water.",
        },
      },
    ],
  },
  {
    id: "fruta",
    title: { es: "Con fruta", en: "With fruit" },
    items: [
      {
        id: "matcha-mango",
        color: "#D69A3F",
        name: "Matcha Mango",
        price: "6,00 €",
        signature: true,
        description: {
          es: "Mango batido, leche de coco.",
          en: "Blended mango, coconut milk.",
        },
      },
      {
        id: "matcha-fresas",
        color: "#C97C82",
        name: "Matcha Fresas",
        price: "6,00 €",
        signature: true,
        description: {
          es: "Fresas de temporada, agua de coco.",
          en: "Seasonal strawberries, coconut water.",
        },
      },
    ],
  },
  {
    id: "sin-matcha",
    title: { es: "Sin matcha", en: "Without matcha" },
    items: [
      {
        id: "hibiscus",
        color: "#9E4453",
        name: "Hibiscus",
        price: "4,00 €",
        description: {
          es: "Infusión fría de hibisco.",
          en: "Cold hibiscus infusion.",
        },
      },
      {
        id: "agua-de-coco",
        color: "#DDD3B8",
        name: "Agua de coco",
        price: "3,50 €",
        description: {
          es: "Fría, tal cual.",
          en: "Cold, as it is.",
        },
      },
    ],
  },
];

/** The four signature preparations with their category, for the home preview. */
export function signatureItems(): {
  item: MenuItem;
  category: MenuCategory;
}[] {
  return menu.flatMap((category) =>
    category.items.filter((i) => i.signature).map((item) => ({ item, category })),
  );
}

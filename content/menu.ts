import type { Locale } from "@/i18n/routing";

export type MenuItem = {
  id: string;
  /** Drink name — kept in Spanish as a proper noun, not localized. */
  name: string;
  price: string;
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
        name: "Hibiscus",
        price: "4,00 €",
        description: {
          es: "Infusión fría de hibisco.",
          en: "Cold hibiscus infusion.",
        },
      },
      {
        id: "agua-de-coco",
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

/** The four signature preparations, for the home menu preview. */
export function signatureItems(): MenuItem[] {
  return menu.flatMap((c) => c.items).filter((i) => i.signature);
}

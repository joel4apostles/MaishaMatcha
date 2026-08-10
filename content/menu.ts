import type { Locale } from "@/i18n/routing";

export type MenuItem = {
  id: string;
  /** Drink name — a proper noun, not localized. */
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

export const menu: MenuCategory[] = [
  {
    id: "ceremonial",
    title: { es: "Ceremonial", en: "Ceremonial" },
    items: [
      {
        id: "usucha",
        name: "Usucha",
        price: "4,50 €",
        origin: "Uji, Kioto",
        signature: true,
        description: {
          es: "Matcha batido con agua. Ligero, herbáceo, sin leche.",
          en: "Matcha whisked with water. Light, grassy, no milk.",
        },
      },
      {
        id: "koicha",
        name: "Koicha",
        price: "7,00 €",
        origin: "Uji, Kioto",
        signature: true,
        description: {
          es: "Matcha espeso, de hoja joven. Denso, dulce, para detenerse.",
          en: "Thick matcha from young leaf. Dense, sweet, made to pause over.",
        },
      },
    ],
  },
  {
    id: "lattes",
    title: { es: "Lattes", en: "Lattes" },
    items: [
      {
        id: "matcha-latte",
        name: "Matcha latte",
        price: "4,80 €",
        signature: true,
        description: {
          es: "Matcha y leche de avena. Redondo, templado.",
          en: "Matcha and oat milk. Round, warm.",
        },
      },
      {
        id: "hojicha-latte",
        name: "Hōjicha latte",
        price: "4,50 €",
        description: {
          es: "Té verde tostado y avena. Notas de madera y caramelo.",
          en: "Roasted green tea and oat. Wood and caramel notes.",
        },
      },
    ],
  },
  {
    id: "especiales",
    title: { es: "Especiales", en: "Specials" },
    items: [
      {
        id: "estacional",
        name: "De temporada",
        price: "5,50 €",
        description: {
          es: "La preparación del mes, según la fruta y la hora.",
          en: "The preparation of the month, by season and hour.",
        },
      },
      {
        id: "omakase",
        name: "Omakase del barista",
        price: "6,00 €",
        signature: true,
        description: {
          es: "Sin carta. El barista elige por ti.",
          en: "No menu. The barista chooses for you.",
        },
      },
    ],
  },
  {
    id: "dulces",
    title: { es: "Dulces", en: "Sweets" },
    items: [
      {
        id: "dorayaki",
        name: "Dorayaki de matcha",
        price: "3,50 €",
        description: {
          es: "Dos discos de bizcocho, relleno de judía dulce.",
          en: "Two soft rounds, sweet red-bean filling.",
        },
      },
      {
        id: "warabi",
        name: "Warabi mochi",
        price: "4,00 €",
        description: {
          es: "Gelatina fresca de helecho, kinako y matcha.",
          en: "Cool bracken jelly, kinako and matcha.",
        },
      },
    ],
  },
];

/** The four signature preparations, for the home menu preview. */
export function signatureItems(): MenuItem[] {
  return menu.flatMap((c) => c.items).filter((i) => i.signature);
}

import type { Locale } from "@/i18n/routing";

/**
 * Site-wide constants. Contact/address values are placeholders to be
 * replaced before or shortly after launch.
 */
export const site = {
  name: "maisha matcha",
  city: "Murcia",
  country: "España",
  email: "hola@maishamatcha.es",
  instagram: "@maishamatcha",
  instagramUrl: "https://instagram.com/maishamatcha",
  // Placeholder address / geo for JSON-LD and the footer.
  address: "Centro de Murcia",
  geo: { lat: 37.9834, lng: -1.128 },
} as const;

const hours: Record<Locale, string> = {
  es: "Mar a Dom · 9:00 a 20:00 (provisional)",
  en: "Tue to Sun · 9:00 to 20:00 (provisional)",
};

export function siteHours(locale: Locale): string {
  return hours[locale];
}

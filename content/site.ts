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
  // Address from the founder (2026-11-05). geo is still approximate (city
  // centre): replace with the exact pin from Google Maps.
  address: "Plaza Cetina, 3",
  geo: { lat: 37.9834, lng: -1.128 },
} as const;

/** Opens the phone's maps app on the salon. */
export const siteMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `maisha matcha, ${site.address}, ${site.city}`,
)}`;

const hours: Record<Locale, string> = {
  es: "Mar a Dom · 8:00 a 18:00 (días por confirmar)",
  en: "Tue to Sun · 8:00 to 18:00 (days to be confirmed)",
};

export function siteHours(locale: Locale): string {
  return hours[locale];
}

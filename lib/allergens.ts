import type { Locale } from "@/i18n/routing";

/**
 * The 14 allergens of EU Regulation 1169/2011, Annex II. Shown on the
 * website and the POS. Ids are stable; labels are localized.
 */
export const ALLERGENS = [
  { id: "gluten", label: { es: "Gluten", en: "Gluten" } },
  { id: "crustaceans", label: { es: "Crustáceos", en: "Crustaceans" } },
  { id: "eggs", label: { es: "Huevo", en: "Eggs" } },
  { id: "fish", label: { es: "Pescado", en: "Fish" } },
  { id: "peanuts", label: { es: "Cacahuetes", en: "Peanuts" } },
  { id: "soy", label: { es: "Soja", en: "Soy" } },
  { id: "milk", label: { es: "Leche", en: "Milk" } },
  { id: "nuts", label: { es: "Frutos de cáscara", en: "Tree nuts" } },
  { id: "celery", label: { es: "Apio", en: "Celery" } },
  { id: "mustard", label: { es: "Mostaza", en: "Mustard" } },
  { id: "sesame", label: { es: "Sésamo", en: "Sesame" } },
  { id: "sulphites", label: { es: "Sulfitos", en: "Sulphites" } },
  { id: "lupin", label: { es: "Altramuces", en: "Lupin" } },
  { id: "molluscs", label: { es: "Moluscos", en: "Molluscs" } },
] as const satisfies ReadonlyArray<{ id: string; label: Record<Locale, string> }>;

export type AllergenId = (typeof ALLERGENS)[number]["id"];

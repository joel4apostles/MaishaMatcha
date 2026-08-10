import type { Locale } from "@/i18n/routing";

export type EventItem = {
  id: string;
  title: Record<Locale, string>;
  when: Record<Locale, string>;
  description: Record<Locale, string>;
  membersOnly: boolean;
};

export const events: EventItem[] = [
  {
    id: "cata-apertura",
    title: { es: "Cata de apertura", en: "Opening tasting" },
    when: { es: "Fecha por anunciar", en: "Date to be announced" },
    description: {
      es: "Una cata guiada de grados ceremoniales, del usucha al koicha. Diez lugares.",
      en: "A guided tasting of ceremonial grades, from usucha to koicha. Ten places.",
    },
    membersOnly: true,
  },
  {
    id: "tarde-ceremonia",
    title: { es: "Tarde de ceremonia", en: "Ceremony evening" },
    when: { es: "Fecha por anunciar", en: "Date to be announced" },
    description: {
      es: "Una demostración de chanoyu con un invitado. Luz baja, pocos asientos.",
      en: "A chanoyu demonstration with a guest. Low light, few seats.",
    },
    membersOnly: true,
  },
];

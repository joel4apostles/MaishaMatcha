import type { Locale } from "@/i18n/routing";

export type StoryChapter = {
  id: string;
  era: Record<Locale, string>;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
};

export const story: StoryChapter[] = [
  {
    id: "tang",
    era: { es: "China · s. VIII", en: "China · 8th c." },
    title: { es: "El primer libro del té", en: "The first book of tea" },
    body: {
      es: "En la dinastía Tang, Lu Yu escribe el Cha Jing, el clásico del té. El té se prensaba en tortas, se molía y se hervía. Ya entonces era materia y método: agua, fuego, medida.",
      en: "In the Tang dynasty, Lu Yu writes the Cha Jing, the classic of tea. Tea was pressed into cakes, ground, and boiled. Even then it was matter and method: water, fire, measure.",
    },
  },
  {
    id: "song",
    era: { es: "China · s. XI", en: "China · 11th c." },
    title: { es: "El té batido", en: "Whisked tea" },
    body: {
      es: "En la dinastía Song aparece el diancha: el té en polvo batido en el cuenco hasta la espuma. Se celebran torneos para juzgar el color y la textura. El gesto que hoy conocemos empieza aquí.",
      en: "In the Song dynasty comes diancha: powdered tea whisked in the bowl to a froth. Contests judged colour and texture. The gesture we know today begins here.",
    },
  },
  {
    id: "eisai",
    era: { es: "Japón · 1191", en: "Japan · 1191" },
    title: { es: "Eisai trae la semilla", en: "Eisai brings the seed" },
    body: {
      es: "El monje zen Eisai vuelve de China con semillas y con el modo de batir el té. Años después escribe el Kissa Yōjōki: beber té para cuidar la vida. El matcha echa raíces en Japón.",
      en: "The Zen monk Eisai returns from China with seeds and with the way of whisking tea. Years later he writes the Kissa Yōjōki: drink tea to care for life. Matcha takes root in Japan.",
    },
  },
  {
    id: "rikyu",
    era: { es: "Japón · s. XVI", en: "Japan · 16th c." },
    title: { es: "Sen no Rikyū y el chanoyu", en: "Sen no Rikyū and chanoyu" },
    body: {
      es: "El maestro Sen no Rikyū depura la ceremonia del té. Una sala pequeña, pocos objetos, un solo encuentro. El lujo se vuelve atención: cada gesto cuenta, nada sobra.",
      en: "The master Sen no Rikyū distils the tea ceremony. A small room, few objects, a single meeting. Luxury becomes attention: every gesture counts, nothing is spare.",
    },
  },
  {
    id: "wabisabi",
    era: { es: "Estética", en: "Aesthetic" },
    title: { es: "Wabi-sabi", en: "Wabi-sabi" },
    body: {
      es: "De aquel silencio nace una idea de belleza: lo sencillo, lo desgastado, lo que pasa. Un cuenco irregular vale más que uno perfecto. La imperfección, mirada con calma, es plena.",
      en: "From that silence comes an idea of beauty: the plain, the worn, the passing. An uneven bowl is worth more than a perfect one. Imperfection, seen calmly, is complete.",
    },
  },
  {
    id: "cultivo",
    era: { es: "El campo", en: "The field" },
    title: { es: "Sombra, piedra, grado", en: "Shade, stone, grade" },
    body: {
      es: "Semanas antes de la cosecha, la planta se cubre. La sombra concentra el verde y el dulzor. La hoja se seca sin nervios (tencha) y se muele en piedra. De ahí el grado ceremonial.",
      en: "Weeks before harvest the plant is shaded. Shade concentrates green and sweetness. The leaf is dried without veins (tencha) and ground on stone. From that comes the ceremonial grade.",
    },
  },
  {
    id: "uji",
    era: { es: "Uji, Kioto", en: "Uji, Kyoto" },
    title: { es: "El origen", en: "The origin" },
    body: {
      es: "En las colinas de Uji, junto a Kioto, el matcha encuentra su casa desde hace siglos. Agua, niebla y paciencia. De ahí viene la hoja que servimos.",
      en: "In the hills of Uji, near Kyoto, matcha has found its home for centuries. Water, mist and patience. From there comes the leaf we serve.",
    },
  },
  {
    id: "murcia",
    era: { es: "Murcia · hoy", en: "Murcia · today" },
    title: { es: "Por qué aquí, por qué ahora", en: "Why here, why now" },
    body: {
      es: "Murcia tiene luz y huerta, y un modo pausado de estar. Traemos el matcha a una ciudad que sabe esperar la fruta. Un salón para beber despacio, entre madera y verde.",
      en: "Murcia has light and orchard, and an unhurried way of being. We bring matcha to a city that knows how to wait for fruit. A salon to drink slowly, among wood and green.",
    },
  },
];

import { Fraunces, Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";

// Brand-kit typography: the kit's serif has warm, rounded terminals —
// Fraunces (soft optical serif) is its closest Google face. Body stays
// Hanken Grotesk, already the kit's warm-rounded sans register.
// Shared by the public site and the counter (POS) so both read as one.
// latin-ext carries ū and ō (Rikyū, Wakōcha): without it those glyphs
// fall back to another face and the macron floats.
export const serif = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif-brand",
  display: "swap",
});

export const sans = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-hanken",
  display: "swap",
});

// The kanji (一期一会, 和敬清寂, 抹茶, the story's era characters) in a real
// brush-calligraphy face, Yuji Syuku. Fraunces has no Japanese glyphs. A
// subset holding only the characters the site uses (lib/brushGlyphs.ts):
// one 12.5 KB file instead of 146 @font-face slices in the blocking CSS.
export const brush = localFont({
  src: "../app/fonts/yuji-syuku-subset.woff2",
  weight: "400",
  variable: "--font-brush-face",
  display: "swap",
});

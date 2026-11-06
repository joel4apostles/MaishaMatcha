import { Fraunces, Hanken_Grotesk, Yuji_Syuku } from "next/font/google";

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

// The story's era characters (茶 点 禅 …) in a real brush-calligraphy face.
// Fraunces has no Japanese glyphs, so they fell back to a blocky system
// gothic. Google serves this font in unicode-range slices: the browser only
// downloads the slices holding the eight characters on the page. Not preloaded.
export const brush = Yuji_Syuku({
  weight: "400",
  variable: "--font-brush-face",
  display: "swap",
  preload: false,
});

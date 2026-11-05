import { Fraunces, Hanken_Grotesk } from "next/font/google";

// Brand-kit typography: the kit's serif has warm, rounded terminals —
// Fraunces (soft optical serif) is its closest Google face. Body stays
// Hanken Grotesk, already the kit's warm-rounded sans register.
// Shared by the public site and the counter (POS) so both read as one.
export const serif = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif-brand",
  display: "swap",
});

export const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-hanken",
  display: "swap",
});

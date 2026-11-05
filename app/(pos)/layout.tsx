import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { sans, serif } from "@/lib/fonts";
import es from "@/messages/es.json";
import "../globals.css";

/**
 * Root layout for the counter (POS and, in Phase 2, the KDS). Staff work
 * in Spanish; the same brand fonts and tokens as the public site. Never
 * indexed. No analytics on the counter.
 */
export const metadata: Metadata = {
  title: "Barra · maisha matcha",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E8",
  width: "device-width",
  initialScale: 1,
};

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-washi font-sans text-sumi antialiased">
        <NextIntlClientProvider locale="es" messages={{ pos: es.pos }}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { ReactNode } from "react";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { routing } from "@/i18n/routing";
import { pickClientMessages } from "@/i18n/clientMessages";
import { brush, sans, serif } from "@/lib/fonts";
import { KeyboardSafeFields } from "@/components/KeyboardSafeFields";
import "../globals.css";

// Android shrinks the page when the keyboard opens instead of covering it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Only what client components read reaches the browser (the counter's
  // strings, the legal text and the rest stay on the server).
  const messages = pickClientMessages(await getMessages());

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable} ${brush.variable}`}>
      <body className="min-h-dvh bg-washi font-sans text-sumi antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <KeyboardSafeFields />
        <Analytics />
      </body>
    </html>
  );
}

import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { confirmOptIn } from "@/lib/members";

/**
 * Confirm the waiting-list email (double opt-in). GET shows a one-button
 * page, so link scanners that prefetch cannot confirm anyone; POST acts.
 */
const page = (body: string) =>
  new NextResponse(
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>maisha matcha</title>
<body style="background:#F5F1E8;color:#1C1B18;font-family:Helvetica,Arial,sans-serif;max-width:32rem;margin:0 auto;padding:4rem 1.5rem;line-height:1.6">
<p style="font-weight:500;color:#786000">maisha matcha</p>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  const safe = encodeURIComponent(t);
  return page(`<h1 style="font-family:Georgia,serif;font-weight:300">Confirmar tu correo</h1>
<p>Recibirás noticias de la apertura y de las plazas de socio fundador. Puedes darte de baja en cualquier carta. <span lang="en">(Confirm your email to hear about the opening.)</span></p>
<form method="post" action="/api/members/confirm?t=${safe}"><button style="min-height:48px;padding:0 1.5rem;background:#1C1B18;color:#F5F1E8;border:0;border-radius:2px;font-size:15px">Confirmar</button></form>`);
}

export async function POST(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  const ok = await confirmOptIn(await getPayload({ config }), t);
  return page(ok ? `<h1 style="font-family:Georgia,serif;font-weight:300">Gracias</h1><p>Correo confirmado. Te escribiremos antes de la apertura.</p>` : `<p>Este enlace no es válido o ha caducado.</p>`);
}

import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { unsubscribe } from "@/lib/members";

/**
 * Unsubscribe. POST is RFC 8058 one-click (mail clients call it); GET shows
 * a one-button page, so link scanners that prefetch cannot unsubscribe
 * anyone by accident.
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
  return page(`<h1 style="font-family:Georgia,serif;font-weight:300">Darse de baja</h1>
<p>No recibirás más cartas por email. Tu cuenta sigue igual. <span lang="en">(Unsubscribe from our letters.)</span></p>
<form method="post" action="/api/members/unsubscribe?t=${safe}"><button style="min-height:48px;padding:0 1.5rem;background:#1C1B18;color:#F5F1E8;border:0;border-radius:2px;font-size:15px">Darme de baja</button></form>`);
}

export async function POST(request: Request) {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  const oneClick = (await request.text().catch(() => "")).includes("List-Unsubscribe=One-Click");
  const ok = await unsubscribe(await getPayload({ config }), t);
  if (oneClick) return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
  return page(ok ? `<h1 style="font-family:Georgia,serif;font-weight:300">Hecho</h1><p>Ya no recibirás cartas por email.</p>` : `<p>Este enlace no es válido.</p>`);
}

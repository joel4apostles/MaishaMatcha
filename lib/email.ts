/**
 * Transactional email through Resend's HTTP API. Without RESEND_API_KEY
 * nothing is sent and the caller is told so (never throws, never leaks
 * configuration). Plain, brand-quiet HTML.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; status: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, status: "no-key" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? "maisha matcha <hola@maishamatcha.es>", to, subject, html }),
    });
    return { sent: res.ok, status: res.ok ? "sent" : `http-${res.status}` };
  } catch {
    return { sent: false, status: "network" };
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** The house email frame: washi paper, sumi ink, serif headline. */
export function emailFrame(title: string, body: string) {
  return `<div style="background:#F5F1E8;padding:32px 24px;font-family:Helvetica,Arial,sans-serif;color:#1C1B18;line-height:1.6">
  <p style="font-family:Georgia,serif;font-size:14px;letter-spacing:0.08em;margin:0 0 24px">maisha matcha</p>
  <h1 style="font-family:Georgia,serif;font-weight:300;font-size:26px;margin:0 0 16px">${escapeHtml(title)}</h1>
  ${body}
  <p style="font-size:13px;opacity:0.7;margin-top:32px">Plaza Cetina, 3 · Murcia</p></div>`;
}

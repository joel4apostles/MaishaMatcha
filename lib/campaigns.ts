import type { Payload, PayloadRequest } from "payload";
import { emailFrame, escapeHtml } from "@/lib/email";
import { unsubscribeToken } from "@/lib/members";

/**
 * Sending email letters. Only to members who opted in, in the letter's
 * language, with a one-click unsubscribe (RFC 8058 headers + a link).
 * Resend's batch endpoint takes 100 emails per call; the free plan allows
 * 100 a day, so large lists need a paid plan or several days.
 */
type CampaignDoc = { id: number; subject: string; title: string; body: string; audience: string; locale: string; sendTestTo?: string | null };

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function campaignHtml(c: Pick<CampaignDoc, "title" | "body" | "locale">, unsubscribeUrl: string) {
  const paragraphs = c.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const es = c.locale !== "en";
  return emailFrame(
    c.title,
    `${paragraphs}<p style="font-size:12px;opacity:0.7;margin-top:28px">${es ? "Recibes esta carta porque lo aceptaste en tu cuenta." : "You receive this letter because you said yes in your account."} <a style="color:#1C1B18" href="${escapeHtml(unsubscribeUrl)}">${es ? "Darse de baja" : "Unsubscribe"}</a></p>`,
  );
}

async function sendBatch(emails: { to: string; subject: string; html: string; unsub: string }[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 0;
  const from = process.env.RESEND_FROM ?? "maisha matcha <hola@maishamatcha.es>";
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(
      emails.map((e) => ({
        from,
        to: e.to,
        subject: e.subject,
        html: e.html,
        headers: { "List-Unsubscribe": `<${e.unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      })),
    ),
  }).catch(() => null);
  return res?.ok ? emails.length : 0;
}

export async function campaignRecipients(payload: Payload, c: Pick<CampaignDoc, "audience" | "locale">, req?: PayloadRequest) {
  const { docs } = await payload.find({
    req,
    collection: "members",
    overrideAccess: true,
    depth: 0,
    limit: 10000,
    where: {
      and: [
        { emailOptIn: { equals: true } },
        { status: { equals: "active" } },
        { locale: { equals: c.locale } },
        ...(c.audience === "founding" ? [{ tier: { equals: "founding" } }] : []),
      ],
    },
  });
  return docs;
}

export async function sendCampaignTest(payload: Payload, c: CampaignDoc) {
  if (!c.sendTestTo) return;
  const unsub = `${site()}/api/members/unsubscribe?t=test`;
  await sendBatch([{ to: c.sendTestTo, subject: `[Prueba] ${c.subject}`, html: campaignHtml(c, unsub), unsub }]);
}

/**
 * Send once, from the approving save itself (same request and transaction,
 * so the status moves approved → sent and can never be sent twice).
 */
export async function sendCampaign(payload: Payload, c: CampaignDoc, req?: PayloadRequest) {
  const people = await campaignRecipients(payload, c, req);
  let sent = 0;
  for (let i = 0; i < people.length; i += 100) {
    const chunk = people.slice(i, i + 100).map((m) => {
      const unsub = `${site()}/api/members/unsubscribe?t=${encodeURIComponent(unsubscribeToken(m.id))}`;
      return { to: m.email, subject: c.subject, html: campaignHtml(c, unsub), unsub };
    });
    sent += await sendBatch(chunk);
  }
  await payload.update({
    collection: "campaigns",
    id: c.id,
    req,
    overrideAccess: true,
    context: { system: true },
    data: { status: "sent", sentCount: sent, sentAt: new Date().toISOString() },
  });
  return sent;
}

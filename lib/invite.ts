import { randomBytes } from "node:crypto";
import type { Payload } from "payload";
import { emailFrame, escapeHtml, sendEmail } from "@/lib/email";

/**
 * Invite someone to the back office: the owner types a name, an email and
 * a role; the account is created with a random password nobody knows, and
 * the person gets a link to set their own (7 days). Their first sign-in then
 * asks them to set up the authenticator code. Without email configured the
 * link comes back so the owner can pass it on by hand.
 */
export const INVITE_DAYS = 7;
export type InviteRole = "owner" | "manager";

export const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export async function inviteStaff(payload: Payload, input: { name: string; email: string; role: InviteRole }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const taken = await payload.count({ collection: "users", overrideAccess: true, where: { email: { equals: email } } });
  if (taken.totalDocs) return { ok: false as const, error: "exists" };
  await payload.create({
    collection: "users",
    overrideAccess: true,
    data: { email, name, role: input.role, active: true, password: randomBytes(32).toString("base64url") } as never,
  });
  const token = await payload.forgotPassword({
    collection: "users",
    data: { email },
    disableEmail: true,
    expiration: INVITE_DAYS * 24 * 60 * 60 * 1000,
  });
  const link = `${siteOrigin()}/admin/reset/${token}`;
  const sent = await sendEmail(
    email,
    "Te invitamos a la administración de maisha matcha",
    emailFrame(
      `Hola, ${name.split(" ")[0]}`,
      `<p>Te han dado acceso a la administración de maisha matcha. Elige tu contraseña aquí (el enlace vale ${INVITE_DAYS} días):</p>
       <p><a style="color:#1C1B18" href="${escapeHtml(link)}">Crear mi contraseña</a></p>
       <p>Al entrar por primera vez te pediremos un segundo paso: escanear un código con una app de autenticación en tu móvil.</p>`,
    ),
  );
  return { ok: true as const, link, sent: sent.sent };
}

/** The password-reset email, in the house frame (Payload builds the token). */
export function resetEmailHTML({ token, user }: { token?: string; user?: { name?: string | null } }) {
  const link = `${siteOrigin()}/admin/reset/${token ?? ""}`;
  return emailFrame(
    "Una contraseña nueva",
    `<p>Hola${user?.name ? `, ${escapeHtml(String(user.name).split(" ")[0])}` : ""}. Para elegir una contraseña nueva, abre este enlace (vale una hora):</p>
     <p><a style="color:#1C1B18" href="${escapeHtml(link)}">Elegir contraseña</a></p>
     <p>Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.</p>`,
  );
}

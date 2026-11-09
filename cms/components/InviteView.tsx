import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { verifiedBackOffice } from "@/lib/auth/roles";
import { INVITE_DAYS } from "@/lib/invite";
import { InviteForm } from "./InviteForm";

/**
 * "Invitar": the owner adds an owner or manager by email; that person
 * chooses their own password. Baristas are added in Equipo with a PIN
 * (they never sign in here).
 */
const WORDS = {
  es: {
    title: "Invitar a alguien",
    intro: `Para encargados y propietarios. Recibe un enlace para elegir su contraseña (vale ${INVITE_DAYS} días) y, al entrar, activa su código de acceso. Los baristas se añaden en Equipo con su PIN.`,
    forbidden: "Solo el propietario puede invitar.",
    name: "Nombre", email: "Correo", role: "Rol", owner: "Propietario", manager: "Encargado", send: "Enviar invitación",
    manual: `El correo aún no está configurado. Envíale este enlace tú mismo (vale ${INVITE_DAYS} días):`,
    copy: "Copiar enlace", copied: "Copiado", sent: "Invitación enviada a {email}.",
    errors: { invalid: "Revisa el nombre y el correo.", forbidden: "Solo el propietario puede invitar.", exists: "Ya hay una cuenta con ese correo.", generic: "No se ha podido. Prueba otra vez." },
  },
  en: {
    title: "Invite someone",
    intro: `For managers and owners. They get a link to choose their password (valid ${INVITE_DAYS} days) and set up their sign-in code on first entry. Baristas are added in Team with their PIN.`,
    forbidden: "Only the owner can invite.",
    name: "Name", email: "Email", role: "Role", owner: "Owner", manager: "Manager", send: "Send invitation",
    manual: `Email is not set up yet. Send them this link yourself (valid ${INVITE_DAYS} days):`,
    copy: "Copy link", copied: "Copied", sent: "Invitation sent to {email}.",
    errors: { invalid: "Check the name and email.", forbidden: "Only the owner can invite.", exists: "There is already an account with that email.", generic: "That did not work. Try again." },
  },
} as const;

export function InviteView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const lang = req.i18n.language === "en" ? "en" : "es";
  const T = WORDS[lang];
  const allowed = verifiedBackOffice(req.user, "owner");
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div className="maisha-dash">
          <div className="md-head">
            <div>
              <h1>{T.title}</h1>
              <p className="md-sub md-measure">{allowed ? T.intro : T.forbidden}</p>
            </div>
          </div>
          {allowed ? (
            <section className="md-box md-narrow">
              <InviteForm w={T} />
            </section>
          ) : null}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}

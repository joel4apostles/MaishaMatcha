import Link from "next/link";
import type { I18nClient } from "@payloadcms/translations";

/** Above the Team list: owners and managers are invited, baristas added with a PIN. */
export function InviteLink({ i18n }: { i18n?: I18nClient }) {
  const en = i18n?.language === "en";
  return (
    <div className="maisha-invite-link">
      <p>
        {en
          ? "Owners and managers: invite them by email and they choose their own password. Baristas: Create new, with a PIN."
          : "Propietarios y encargados: invítalos por correo y eligen su propia contraseña. Baristas: Crear nuevo, con su PIN."}
      </p>
      <Link href="/admin/invitar">{en ? "Invite someone" : "Invitar a alguien"}</Link>
    </div>
  );
}

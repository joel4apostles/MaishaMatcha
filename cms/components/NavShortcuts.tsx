import Link from "next/link";
import type { I18nClient } from "@payloadcms/translations";
import { hasRole } from "@/lib/auth/roles";

/**
 * Shortcuts in the sidebar after the groups: the waiting list (members of
 * type "Lista de espera", owner and manager), "Cajas del mes" (owner and
 * manager) and "Invitar a alguien" (owner). The pages check again; this
 * only decides what to show.
 */
export function NavShortcuts({ i18n, user }: { i18n?: I18nClient; user?: Parameters<typeof hasRole>[0] }) {
  const en = i18n?.language === "en";
  const backOffice = hasRole(user, "owner", "manager");
  if (!backOffice) return null;
  return (
    <div className="nav-group maisha-nav-shortcuts">
      <p className="maisha-nav-label">{en ? "Shortcuts" : "Atajos"}</p>
      <Link className="nav__link" href="/admin/collections/members?where[tier][equals]=waitlist">
        <span className="nav__link-label">{en ? "Waiting list" : "Lista de espera"}</span>
      </Link>
      <Link className="nav__link" href="/admin/cajas">
        <span className="nav__link-label">{en ? "This month's boxes" : "Cajas del mes"}</span>
      </Link>
      {hasRole(user, "owner") ? (
        <Link className="nav__link" href="/admin/invitar">
          <span className="nav__link-label">{en ? "Invite someone" : "Invitar a alguien"}</span>
        </Link>
      ) : null}
    </div>
  );
}

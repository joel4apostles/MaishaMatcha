import Link from "next/link";
import type { I18nClient } from "@payloadcms/translations";
import { hasRole } from "@/lib/auth/roles";
import { NavFold } from "./NavFold";

/**
 * "Hoy", the top of the sidebar (2026-11-13): what the owner opens most, in
 * the order of the day. The till (Caja), the waiting list, this month's
 * boxes (owner and manager) and inviting someone (owner). The pages check
 * again; this only decides what to show. Icons come from custom.scss
 * (data-ico). NavFold folds "Más herramientas" the first time only.
 */
export function NavShortcuts({ i18n, user }: { i18n?: I18nClient; user?: Parameters<typeof hasRole>[0] }) {
  const en = i18n?.language === "en";
  if (!hasRole(user, "owner", "manager")) return null;
  const links = [
    { href: "/pos", ico: "pos", label: en ? "Open the till" : "Abrir la caja", newTab: true },
    { href: "/admin/collections/members?where[tier][equals]=waitlist", ico: "waitlist", label: en ? "Waiting list" : "Lista de espera" },
    { href: "/admin/cajas", ico: "boxes", label: en ? "This month's boxes" : "Cajas del mes" },
    ...(hasRole(user, "owner") ? [{ href: "/admin/invitar", ico: "invite", label: en ? "Invite someone" : "Invitar a alguien" }] : []),
  ];
  return (
    <div className="maisha-nav-shortcuts">
      <p className="maisha-nav-label">{en ? "Today" : "Hoy"}</p>
      {links.map((l) => (
        <Link
          key={l.href}
          className="nav__link maisha-nav-link"
          data-ico={l.ico}
          href={l.href}
          {...(l.newTab ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          <span className="nav__link-label">{l.label}</span>
        </Link>
      ))}
      <NavFold labels={["Más herramientas", "More tools"]} />
    </div>
  );
}

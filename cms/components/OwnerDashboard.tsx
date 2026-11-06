import type { Payload } from "payload";
import Link from "next/link";
import { Gutter } from "@payloadcms/ui";
import { inventoryAlerts } from "@/lib/inventory";
import { madridDay, today } from "@/lib/reports";
import { COLLECTION_NOTES, SECONDARY, setupSteps } from "@/lib/dashboard";

/**
 * The admin home (replaces Payload's tile grid): today at a glance, the
 * launch checklist until everything is set, what is waiting on the owner,
 * quick actions, and every collection as a compact list with counts.
 * Server component; the admin is owner/manager only.
 */
const euro = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

const METHOD: Record<string, string> = {
  cash: "Efectivo",
  card_terminal: "Tarjeta (datáfono)",
  card_stripe: "Tarjeta (Stripe)",
  online: "Online",
};
const CHANNEL: Record<string, string> = { counter: "Barra", online: "Web", table: "Mesa" };

type Label = string | Record<string, string>;
type NavGroup = { label: string; entities: { label: Label; slug: string; type: string }[] };
const text = (l: Label) => (typeof l === "string" ? l : (l.es ?? Object.values(l)[0] ?? ""));

/** The same moment a week ago, and now (server render, per request). */
const clock = () => ({ now: new Date(), weekAgo: new Date(Date.now() - 7 * 86400000) });

type Pending = { key: string; text: string; href: string };

export async function OwnerDashboardView({ payload, navGroups = [] }: { payload: Payload; navGroups?: NavGroup[] }) {
  const business = await payload.findGlobal({ slug: "business", overrideAccess: true });
  const { now: nowDate, weekAgo: lastWeek } = clock();
  const now = nowDate.toISOString();
  const shopCategories = await payload.find({ collection: "menu-categories", overrideAccess: true, depth: 0, limit: 50, where: { shop: { equals: true } } });
  const shopIds = shopCategories.docs.map((c) => c.id);

  const [t, before, alerts, webOrders, refundFlags, draftLetters, shopProducts, upcomingEvents] = await Promise.all([
    today(payload),
    today(payload, lastWeek),
    inventoryAlerts(payload, business.targetMarginPercent ?? 65),
    payload.count({
      collection: "orders",
      overrideAccess: true,
      where: {
        and: [
          { channel: { in: ["online", "table"] } },
          { kind: { equals: "sale" } },
          { status: { in: ["received", "preparing"] } },
          { or: [{ payOnline: { not_equals: true } }, { paymentStatus: { equals: "paid" } }] },
        ],
      },
    }),
    payload.count({ collection: "orders", overrideAccess: true, where: { and: [{ note: { like: "DEVOLVER" } }, { paymentStatus: { equals: "paid" } }] } }),
    payload.count({ collection: "campaigns", overrideAccess: true, where: { status: { equals: "draft" } } }),
    shopIds.length
      ? payload.count({ collection: "menu-items", overrideAccess: true, where: { and: [{ category: { in: shopIds } }, { available: { equals: true } }] } })
      : Promise.resolve({ totalDocs: 0 }),
    payload.count({ collection: "events", overrideAccess: true, where: { startsAt: { greater_than: now } } }),
  ]);

  const steps = setupSteps({
    legalName: business.legalName,
    nif: business.nif,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    email: Boolean(process.env.RESEND_API_KEY),
    shopProducts: shopProducts.totalDocs,
    foundingReady: Boolean(business.foundingOpen && business.foundingPriceCents && business.foundingTaxRate),
    upcomingEvents: upcomingEvents.totalDocs,
    onlineOrdering: Boolean(business.onlineOrdering),
  });
  const done = steps.filter((s) => s.done).length;

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const pending: Pending[] = [
    ...(webOrders.totalDocs ? [{ key: "web", text: `${plural(webOrders.totalDocs, "pedido web o de mesa", "pedidos web o de mesa")} por preparar`, href: "/admin/collections/orders" }] : []),
    ...(refundFlags.totalDocs ? [{ key: "refund", text: `${plural(refundFlags.totalDocs, "pago", "pagos")} marcado DEVOLVER: devuélvelo en Stripe y marca el pedido como devuelto`, href: "/admin/collections/orders" }] : []),
    ...alerts.draftOrders.map((d) => ({ key: `po-${d.id}`, text: `Pedido ${d.label} a ${d.supplier} por aprobar · ${euro(d.totalCents)}`, href: `/admin/collections/purchase-orders/${d.id}` })),
    ...(draftLetters.totalDocs ? [{ key: "letters", text: `${plural(draftLetters.totalDocs, "carta", "cartas")} por email en borrador`, href: "/admin/collections/campaigns" }] : []),
    ...alerts.lowStock.map((a) => ({ key: `low-${a.id}`, text: `Stock bajo: ${a.name} · ${a.stock} ${a.unit}`, href: `/admin/collections/inventory-items/${a.id}` })),
    ...alerts.expiring.map((b) => ({ key: `exp-${b.id}`, text: `Caduca pronto: ${b.name}${b.expiresOn ? ` · ${new Date(b.expiresOn).toLocaleDateString("es-ES")}` : ""}`, href: "/admin/collections/batches" })),
    ...alerts.lowMargin.map((m) => ({ key: `mar-${m.id}`, text: `Margen bajo: ${m.name} · ${m.marginPercent} %`, href: "/admin/collections/recipe-lines" })),
  ];

  // Counts for every collection the user can see.
  const slugs = navGroups.flatMap((g) => g.entities.filter((e) => e.type === "collections").map((e) => e.slug));
  const counts = new Map(
    await Promise.all(
      slugs.map(async (slug) => {
        try {
          const c = await payload.count({ collection: slug as Parameters<Payload["count"]>[0]["collection"], overrideAccess: true });
          return [slug, c.totalDocs] as const;
        } catch {
          return [slug, null] as const;
        }
      }),
    ),
  );

  const month = madridDay().label.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const dateLine = nowDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
  const hasSales = t.orders > 0;

  const entityLink = (e: NavGroup["entities"][number]) => (
    <li key={e.slug}>
      <Link href={e.type === "globals" ? `/admin/globals/${e.slug}` : `/admin/collections/${e.slug}`}>
        <span className="md-row">
          <span>{text(e.label)}</span>
          {counts.get(e.slug) != null ? <span className="md-count">{counts.get(e.slug)}</span> : null}
        </span>
        {COLLECTION_NOTES[e.slug] ? <span className="md-note">{COLLECTION_NOTES[e.slug]}</span> : null}
      </Link>
    </li>
  );

  return (
    <Gutter className="maisha-dash">
      <header className="md-head">
        <h1>Hoy · {dateLine}</h1>
        <nav aria-label="Accesos rápidos" className="md-actions">
          <Link href="/pos" className="md-primary">Abrir la barra</Link>
          <Link href="/admin/collections/menu-items/create">Nuevo producto</Link>
          <Link href="/admin/collections/events/create">Nuevo evento</Link>
          <Link href="/admin/collections/campaigns/create">Nueva carta</Link>
          <Link href="/es" target="_blank" rel="noreferrer">Ver la web</Link>
        </nav>
      </header>

      <section aria-label="Ventas de hoy" className="md-kpis">
        <div className="md-box">
          <p className="md-eyebrow">Ventas</p>
          <p className="md-big">{euro(t.salesCents)}</p>
          <p className="md-sub">Hace una semana: {euro(before.salesCents)}</p>
        </div>
        <div className="md-box">
          <p className="md-eyebrow">Pedidos</p>
          <p className="md-big">{t.orders}</p>
          <p className="md-sub">Hace una semana: {before.orders}</p>
        </div>
        <div className="md-box">
          <p className="md-eyebrow">Ticket medio</p>
          <p className="md-big">{euro(t.averageTicketCents)}</p>
          {t.refundsCents ? <p className="md-sub">Devoluciones {euro(t.refundsCents)}</p> : null}
        </div>
        <div className="md-box">
          <p className="md-eyebrow">En turno</p>
          <p className="md-mid">{t.onShift.length ? t.onShift.map((s) => s.name).join(", ") : "Nadie"}</p>
        </div>
      </section>

      <div className="md-two">
        {done < steps.length ? (
          <section aria-labelledby="md-setup" className="md-box">
            <h2 id="md-setup" className="md-eyebrow">Para abrir · {done} de {steps.length}</h2>
            <div className="md-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Pasos hechos">
              <span style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
            <ol className="md-steps">
              {steps.map((s) => (
                <li key={s.key} data-done={s.done}>
                  <span aria-hidden="true" className="md-tick">{s.done ? "✓" : ""}</span>
                  <span>
                    {s.href && !s.done ? <Link href={s.href}>{s.label}</Link> : <span>{s.label}</span>}
                    <span className="sr-only">{s.done ? " (hecho)" : " (pendiente)"}</span>
                    {!s.done ? <span className="md-note">{s.hint}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="md-pending" className="md-box">
          <h2 id="md-pending" className="md-eyebrow">Pendiente · {pending.length}</h2>
          {pending.length ? (
            <ul className="md-list">
              {pending.map((p) => (
                <li key={p.key}>
                  <Link href={p.href}>{p.text}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="md-empty">Nada pendiente. Todo en orden.</p>
          )}
        </section>

        <section aria-labelledby="md-sales" className="md-box">
          <h2 id="md-sales" className="md-eyebrow">Ventas de hoy</h2>
          {hasSales ? (
            <div className="md-split">
              <ol className="md-list">
                {t.topItems.map((i) => (
                  <li key={i.name}>
                    {i.name} · {i.quantity} · {euro(i.cents)}
                  </li>
                ))}
              </ol>
              <ul className="md-list">
                {Object.entries(t.byChannel).map(([k, v]) => (
                  <li key={k}>{CHANNEL[k] ?? k} · {euro(v)}</li>
                ))}
                {Object.entries(t.byMethod).map(([k, v]) => (
                  <li key={k} className="md-soft">{METHOD[k] ?? k} · {euro(v)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="md-empty">Sin ventas todavía.</p>
          )}
          <p className="md-sub md-csv">
            Para la gestoría: <a href={`/api/reports/invoices?from=${month}-01&to=${nextMonth}-01`}>facturas del mes (CSV)</a> ·{" "}
            <a href={`/api/reports/iva?from=${month}-01&to=${nextMonth}-01`}>IVA del mes (CSV)</a>
          </p>
        </section>
      </div>

      <section aria-label="Todo" className="md-groups">
        {navGroups.map((g) => {
          const main = g.entities.filter((e) => !SECONDARY.has(e.slug));
          const more = g.entities.filter((e) => SECONDARY.has(e.slug));
          return (
            <div key={g.label} className="md-group">
              <h2>{g.label}</h2>
              <ul>{main.map(entityLink)}</ul>
              {more.length ? (
                <details>
                  <summary>Más</summary>
                  <ul>{more.map(entityLink)}</ul>
                </details>
              ) : null}
            </div>
          );
        })}
      </section>
    </Gutter>
  );
}

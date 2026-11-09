import type { Payload } from "payload";
import Link from "next/link";
import { Gutter } from "@payloadcms/ui";
import { inventoryAlerts } from "@/lib/inventory";
import { pendingBoxes } from "@/lib/premium";
import { verifiedBackOffice } from "@/lib/auth/roles";
import { madridDay, today } from "@/lib/reports";
import { COLLECTION_NOTES, COLLECTION_NOTES_EN, DASH, SECONDARY, setupSteps } from "@/lib/dashboard";

/**
 * The admin home (replaces Payload's tile grid): today at a glance, the
 * launch checklist until everything is set, what is waiting on the owner,
 * quick actions, and every collection as a compact list with counts.
 * Server component; the admin is owner/manager only.
 */

type Label = string | Record<string, string>;
type NavGroup = { label: string; entities: { label: Label; slug: string; type: string }[] };
const text = (l: Label, lang: "es" | "en") => (typeof l === "string" ? l : (l[lang] ?? l.es ?? Object.values(l)[0] ?? ""));

/** The same moment a week ago, and now (server render, per request). */
const clock = () => ({ now: new Date(), weekAgo: new Date(Date.now() - 7 * 86400000) });

type Pending = { key: string; text: string; href: string };

export async function OwnerDashboardView({
  payload,
  navGroups = [],
  i18n,
  user,
}: {
  payload: Payload;
  navGroups?: NavGroup[];
  i18n?: { language?: string };
  user?: Parameters<typeof verifiedBackOffice>[0];
}) {
  const lang: "es" | "en" = i18n?.language === "en" ? "en" : "es";
  // Figures only for a session that entered its authenticator code; a
  // password-only session is on its way to the code screen (review 2026-11-09).
  if (!verifiedBackOffice(user, "owner", "manager")) return <Gutter><div className="maisha-dash" /></Gutter>;
  const T = DASH[lang];
  const notes = lang === "en" ? COLLECTION_NOTES_EN : COLLECTION_NOTES;
  const euro = (cents: number) => new Intl.NumberFormat(lang === "en" ? "en-GB" : "es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
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

  // Upcoming events with seats: warn when 80% or more are booked.
  const soon = await payload.find({ collection: "events", overrideAccess: true, depth: 0, limit: 20, locale: lang, where: { and: [{ startsAt: { greater_than: now } }, { capacity: { exists: true } }] } });
  const booked = soon.docs.length
    ? await payload.find({ collection: "rsvps", overrideAccess: true, depth: 0, limit: 5000, where: { and: [{ event: { in: soon.docs.map((e) => e.id) } }, { status: { equals: "going" } }] } })
    : { docs: [] as { event: unknown; seats: number }[] };
  const taken = new Map<number, number>();
  for (const r of booked.docs) {
    const id = typeof r.event === "object" && r.event ? (r.event as { id: number }).id : (r.event as number);
    taken.set(id, (taken.get(id) ?? 0) + r.seats);
  }
  const filling = soon.docs
    .filter((e) => e.capacity && (taken.get(e.id) ?? 0) / e.capacity >= 0.8)
    .map((e) => ({ id: e.id, title: e.title, taken: taken.get(e.id) ?? 0, capacity: e.capacity as number }));

  const steps = setupSteps({
    legalName: business.legalName,
    nif: business.nif,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    email: Boolean(process.env.RESEND_API_KEY),
    shopProducts: shopProducts.totalDocs,
    foundingReady: Boolean(business.foundingOpen && business.foundingPriceCents && business.foundingTaxRate),
    upcomingEvents: upcomingEvents.totalDocs,
    onlineOrdering: Boolean(business.onlineOrdering),
  }, lang);
  const done = steps.filter((s) => s.done).length;

  const boxes = await pendingBoxes(payload).catch(() => ({ pickup: [], shipping: [] }));
  const pending: Pending[] = [
    ...(boxes.shipping.length ? [{ key: "box-ship", text: T.boxesShip(boxes.shipping.length), href: "/admin/cajas" }] : []),
    ...(boxes.pickup.length ? [{ key: "box-pickup", text: T.boxesPickup(boxes.pickup.length), href: "/admin/cajas" }] : []),
    ...(webOrders.totalDocs ? [{ key: "web", text: T.webOrders(webOrders.totalDocs), href: "/admin/collections/orders" }] : []),
    ...(refundFlags.totalDocs ? [{ key: "refund", text: T.refundFlags(refundFlags.totalDocs), href: "/admin/collections/orders" }] : []),
    ...alerts.draftOrders.map((d) => ({ key: `po-${d.id}`, text: T.po(String(d.label), d.supplier, euro(d.totalCents)), href: `/admin/collections/purchase-orders/${d.id}` })),
    ...filling.map((e) => ({ key: `ev-${e.id}`, text: T.filling(e.title, e.taken, e.capacity), href: `/admin/collections/events/${e.id}` })),
    ...(draftLetters.totalDocs ? [{ key: "letters", text: T.letters(draftLetters.totalDocs), href: "/admin/collections/campaigns" }] : []),
    ...alerts.lowStock.map((a) => ({ key: `low-${a.id}`, text: `${T.low}: ${a.name} · ${a.stock} ${a.unit}`, href: `/admin/collections/inventory-items/${a.id}` })),
    ...alerts.expiring.map((b) => ({ key: `exp-${b.id}`, text: `${T.expiring}: ${b.name}${b.expiresOn ? ` · ${new Date(b.expiresOn).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES")}` : ""}`, href: "/admin/collections/batches" })),
    ...alerts.lowMargin.map((m) => ({ key: `mar-${m.id}`, text: `${T.margin}: ${m.name} · ${m.marginPercent} %`, href: "/admin/collections/recipe-lines" })),
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
  const dateLine = nowDate.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
  const hasSales = t.orders > 0;

  const entityLink = (e: NavGroup["entities"][number]) => (
    <li key={e.slug}>
      <Link href={e.type === "globals" ? `/admin/globals/${e.slug}` : `/admin/collections/${e.slug}`}>
        <span className="md-row">
          <span>{text(e.label, lang)}</span>
          {counts.get(e.slug) != null ? <span className="md-count">{counts.get(e.slug)}</span> : null}
        </span>
        {notes[e.slug] ? <span className="md-note">{notes[e.slug]}</span> : null}
      </Link>
    </li>
  );

  return (
    <Gutter className="maisha-dash">
      <header className="md-head">
        <h1>{T.today} · {dateLine}</h1>
        <nav aria-label={T.quick} className="md-actions">
          <Link href="/pos" className="md-primary">{T.openBar}</Link>
          <Link href="/admin/collections/menu-items/create">{T.newProduct}</Link>
          <Link href="/admin/collections/events/create">{T.newEvent}</Link>
          <Link href="/admin/collections/campaigns/create">{T.newLetter}</Link>
          <Link href="/es" target="_blank" rel="noreferrer">{T.seeSite}</Link>
        </nav>
      </header>

      <section aria-label={T.salesToday} className="md-kpis">
        <div className="md-box">
          <p className="md-eyebrow">{T.sales}</p>
          <p className="md-big">{euro(t.salesCents)}</p>
          <p className="md-sub">{T.weekAgo}: {euro(before.salesCents)}</p>
        </div>
        <div className="md-box">
          <p className="md-eyebrow">{T.orders}</p>
          <p className="md-big">{t.orders}</p>
          <p className="md-sub">{T.weekAgo}: {before.orders}</p>
        </div>
        <div className="md-box">
          <p className="md-eyebrow">{T.avg}</p>
          <p className="md-big">{euro(t.averageTicketCents)}</p>
          {t.refundsCents ? <p className="md-sub">{T.refunds} {euro(t.refundsCents)}</p> : null}
        </div>
        <div className="md-box">
          <p className="md-eyebrow">{T.onShift}</p>
          <p className="md-mid">{t.onShift.length ? t.onShift.map((s) => s.name).join(", ") : T.nobody}</p>
        </div>
      </section>

      <div className="md-two">
        {done < steps.length ? (
          <section aria-labelledby="md-setup" className="md-box">
            <h2 id="md-setup" className="md-eyebrow">{T.setup} · {done} {T.of} {steps.length}</h2>
            <div className="md-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label={T.stepsDone}>
              <span style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
            <ol className="md-steps">
              {steps.map((s) => (
                <li key={s.key} data-done={s.done}>
                  <span aria-hidden="true" className="md-tick">{s.done ? "✓" : ""}</span>
                  <span>
                    {s.href && !s.done ? <Link href={s.href}>{s.label}</Link> : <span>{s.label}</span>}
                    <span className="sr-only">{s.done ? ` (${T.done})` : ` (${T.todo})`}</span>
                    {!s.done ? <span className="md-note">{s.hint}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="md-pending" className="md-box">
          <h2 id="md-pending" className="md-eyebrow">{T.pending} · {pending.length}</h2>
          {pending.length ? (
            <ul className="md-list">
              {pending.map((p) => (
                <li key={p.key}>
                  <Link href={p.href}>{p.text}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="md-empty">{T.nothing}</p>
          )}
        </section>

        <section aria-labelledby="md-sales" className="md-box">
          <h2 id="md-sales" className="md-eyebrow">{T.salesToday}</h2>
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
                  <li key={k}>{T.channel[k] ?? k} · {euro(v)}</li>
                ))}
                {Object.entries(t.byMethod).map(([k, v]) => (
                  <li key={k} className="md-soft">{T.method[k] ?? k} · {euro(v)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="md-empty">{T.noSales}</p>
          )}
          <p className="md-sub md-csv">
            {T.accountant}: <a href={`/api/reports/invoices?from=${month}-01&to=${nextMonth}-01`}>{T.invoicesCsv}</a> ·{" "}
            <a href={`/api/reports/iva?from=${month}-01&to=${nextMonth}-01`}>{T.vatCsv}</a>
          </p>
        </section>
      </div>

      <section aria-label={T.all} className="md-groups">
        {navGroups.map((g) => {
          const main = g.entities.filter((e) => !SECONDARY.has(e.slug));
          const more = g.entities.filter((e) => SECONDARY.has(e.slug));
          return (
            <div key={g.label} className="md-group">
              <h2>{g.label}</h2>
              <ul>{main.map(entityLink)}</ul>
              {more.length ? (
                <details>
                  <summary>{T.more}</summary>
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

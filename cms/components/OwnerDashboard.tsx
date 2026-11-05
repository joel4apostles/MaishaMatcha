import { getPayload } from "payload";
import config from "@payload-config";
import { inventoryAlerts } from "@/lib/inventory";
import { madridDay, today } from "@/lib/reports";

/**
 * Admin home, above the collection list: today at a glance, what needs
 * attention, and the accountant's exports. Server component; the admin is
 * owner/manager only, so no barista ever renders it.
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

const box: React.CSSProperties = {
  border: "1px solid rgba(176,141,87,0.35)",
  borderRadius: 2,
  padding: "18px 20px",
  background: "transparent",
};
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  opacity: 0.72,
  margin: 0,
};
const big: React.CSSProperties = { fontFamily: "var(--font-serif, Georgia, serif)", fontSize: 30, fontWeight: 300, margin: "6px 0 0" };

export async function OwnerDashboard() {
  const payload = await getPayload({ config });
  const business = await payload.findGlobal({ slug: "business", overrideAccess: true });
  const [t, alerts] = await Promise.all([today(payload), inventoryAlerts(payload, business.targetMarginPercent ?? 65)]);
  const month = madridDay().label.slice(0, 7);
  const nextMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  })();
  const attention =
    alerts.lowStock.length + alerts.expiring.length + alerts.lowMargin.length + alerts.draftOrders.length;

  return (
    <section style={{ marginBottom: 40 }} aria-label="Hoy">
      <h2 style={{ fontWeight: 400, margin: "0 0 16px" }}>Hoy · {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={box}>
          <p style={eyebrow}>Ventas</p>
          <p style={big}>{euro(t.salesCents)}</p>
          {t.refundsCents ? <p style={{ margin: "4px 0 0", opacity: 0.75 }}>Devoluciones {euro(t.refundsCents)}</p> : null}
        </div>
        <div style={box}>
          <p style={eyebrow}>Pedidos</p>
          <p style={big}>{t.orders}</p>
        </div>
        <div style={box}>
          <p style={eyebrow}>Ticket medio</p>
          <p style={big}>{euro(t.averageTicketCents)}</p>
        </div>
        <div style={box}>
          <p style={eyebrow}>En turno</p>
          <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
            {t.onShift.length ? t.onShift.map((s) => s.name).join(", ") : "Nadie"}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 12 }}>
        <div style={box}>
          <p style={eyebrow}>Lo más pedido</p>
          {t.topItems.length === 0 ? <p style={{ opacity: 0.7 }}>Aún no hay ventas hoy.</p> : null}
          <ol style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
            {t.topItems.map((i) => (
              <li key={i.name}>
                {i.name} · {i.quantity} · {euro(i.cents)}
              </li>
            ))}
          </ol>
        </div>
        <div style={box}>
          <p style={eyebrow}>Por canal y método</p>
          <ul style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none", lineHeight: 1.8 }}>
            {Object.entries(t.byChannel).map(([k, v]) => (
              <li key={k}>
                {CHANNEL[k] ?? k} · {euro(v)}
              </li>
            ))}
            {Object.entries(t.byMethod).map(([k, v]) => (
              <li key={k} style={{ opacity: 0.8 }}>
                {METHOD[k] ?? k} · {euro(v)}
              </li>
            ))}
          </ul>
        </div>
        <div style={box}>
          <p style={eyebrow}>Atención · {attention}</p>
          <ul style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none", lineHeight: 1.7 }}>
            {alerts.draftOrders.map((d) => (
              <li key={`po-${d.id}`}>
                <a href={`/admin/collections/purchase-orders/${d.id}`}>
                  Pedido {d.label} a {d.supplier} por aprobar · {euro(d.totalCents)}
                </a>
              </li>
            ))}
            {alerts.lowStock.map((a) => (
              <li key={`low-${a.id}`}>
                <a href={`/admin/collections/inventory-items/${a.id}`}>
                  Stock bajo: {a.name} · {a.stock} {a.unit}
                </a>
              </li>
            ))}
            {alerts.expiring.map((b) => (
              <li key={`exp-${b.id}`}>
                Caduca pronto: {b.name} · {b.expiresOn ? new Date(b.expiresOn).toLocaleDateString("es-ES") : ""}
              </li>
            ))}
            {alerts.lowMargin.map((m) => (
              <li key={`mar-${m.id}`}>
                Margen bajo: {m.name} · {m.marginPercent} %
              </li>
            ))}
            {attention === 0 ? <li style={{ opacity: 0.7 }}>Todo en orden.</li> : null}
          </ul>
        </div>
      </div>

      <p style={{ marginTop: 14, opacity: 0.85 }}>
        Para la gestoría:{" "}
        <a href={`/api/reports/invoices?from=${month}-01&to=${nextMonth}-01`}>facturas del mes (CSV)</a> ·{" "}
        <a href={`/api/reports/iva?from=${month}-01&to=${nextMonth}-01`}>resumen de IVA del mes (CSV)</a>
      </p>
    </section>
  );
}

import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { verifiedBackOffice } from "@/lib/auth/roles";
import { pendingBoxes } from "@/lib/premium";
import { BoxButton } from "./BoxButton";

/**
 * "Cajas del mes": every subscriber's box still owed. To post (with the
 * address to copy onto the label) and to collect at the bar. Owner and
 * manager only; the buttons are server actions that check again.
 */
const WORDS = {
  es: {
    title: "Cajas del mes",
    intro: "Las latas de los suscriptores que aún no han salido o no se han recogido.",
    ship: "Por enviar",
    pickup: "Para recoger en la barra",
    none: "Ninguna.",
    shipped: "Marcar enviada",
    collected: "Entregada",
    failed: "No se ha podido. Recarga y prueba otra vez.",
    noAddress: "Sin dirección: escribe al suscriptor.",
    forbidden: "Solo propietario o encargado.",
  },
  en: {
    title: "This month's boxes",
    intro: "Subscribers' tins not yet posted or collected.",
    ship: "To post",
    pickup: "To collect at the bar",
    none: "None.",
    shipped: "Mark posted",
    collected: "Handed over",
    failed: "That did not work. Reload and try again.",
    noAddress: "No address: write to the subscriber.",
    forbidden: "Owner or manager only.",
  },
} as const;

export async function BoxesView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const lang = req.i18n.language === "en" ? "en" : "es";
  const T = WORDS[lang];
  const allowed = verifiedBackOffice(req.user, "owner", "manager");
  const boxes = allowed ? await pendingBoxes(req.payload) : { pickup: [], shipping: [] };
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long" });

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
              <p className="md-sub">{allowed ? T.intro : T.forbidden}</p>
            </div>
          </div>
          {allowed ? (
            <div className="md-two">
              <section aria-labelledby="bx-ship" className="md-box">
                <h2 id="bx-ship" className="md-eyebrow">{T.ship} · {boxes.shipping.length}</h2>
                {boxes.shipping.length ? (
                  <ul className="md-boxes">
                    {boxes.shipping.map((b) => (
                      <li key={b.id}>
                        <p className="md-mid">{b.shipTo?.name || b.name}</p>
                        <p className="md-sub">{b.box} · {date(b.createdAt)}</p>
                        {b.shipTo?.line1 ? (
                          <address className="md-address">
                            {b.shipTo.line1}
                            {b.shipTo.line2 ? <><br />{b.shipTo.line2}</> : null}
                            <br />
                            {[b.shipTo.postalCode, b.shipTo.city].filter(Boolean).join(" ")}
                            {b.shipTo.province ? <><br />{b.shipTo.province}</> : null}
                            {b.shipTo.phone ? <><br />{b.shipTo.phone}</> : null}
                          </address>
                        ) : (
                          <p className="md-sub">{T.noAddress} {b.email}</p>
                        )}
                        {b.note ? <p className="md-sub">{b.note}</p> : null}
                        <BoxButton orderId={b.id} kind="shipped" label={T.shipped} failed={T.failed} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="md-empty">{T.none}</p>
                )}
              </section>
              <section aria-labelledby="bx-pickup" className="md-box">
                <h2 id="bx-pickup" className="md-eyebrow">{T.pickup} · {boxes.pickup.length}</h2>
                {boxes.pickup.length ? (
                  <ul className="md-boxes">
                    {boxes.pickup.map((b) => (
                      <li key={b.id}>
                        <p className="md-mid">{b.name}</p>
                        <p className="md-sub">{b.box} · {date(b.createdAt)}</p>
                        {b.note ? <p className="md-sub">{b.note}</p> : null}
                        <BoxButton orderId={b.id} kind="collected" label={T.collected} failed={T.failed} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="md-empty">{T.none}</p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}

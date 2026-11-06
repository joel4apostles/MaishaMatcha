# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-06, ~02:10 (Opus 5.5 session)

## Where things stand

- **Live site** (maisha-matcha.vercel.app): everything below was PUSHED
  2026-11-06 (890ecb1) and deployed by Vercel. Without DATABASE_URL the
  public pages work (ordering shows "no disponible", the shop "abre pronto",
  events use the static list) and /admin returns 500. Next deploy step:
  Supabase + Vercel env (POS-PLAN section 7), then the live Supabase checks
  in the security-audit skill (section 3).
- **Built locally, tested (132 tests, `npm test`):** counter POS (PIN sign-in,
  shifts, Z report, cash/card-on-terminal, tickets with AEAT QR, invoice hash
  chain, KDS, refunds/voids with manager PIN, offline cash queue), inventory
  and suppliers (gram deduction, counts, batches, reorder drafts, approve to
  email, receiving), owner dashboard + accountant CSVs, **web ordering**
  (`/es/pedir`, `/en/order`: pickup slots with capacity, pay at pickup or
  Stripe Checkout confirmed by webhook, private status page
  `/es/pedido/<token>`, emails, KDS shows "Web" + pickup time), and the
  **recipe builder** linking to an order plus recipes saved on the device.
- **Customers (2026-11-06):** optional accounts at `/es/cuenta` (emailed
  sign-in link + confirm button, no passwords; guest ordering unchanged),
  founding membership via Stripe (closed until Empresa has price, IVA,
  places and the switch), event bookings on CMS events with locked seats,
  email letters (Campaigns: owner approves, opted-in only, one-click
  unsubscribe). Security review: SHIP, all SHOULDs fixed (9334a8e).
  Carta and story stay in code on purpose (see CLAUDE.md "Content split").
- **Shop + monthly membership (2026-11-06):** /es/tienda sells products the
  team uploads in /admin (category marked Tienda; photo, price, stock
  units); monthly membership via Stripe subscriptions with the founding
  price. Privacy notice rewritten (provisional, needs legal review).
  Design review SHIP; security review SHIP with all SHOULDs fixed.
- **Counter extras (2026-11-06, LOCAL, not pushed):** split payment (card
  + cash, change from cash only), full invoice on request (F3 in series
  "F" replacing the ticket, NIF/NIE/CIF/VAT validated, /pos/factura/[id]),
  receipts by email (address not stored). Refunds go back cash first, then
  card, one row per method; a ticket with a full invoice is not refunded at
  the till (the gestor issues the corrective). Security review SHIP.
- **Real photos on the site (2026-11-06, LOCAL, not pushed):**
  hero = bar still life (public/images/hero-still-life.jpg; phones full
  bleed, desktop ink field + right photo column), shop sign beside the
  visit line (shopfront.jpg), still life on /tienda. Design review SHIP.
  The sources are WhatsApp exports (765 px): ask Joel for originals. The
  interior triptych stays as renders ("Imagen del proyecto") until the
  real salon is finished (the renders show wood; the real bar is green tile).
- Online ordering is OFF until the owner ticks it in /admin > Empresa.
  Security review of web ordering: SHIP; all findings fixed (44ea242).
  Every flow browser-verified at 390 and 1440, both locales.
- Phase 2 mocks: claude.ai artifact "maisha barra mocks"
  (https://claude.ai/artifact/PQdSsim5kdGCvjw3tmDDap).

## Next

- Founder: Supabase project (EU) + Vercel env, Production only:
  DATABASE_URL, PAYLOAD_SECRET, FIRST_OWNER_EMAIL, NEXT_PUBLIC_SITE_URL,
  RESEND_API_KEY/RESEND_AUDIENCE_ID, STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET
  (webhook events: checkout.session.completed, .async_payment_succeeded,
  .expired, .async_payment_failed, invoice.paid, customer.subscription.*;
  enable the customer portal). NIF + legal name in Empresa. For the
  founding membership: price, IVA rate, number of places, perks. Real
  event dates and capacities in /admin > Eventos. Monthly membership: price,
  founding price, IVA, perks (ES and EN). Shop: products with photos and
  stock, in both languages. Confirm
  prices (OJ 9,50, Yuzu 9,80), milks, allergens, open days, recipe grams
  and costs, map pin.
- Blocked on founder: Stripe Terminal (2i), AEAT submission (2j),
  CafeRadar stamps.
- Engineering queue: full script-src CSP with nonces, real-iPhone keyboard
  test, privacy notice update (accounts, Stripe, letters), design-reviewer
  pass on /cuenta, /pedir and /eventos.

## Environment gotchas

- Postgres for dev/tests: `npm run db:up` (Docker Desktop must be running).
- Use Node 24: `export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH`
  (Node 20 lacks a global WebSocket; the CDP e2e scripts need 24).
- System `python3` and `/usr/bin/git` fail until the Xcode license is
  accepted: use Node for edits and
  `/Applications/Xcode.app/Contents/Developer/usr/bin/git`.
- Production-like local run: `PAYLOAD_SECRET` (32+ chars) and
  `NEXT_PUBLIC_SITE_URL` AT BUILD TIME. e2e DB `maisha_e2e`, server on 3100.
- Sales/report tests group by Madrid calendar day: a run that straddles
  midnight can fail twice and pass on rerun.
- Headless Chrome full-page capture hangs on long desktop pages: capture
  per viewport. The Mac sleeps after 1 minute idle: `caffeinate -dimsu`.
- Commits are authored by Joel alone (no Claude co-author trailer).
- Never `npm run build` while `next dev` runs (shared `.next`).

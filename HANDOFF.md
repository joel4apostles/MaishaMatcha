# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-06, evening (Opus 5.5 session)

## Where things stand

- **Everything is PUSHED** (main = origin/main at 60fcd57) and deployed by
  Vercel to maisha-matcha.vercel.app. Without DATABASE_URL the public
  pages work (ordering "no disponible", shop "abre pronto", static events)
  and /admin returns 500. 144 tests pass (`npm test`).
- **Design pass (founder-led, 2026-11-06), all live:**
  - Hero: full picture (salon.jpg) under the transparent header, matcha
    card mounted like a shikishi, 一期一会 brushed vertically, outline seal.
    The light editorial hero was rejected ("cheap"); do not bring it back.
  - Language switch is a dropdown (ES ⌄, Español / English).
  - Carta (/es/menu): matchas as tasting cards (grade, origin, notes,
    usucha/latte, link to /crea), kanji section numerals, 和敬清寂.
    Shared card: `components/TastingCard.tsx`.
  - Ordering (/es/pedir): carta-style rows, option sheet as a real modal
    (tiles, milk only for lattes, extras checklist), "Lo de siempre" for
    signed-in members (`usualOrder` in lib/members.ts).
  - Shop: a page per product (/tienda/[slug], /en/shop/[slug]) with
    optional "Cómo se usa" (ritual) and "Combina con" (pairsWith) fields in
    /admin (migration 20261106_101604_shop_product_pages); basket kept in
    sessionStorage; products in the sitemap.
  - Home: sections numbered 一 to 五; the carta preview shows the three
    TastingCards (swipe row on phones).
  - Reference board + carta mocks: claude.ai artifact
    https://claude.ai/artifact/9P5bNWS8KzWNNwkFCvjPir (private; it holds
    the 8-shot photo list).
- Built earlier and live: counter POS, inventory/suppliers, web ordering
  with Stripe, accounts, founding + monthly membership, events, letters,
  table QR ordering, scanning, PDF purchase orders. Online ordering stays
  OFF until the owner ticks it in /admin > Empresa.
- Local dev DB only (not in git): DEMO shop products (ids 10 to 12) and
  test member orders.

## In progress

Nothing mid-task. The design plan's page list is done.

## Next

- Design: photo shoot from the shot list on the reference board (then
  replace renders and WhatsApp exports); design pass on /historia,
  /eventos, /cuenta; optional design-reviewer run on the new home.
- Founder: Supabase project (EU) + Vercel env, Production only:
  DATABASE_URL, PAYLOAD_SECRET, FIRST_OWNER_EMAIL, NEXT_PUBLIC_SITE_URL,
  RESEND_API_KEY/RESEND_AUDIENCE_ID, STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET
  (events listed in CLAUDE.md; enable the customer portal). Empresa: NIF,
  legal name, founding/monthly prices, IVA, places, perks. Real products
  (names in Latin letters, photos, stock, ES and EN). Cultivar, harvest,
  allergens; "Calidad diaria" vs "Para cada día"; is the carta seasonal.
  Confirm prices (OJ 9,50, Yuzu 9,80), milks, open days, map pin.
- Blocked on founder: Stripe Terminal, AEAT submission, corrective
  invoices R1 to R4, CafeRadar stamps.
- Engineering: live Supabase checks (security-audit section 3), full
  script-src CSP with nonces, real-iPhone keyboard test, legal review of
  the privacy notice.

## Environment gotchas

- Postgres for dev/tests: `npm run db:up` (Docker Desktop must be running).
- Use Node 24: `export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH`.
- System `python3` and `/usr/bin/git` fail until the Xcode license is
  accepted: use Node for edits and
  `/Applications/Xcode.app/Contents/Developer/usr/bin/git`.
- Payload Local API scripts: a temporary `.tmp-*.mts` in the repo root run
  with `PAYLOAD_SECRET=... npx tsx` (scratchpad scripts fail on top-level
  await and the @/ aliases). Delete it after.
- The seed skips existing items: fix old dev-DB copy with SQL.
- e2e: CDP scripts (Node 24); member sign-in links are HMAC-signed with the
  dev PAYLOAD_SECRET, so scripts can sign in. True mobile viewport needs
  `Emulation.setDeviceMetricsOverride`.
- Production-like local run: `PAYLOAD_SECRET` (32+ chars) and
  `NEXT_PUBLIC_SITE_URL` AT BUILD TIME. e2e DB `maisha_e2e`, server on 3100.
- Sales/report tests group by Madrid calendar day: a run that straddles
  midnight can fail twice and pass on rerun.
- Headless Chrome full-page capture hangs on long desktop pages: capture
  per viewport. The Mac sleeps after 1 minute idle: `caffeinate -dimsu`.
- Commits are authored by Joel alone (no Claude co-author trailer); ask
  before each push (push to main deploys).
- Never `npm run build` while `next dev` runs (shared `.next`).

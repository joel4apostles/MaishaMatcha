# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-08, midday (Opus 5.5 session). main = origin/main, everything pushed and live.

## Where things stand

- **Production is live with a database** (2026-11-07). Supabase (EU,
  shared pooler :6543) in Vercel `DATABASE_URL`; `PAYLOAD_SECRET`,
  `FIRST_OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL=https://www.maishamatcha.es`
  set (Production). Migrations ran on deploy, seed run by Joel. Owner
  account created at www.maishamatcha.es/admin. Live check: anon and
  authenticated have NO usage on the `payload` schema; "auto expose new
  tables" is off in Supabase's Data API.
- **Use the www address.** `maishamatcha.es` (apex) STILL (checked 2026-11-07 night) has two GoDaddy
  parking A records (76.223.105.230, 13.248.243.5) beside Vercel's
  216.198.79.1: no valid cert there, and the admin fails from it (its API
  calls go to www). Joel is removing them in GoDaddy DNS + Forwarding, then
  setting apex → www redirect in Vercel. Re-check with `dig +short
  maishamatcha.es A` (only 216.198.79.1) and curl both hosts.
- **Design pass done and live** (founder-led): full-picture hero with the
  matcha card (now the REAL salon photo), carta, ordering, shop + product
  pages, home path 一 to 五, historia, eventos (printed programme), cuenta.
  Kanji numerals are unframed brush glyphs (`components/Numeral.tsx`; the
  outline square is the seal's alone, per design review). Real photos:
  `public/images/salon-*.jpg`, `shop-tins.jpg`, `drinks-layered.jpg`
  (EXIF stripped). The carta and /crea photos were removed at the founder's
  request ("poorly placed"): keep new imagery to places agreed first.
  Faces in founder photos need the person's OK before publishing.
- **Phones**: header = leaf + Pedir + the word "Menú", which opens a
  full-screen washi sheet (`components/MobileMenu.tsx`, native modal
  dialog, 21 CDP checks passed). Desktop nav unchanged. The header keeps its
  sumi/50 band over the hero: without it the nav measured ~2:1 on the wall.
- **Crea tu bebida**: `components/LayerColumn.tsx`: the recipe as a quiet
  column of its layers (cloud, tea, milk, purées), each named beside it.
  Founder rejected a flat SVG cup illustration as cheap; next step is REAL
  per-drink clips from a shoot (shot list below), not illustration or AI.
- **Video**: home carta section (`components/home/MenuPreview.tsx`): words on
  the LEFT like sections 一 and 二, the pour on the RIGHT, bottom-aligned so
  "see the full menu" shares a line with the caption and Pausa control
  (founder, 2026-11-08: consistency and alignment). It shows
  `public/video/pour.mp4` (`components/PourVideo.tsx`): founder clip
  IMG_8264, cropped square to hands, bowl and cup (no face, no audio, ~1.9
  MB), plays once in view, Pausa / Ver de nuevo (WCAG 2.2.2), still for
  reduced motion. Edges feathered into washi with a CSS mask (founder
  liked it: "better"); recorded as an exemption in the brand skill. No ffmpeg on this Mac (install was blocked): clips are
  cropped and re-encoded by recording a canvas in headless Chrome
  (MediaRecorder, video/mp4 avc1), see the scratchpad recipe in git log.
- **Admin**: own home dashboard (`cms/components/OwnerDashboard.tsx`, logic
  in `lib/dashboard.ts`): today vs a week ago, launch checklist, pending
  list (web orders, DEVOLVER payments, supplier orders, draft letters,
  stock, events at 80%+), quick actions, compact collection lists. The
  whole admin is Spanish or English (each user picks in Account →
  Language); the top-right selector is "Contenido en" (content language).
  Brand favicon in the admin.
- **Admin sign-in is two-step** (2026-11-08, `payload-totp` 3.0.7): password,
  then a 6-digit code from an authenticator app. Owner and manager MUST set
  it up on their first sign-in after the deploy (QR screen). Until the code
  is entered the session gets nothing (API 403; our report/PDF/tablet routes
  use `verifiedBackOffice`). Public reads (carta, events, story, media, IVA)
  stay open via `PUBLIC_READ` in payload.config.ts. Login and code screens
  restyled (narrow column, ink lines, "Entrar"). LIVE since 2026-11-08; Joel
  signs in with the TEST owner account for now and has run the reset SQL
  once (so he lands on the QR setup screen: scan, type code). Real owner
  account later: create it in Users, it sets up its own code, then set the
  test account inactive (never delete). The admin opens in Spanish
  until someone picks English: account (bottom left) → Configuración de
  Payload → Idioma → English (payload-lng cookie; proxy.ts sets "es" only
  when absent; verified in a browser that the switch sticks).
  **Lost phone**: Joel runs in Supabase SQL editor
  `update payload.users set totp_secret = null where email = '<email>';`
  then signs in and scans a new QR. The plugin's own "has a code" check ran
  outside transactions and locked the pool under parallel sales: replaced
  by `hasTotpInTransaction` (keep it when upgrading the plugin).
- 151 tests pass (one removed with blendColor). Forms use sumi/50
  underlines (AA). Admin fonts self-hosted via next/font.

## Next

- Joel (setup): GoDaddy DNS cleanup; Stripe in TEST mode first (secret
  key, webhook to https://www.maishamatcha.es/api/stripe/webhook with the
  8 events listed in CLAUDE.md, customer portal), then live keys; Resend
  key + audience; Empresa (NIF, legal name, founding/monthly prices, IVA,
  places, open days); shop products with photos (tins photo 13-50-54 is
  the good one; ask for the original file); real event dates; English
  content.
- Joel (facts): cultivar, harvest, allergens; "Calidad diaria" vs "Para
  cada día"; OJ 9,50 / Yuzu 9,80; map pin.
- Engineering: full script-src CSP with nonces (trade-off: makes pages
  dynamic, wait until payments are live); real-iPhone keyboard test (Joel);
  legal review of the privacy notice; a sticky bottom "Pedir" bar on
  phones once online ordering is switched on in Empresa.
- Design review NITs left on purpose: footer language switch alone in its
  column, home repeats address/hours above the footer, events repeat
  "Reservado a socios fundadores", historia sticky glyph sits ~90px low.
- Blocked on founder: Stripe Terminal, AEAT submission, R1 to R4
  corrective invoices, CafeRadar stamps.

## Video shot list (for the founder)

Same spot on the green tile counter, white wall behind, daylight, LED strip
off, hands only (no faces), iPhone on a tripod, 4K 30fps, exposure locked,
side-on at cup height. Clips of 6 to 8 s: usucha whisked in the black bowl
(Uji, Nishio, Kagoshima) from above; each as a latte poured over ice and
milk in the Maisha cup; hojicha and black tea solo and latte; purée going in
(mango, ube); Coconut Cloud on top; one wide clip of the bar. AirDrop the
originals (not WhatsApp). Then /crea can switch clip by tea and preparation.

## Environment gotchas

- Postgres for dev/tests: `npm run db:up` (Docker Desktop must be running).
- Use Node 24: `export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH`.
- git at `/Applications/Xcode.app/Contents/Developer/usr/bin/git`.
- Payload Local API scripts: a temporary `.tmp-*.mts` in the repo root run
  with `PAYLOAD_SECRET=... npx tsx` (scratchpad scripts fail on top-level
  await and the @/ aliases). Delete it after. For admin screenshots create
  a throwaway owner that way and delete it (and its sessions) after.
- The seed skips existing items: fix old dev-DB copy with SQL.
- e2e: CDP scripts (Node 24); member sign-in links are HMAC-signed with the
  dev PAYLOAD_SECRET. Headless capture of long pages can hang: wrap in
  `timeout`.
- Never ask for or accept production secrets in chat; Joel pastes them in
  Vercel and runs prod `migrate`/`seed` in his own terminal (`read -s`).
- Commits are authored by Joel alone (no Claude co-author trailer); ask
  before each push (push to main deploys).
- Never `npm run build` while `next dev` runs (shared `.next`).

# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-07 (Opus 5.5 session)

## Where things stand

- **Production is live with a database** (2026-11-07). Supabase (EU,
  shared pooler :6543) in Vercel `DATABASE_URL`; `PAYLOAD_SECRET`,
  `FIRST_OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL=https://www.maishamatcha.es`
  set (Production). Migrations ran on deploy, seed run by Joel. Owner
  account created at www.maishamatcha.es/admin. Live check: anon and
  authenticated have NO usage on the `payload` schema; "auto expose new
  tables" is off in Supabase's Data API.
- **Use the www address.** `maishamatcha.es` (apex) still has two GoDaddy
  parking A records (76.223.105.230, 13.248.243.5) beside Vercel's
  216.198.79.1: no valid cert there, and the admin fails from it (its API
  calls go to www). Joel is removing them in GoDaddy DNS + Forwarding, then
  setting apex → www redirect in Vercel. Re-check with `dig +short
  maishamatcha.es A` (only 216.198.79.1) and curl both hosts.
- **Design pass done and live** (founder-led): full-picture hero with the
  matcha card (now the REAL salon photo), carta, ordering, shop + product
  pages, home path 一 to 五, historia, eventos (printed programme), cuenta.
  Kanji numerals sit in a framed square (`components/Numeral.tsx`).
  Real photos: `public/images/salon-*.jpg`, `shop-tins.jpg` (EXIF stripped).
- **Admin**: own home dashboard (`cms/components/OwnerDashboard.tsx`, logic
  in `lib/dashboard.ts`): today vs a week ago, launch checklist, pending
  list (web orders, DEVOLVER payments, supplier orders, draft letters,
  stock, events at 80%+), quick actions, compact collection lists. The
  whole admin is Spanish or English (each user picks in Account →
  Language); the top-right selector is "Contenido en" (content language).
  Brand favicon in the admin.
- 147 tests pass. Local `main` may be ahead of origin: check with
  `git rev-list --count origin/main..main`.

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
  dynamic); real-iPhone keyboard test; legal review of the privacy notice.
- Blocked on founder: Stripe Terminal, AEAT submission, R1 to R4
  corrective invoices, CafeRadar stamps.

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

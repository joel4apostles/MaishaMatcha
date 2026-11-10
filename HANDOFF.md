# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-10 (Opus 5.5 session). main = origin/main, everything pushed and live.

## Where things stand

- **Production live** on Supabase (EU) + Vercel at https://www.maishamatcha.es
  (use www: the apex still had GoDaddy parking A records 76.223.105.230 and
  13.248.243.5 on 2026-11-07; Joel removes them, then apex → www redirect
  in Vercel; check `dig +short maishamatcha.es A` = only 216.198.79.1).
  anon/authenticated have no usage on the `payload` schema (2026-11-07).
- **Design** live and founder-led (see CLAUDE.md imagery + brand skill). Home
  carta section: words LEFT, pour video RIGHT at 15rem, top-aligned (founder
  checks two-column heights and shared edges at desktop width). Header
  (2026-11-10): desktop Carta, Historia, Eventos, Tienda, Pedir | Cuenta,
  ES/EN; phone header (Pedir + Menú sheet) below 768px. Keep desktop nav and
  the phone menu (`MobileMenu.tsx`) listing the same pages. /crea =
  `LayerColumn`; real per-drink clips await the shoot (list below).
- **Admin sign-in is two-step** (`payload-totp`, forceSetup; see CLAUDE.md).
  Joel uses the TEST owner account. Real owner: sidebar Atajos → Invitar a
  alguien → copy the link (until Resend) → set password → scan QR; then untick Activo
  on the test account (never delete). Admin language: avatar top right →
  Configuración de Payload → Idioma ("Contenido en" = CONTENT language).
  Custom admin pages (/admin/cajas, /admin/invitar) need a sidebar link in
  `cms/components/NavShortcuts.tsx`. Admin link previews (WhatsApp) use
  `admin.meta` in payload.config.ts: Spanish, brand voice.
  **Lost phone** (Joel, Supabase SQL editor):
  `update payload.users set totp_secret = null where email = '<email>';`
  `delete from payload.users_sessions where _parent_id = (select id from payload.users where email = '<email>');`
  then sign in and scan the new QR straight away.
- **Monthly subscription box + subscriber events** (2026-11-09, CLAUDE.md):
  one fixed product, pickup at the bar or posted in Spain, /admin/cajas,
  events for founders + paid-up subscribers, event types. OFF until Empresa
  is filled and Stripe keys exist.
- **Security audit 2026-11-09**: three reviewers + mechanical checks; every
  finding fixed and live (details and the one accepted baseline in
  CLAUDE.md). Then: shared rate limits in Postgres (locked-down SECURITY
  DEFINER `payload.rate_limit_hit`) and Cloudflare Turnstile (off until keys).
  Vercel Firewall (DDoS, Hobby: 3 custom rules, 1 rate-limit rule) is the
  outer layer; app-level checks stay necessary.
- 166 tests pass (25 files).

## Next

- **REMIND JOEL FIRST (asked 2026-11-10): Turnstile keys.** Steps in auto-memory
  `turnstile-setup.md` (Cloudflare widget → 2 Vercel env vars, Production →
  redeploy → test waitlist + sign-in). Drop this line once he confirms.
- Joel (setup): GoDaddy DNS cleanup; Turnstile keys (Cloudflare → Turnstile
  → Add widget, hostname www.maishamatcha.es, Managed → Vercel
  NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY, Production,
  redeploy); invite his real owner account; Stripe in TEST mode first
  (webhook https://www.maishamatcha.es/api/stripe/webhook, the 8 events in
  CLAUDE.md, customer portal), then live; Resend key + audience (also makes
  invitations and "forgot password" email out); Empresa (NIF, legal name,
  founding/monthly prices, IVA, places, open days, box product, shipping
  price); shop products with photos; real event dates; English content.
- Joel (gestoría): IVA of the monthly fee, the tin and shipping (one rate for
  all lines now); Canarias addresses (IGIC) accepted by Stripe "ES".
- Joel (facts): cultivar, harvest, allergens; "Calidad diaria" vs "Para cada
  día"; OJ 9,50 / Yuzu 9,80; map pin.
- Engineering: script-src CSP with nonces (after payments go live);
  real-iPhone keyboard test; legal review of the privacy notice; sticky
  "Pedir" bar on phones once online ordering is on. Optional: one Vercel WAF
  rate-limit rule on /api/ as an outer layer.
- Design NITs left on purpose: footer language switch alone, home repeats
  address/hours, historia sticky glyph ~90px low.
- Blocked on founder: Stripe Terminal, AEAT submission, R1 to R4 invoices,
  CafeRadar stamps.

## Video shot list (for the founder)

Green tile counter, white wall, daylight, LED strip off, hands only, iPhone
on a tripod, 4K 30fps, exposure locked, side-on at cup height, 6 to 8 s:
usucha whisked in the black bowl (Uji, Nishio, Kagoshima) from above; each
as a latte over ice and milk in the Maisha cup; hojicha and black tea solo
and latte; purée going in (mango, ube); Coconut Cloud on top; one wide clip
of the bar. AirDrop the originals. Then /crea can switch clip per drink.

## Environment gotchas

- Postgres for dev/tests: `npm run db:up` (Docker Desktop running).
- Node 24: `export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH`.
- git at `/Applications/Xcode.app/Contents/Developer/usr/bin/git`.
- Payload Local API scripts: temporary `.tmp-*.mts` in the repo root, run
  with `PAYLOAD_SECRET=... npx tsx`; delete after. Admin screenshots: a
  throwaway owner with a known TOTP secret set by SQL
  (`totp_secret='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'`, codes from `otpauth`
  in node_modules); delete it, its sessions, totp_attempts and audit rows after.
- Account/subscription UI only shows with Stripe on: run dev with
  placeholder `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` for screenshots.
- Restart `next dev` after payload.config changes (plugins, translations);
  a killed dev server can leave a bad `.next`: `rm -rf .next`.
- Tests importing admin components: `vi.doMock("@payloadcms/ui", …)` (its
  CSS cannot load in Node).
- e2e: CDP scripts (Node 24), wrap long captures in `timeout`.
- Never ask for or accept production secrets in chat (Vercel / Joel's own
  terminal only). Commits by Joel alone, no co-author trailer; ask before
  each push (push to main deploys). Never `npm run build` while `next dev`
  runs.

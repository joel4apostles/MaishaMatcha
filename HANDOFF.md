# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-05, late (Opus 5.5 session)

## Where things stand

- **Live site** (maisha-matcha.vercel.app) is still the 2026-09-17 deploy.
  Everything below is committed LOCALLY on `main`, NOT pushed. Pushing
  deploys: run the `security-audit` skill first and follow the go-live
  checklist in `POS-PLAN.md` section 7 (Supabase + Vercel env first).
- **POS Phase 1 Foundations: done locally.** Roles, audit log, IVA,
  allergens, modifiers, atomic stock ledger, tablet + PIN counter sign-in,
  Postgres migrations (incl. Supabase anon/authenticated revoke), 57 tests.
- **Real carta** (`content/carta.ts`) drives the menu page, home preview,
  the recipe builder `/crea` (rebuilt on it) and the counter seed.
- **Security audit (2026-11-05): SHIP.** No high/critical advisories,
  security headers + CSP baseline, CSRF origins, schema hardening.
- **Code hygiene done:** dead files/exports/keys removed, home page split
  into `components/home/*` (markup proven identical).
- **Premium mobile-first design pass done** (commit "Premium mobile-first
  design pass"): AI sparkle retouched out of salon renders, latin-ext fonts
  (Rikyū macron), measured header band over hero, 44px targets everywhere,
  footer/visit info, form UX, iOS keyboard fix. A design-reviewer re-review
  was requested at the end of the session; if its verdict is not recorded
  below, re-run it on fresh screenshots.
- **Phase 2 mocks** awaiting founder approval: claude.ai artifact
  "maisha barra mocks" (https://claude.ai/artifact/PQdSsim5kdGCvjw3tmDDap).

## Next

- Founder: approve mocks; create Supabase (EU) and set Vercel env
  (Production only); confirm carta prices (OJ 9,50, Yuzu 9,80), milks,
  allergens, opening days, exact map pin (site.geo), VERI*FACTU deadline
  with the gestor; footer wordmark colour (kept matcha; brand skill says
  wood/35, reviewer called it loud).
- Then: go-live checklist, push, Phase 2 (POS order screen, KDS, payments).
- Open UX ideas not done: shorter story teaser on phones, localized
  `/es/carta` path, full script-src CSP with nonces, real-iPhone keyboard
  test (logic fixed, not device-verified).

## Environment gotchas

- Postgres for dev/tests: `npm run db:up` (Docker Desktop must be running).
- Use Node 24 (`.nvmrc`): `export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH`.
- System `python3` and `/usr/bin/git` fail until the Xcode license is
  accepted: use Node for edits and
  `/Applications/Xcode.app/Contents/Developer/usr/bin/git`.
- Production-like local run needs `PAYLOAD_SECRET` (32+ chars) and, for
  CSRF/serverURL, `NEXT_PUBLIC_SITE_URL` AT BUILD TIME (it is inlined).
- Headless Chrome full-page capture hangs on long desktop pages: capture
  per viewport (scratchpad script `e2e/shots.mjs` does this).
- The Mac sleeps after 1 minute idle: `caffeinate -dimsu` during long runs.
- Commits are authored by Joel alone (no Claude co-author trailer).
- Never `npm run build` while `next dev` runs (shared `.next`).

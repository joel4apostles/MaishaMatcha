# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-06, just after midnight (Opus 5.5 session)

## Where things stand

- **Live site** (maisha-matcha.vercel.app) is still the 2026-09-17 deploy.
  `main` is 25 commits ahead of origin, NOT pushed. Pushing deploys: run
  the `security-audit` skill, then the go-live checklist in `POS-PLAN.md`
  section 7 (Supabase + Vercel env first).
- **Built locally, tested (104 tests, `npm test`):** counter POS (PIN sign-in,
  shifts, Z report, cash/card-on-terminal, tickets with AEAT QR, invoice hash
  chain, KDS, refunds/voids with manager PIN, offline cash queue), inventory
  and suppliers (gram deduction, counts, batches, reorder drafts, approve to
  email, receiving), owner dashboard + accountant CSVs, **web ordering**
  (`/es/pedir`, `/en/order`: pickup slots with capacity, pay at pickup or
  Stripe Checkout confirmed by webhook, private status page
  `/es/pedido/<token>`, emails, KDS shows "Web" + pickup time), and the
  **recipe builder** linking to an order plus recipes saved on the device.
- Online ordering is OFF until the owner ticks it in /admin > Empresa.
  Security review of web ordering: SHIP; all its findings fixed (commit
  44ea242). Browser-verified at 390 and 1440, both locales.
- Design-reviewer re-review of the macron fix was never recorded: re-run it.
- Phase 2 mocks: claude.ai artifact "maisha barra mocks"
  (https://claude.ai/artifact/PQdSsim5kdGCvjw3tmDDap).

## Next

- Founder: Supabase project (EU) + Vercel env, Production only:
  DATABASE_URL, PAYLOAD_SECRET, FIRST_OWNER_EMAIL, NEXT_PUBLIC_SITE_URL,
  RESEND_API_KEY/RESEND_AUDIENCE_ID, STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET
  (webhook events: checkout.session.completed, .async_payment_succeeded,
  .expired, .async_payment_failed). NIF + legal name in Empresa. Confirm
  prices (OJ 9,50, Yuzu 9,80), milks, allergens, open days, recipe grams
  and costs, map pin.
- Blocked on founder: Stripe Terminal (2i), AEAT submission (2j),
  CafeRadar stamps.
- Engineering queue (POS-PLAN section 8, "+" row): customer accounts,
  founding membership (Stripe), events RSVP, email campaigns, CMS-backed
  public pages, full script-src CSP with nonces, real-iPhone keyboard test.

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

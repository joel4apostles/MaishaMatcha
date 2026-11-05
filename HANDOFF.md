# HANDOFF — read first, update last

Loaded automatically at session start (`.claude/settings.json` SessionStart
hook). Update it with the `handoff` skill before ending any session that
changed something. Keep it short: state, next steps, blockers. History
belongs in git, plans in `POS-PLAN.md`, rules in `CLAUDE.md`.

Last updated: 2026-11-05 (Opus 5.5 session)

## Where things stand

- **Live site** (maisha-matcha.vercel.app) is still the 2026-09-17 deploy.
  Everything below is committed LOCALLY on `main`, not pushed.
- **POS build, Phase 1 Foundations: done locally.** Roles, audit log, IVA,
  allergens, modifiers, atomic stock ledger, tablet + PIN counter sign-in,
  Postgres migrations, 52 tests. Details: `POS-PLAN.md` section 7.
- **Real carta** (`content/carta.ts`, from the founder's PDF) drives the
  menu page, home preview and the counter seed.
- **Phase 2 mocks** awaiting founder approval: claude.ai artifact
  "maisha barra mocks" (https://claude.ai/artifact/PQdSsim5kdGCvjw3tmDDap).
- The salon opened / opens Saturday 2026-11-07 on a stopgap till.

## In progress (this session)

1. Security audit skill + full run (deps, secrets, Supabase exposure / RLS,
   access rules, headers).
2. Code hygiene skill + run (dead code, orphans, bloat).
3. Full-site premium design pass, MOBILE FIRST (390px), design-reviewer loop.

## Next

- Founder: approve mocks, create Supabase project, set Vercel env
  (Production only), confirm carta prices (OJ 9,50, Yuzu 9,80), milks,
  allergens, opening days, VERI*FACTU deadline with the gestor.
- Then: go-live checklist in `POS-PLAN.md` section 7, push, Phase 2 (POS).
- Recipe builder `/crea` still uses the OLD draft options (tónica, fruits);
  rebuild on the carta's option groups in Phase 6.

## Environment gotchas

- Postgres for dev/tests: `npm run db:up` (Docker Desktop must be running).
- Use Node 24 (`.nvmrc`): `export PATH=$HOME/.nvm/versions/node/v24.16.0/bin:$PATH`.
- System `python3` and `/usr/bin/git` fail until the Xcode license is
  accepted: use Node for edits and
  `/Applications/Xcode.app/Contents/Developer/usr/bin/git`.
- The Mac sleeps after 1 minute idle: `caffeinate -dimsu` during long runs.
- Commits are authored by Joel alone (no Claude co-author trailer).
- Never `npm run build` while `next dev` runs (shared `.next`).

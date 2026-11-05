---
name: code-hygiene
description: Find and remove dead code, orphan files, unused exports and dependencies, and refactor bloated modules in the maisha matcha repo, without changing behaviour. Use when the user asks for cleanup, refactoring, dead code, orphans, bloat, or after a large feature lands.
---

# Code hygiene

Goal: less code, same behaviour. Every removal is proven unused; every
refactor is covered by tests that pass before and after.

## 1. Baseline

`npx tsc --noEmit && npm run lint && npm test && npm run build` must pass
first. Record the test count and the build's route table.

## 2. Find candidates (evidence, not intuition)

- **Unused files, exports, dependencies**: `npx --yes knip@5 --no-progress`
  (config-free run first; if it misreads Next/Payload entry points, add a
  `knip.json` with entries: `app/**/{page,layout,route,error,not-found}.tsx`,
  `app/**/*.ts`, `proxy.ts`, `payload.config.ts`, `cms/seed.ts`,
  `scripts/*.mjs`, `tests/**/*.ts`, `vitest.config.ts`).
- **Cross-check every candidate by hand** before deleting: grep the name,
  check dynamic references (Payload's `importMap.js` paths such as
  `/cms/components/AdminLogo#AdminLogo`, next-intl message keys, CSS class
  names used from content files, files read by scripts).
- **Unused message keys**: compare keys in `messages/es.json` with
  `t("…")` / `useTranslations("…")` usage; keep es and en in sync.
- **Unused public assets**: files in `public/` not referenced anywhere.
- **Bloat**: files over ~250 lines or components doing several jobs
  (`wc -l` across app, components, lib, cms). Split by responsibility only
  when it makes the code easier to read; do not split for its own sake.
- **Duplication**: repeated class strings or logic across 3+ places →
  one helper (e.g. `components/Button.tsx` exports), never earlier.

## 3. Act in small, separate commits

1. Delete proven-dead files and exports.
2. Remove unused dependencies (then
   `npm_config_legacy_peer_deps=false npm ci --dry-run`).
3. Refactors, one module per commit, tests green after each.
Never mix a refactor with a behaviour change. Keep public URLs, message
keys used by the site, and Payload collection slugs stable.

## 4. Verify

Same four commands as the baseline; test count must not drop; the build's
route table must be unchanged unless a route was intentionally removed.
For UI files, screenshot the affected page at 390px and 1440px.

## Output

A short table: removed (file/export/dep, evidence), refactored (what and
why), kept on purpose (looked dead but is used, and how). Then the
before/after line counts.

---
name: baseline-architecture
description: maisha matcha launch site — stack, no-DB constraint, content-as-source-of-truth, recipe URL codec, i18n routing topology. Baseline from 2026-08-11 audit.
metadata:
  type: project
---

# maisha matcha — Baseline Architecture (audit 2026-08-11)

Single-tenant marketing/launch site for a Murcia matcha salon. NOT CafeRadar.

## Stack
- Next.js ^15.5 (App Router, RSC), React 19, TS strict, Tailwind v4 (postcss).
- next-intl ^4 — locales es (default) + en, `localePrefix: always`, localized pathnames.
- Deploy target: Vercel (@vercel/analytics). Node runtime for API routes + OG.
- Only runtime backend touchpoint: Resend (waitlist email/audience), gated behind env — degrades gracefully to a logged no-op when unset.

## No-DB constraint (deliberate, sound for stage)
- Content is source of truth in `content/*.ts` typed modules: recipe.ts, menu.ts, events.ts, story.ts, site.ts. Each i18n field is `Record<Locale, string>`.
- Recipe builder persists NO state server-side. State lives in the URL: `?r=intensity.base.fruit.temp` via `lib/recipe.ts` toParam/fromParam. `fromParam` validates each segment against the option list and falls back to defaults — resilient to tampering/stale links.
- QR code generated client-side (qrcode-generator, dynamically imported) encoding the shareable URL. No server, no storage.
- Prices computed client-side from cents in content (RECIPE_BASE_PRICE_CENTS + surcharges).

## i18n topology (coherent)
- routing.ts is the single source: locales, pathnames map. middleware matcher excludes api/_next/_vercel/files. sitemap.ts + seo.ts both derive URLs from routing via getPathname. Message key sets es/en verified identical.

## Phase-1 CMS migration fitness
- Content shapes are CMS-ready: stable string `id`s, flat records, locale maps map cleanly to CMS localized fields. menu.ts `signatureItems()` is the only derived logic (a `.filter`), trivially portable.
- Watch: `content/recipe.ts` couples PRICING + P>UI (hue, code) + i18n in one module. A CMS would own labels/prices; keep hue/code/id as app-owned config. Split "editorial" from "config" at migration time.

## Dependency discipline
- Lean, 9 prod deps. qrcode-generator (^2.0.4) judged APPROPRIATE: tiny, zero-dep, client-only, dynamically imported (off critical path). No heavier QR lib needed.

## CI
- .github/workflows/ci.yml: node 22, npm ci, lint + tsc --noEmit + build. Concurrency cancel-in-progress. No test job (no tests exist yet). tsc passes clean on committed state.

## Backend-wanting state (watch list)
- Waitlist rate limiter (lib/rateLimit.ts) is in-memory / per-instance — resets on redeploy, not shared across Vercel lambdas. Fine at launch volume; needs shared store (Upstash/KV) if signups scale or serverless fan-out grows.
- Waitlist has no dedup/persistence of its own beyond Resend audience. Acceptable — Resend IS the store.

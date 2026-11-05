# CLAUDE.md — maisha matcha

Launch website for **maisha matcha**, the first premium matcha salon in Murcia,
Spain. Phase 0 (shipped): a bilingual (ES default, EN) marketing site with a
founding-members waitlist. Phase 1 is IN PROGRESS: Payload CMS embedded at
`/admin` (built + committed, not yet wired to prod Postgres). Later phases add
payments and more — scaffold cleanly, build only what a phase specifies.

## Brand law (read first)

The **`maisha-brand`** skill (`.claude/skills/maisha-brand/SKILL.md`) is the law
for all user-facing UI, copy, and email. Load it before any such work. Summary:

- Palette (2–3 colors max, much whitespace): `washi #F5F1E8` paper ·
  `sumi #1C1B18` ink · `matcha #9BAB37` THE brand green (kit Concept 1,
  founder-adopted 2026-09-07) · `gold #786000` legacy accent · `wood #B08D57`
  timber hairlines. Deep green `#454F0B` exists in the official logo files.
- Bright-green bands are LIGHT surfaces: ink on them is **sumi** (washi and
  gold both fail contrast ≈2.3:1 on matcha green — never put them on it).
  CTAs on green are sumi-filled. Focus rings via `.brand-band`/`.dark-band`.
- Logo lockup: `BrandMark` + `BrandWordmark` components, exact vectors from
  the official designer SVGs. Editorial headlines use **Fraunces** (replaced
  Cormorant to match the kit); body is **Hanken Grotesk**.
- **No em/en dashes** in copy (use commas, periods, parentheses; ranges as
  words: "Mar a Dom"). **No gradients** anywhere — flat color fields only.
- Tone: poetic, sober, almost silent. No exclamation marks, no emojis, no
  "premium/elevate/indulge", no superlatives. The Octavio Paz register.
- The **quiet test**: if anything shouts (a color used twice, a bold weight, a
  busy section, a second accent), remove it. Choose the quieter option.

Design tokens live in `app/globals.css` (`@theme`). Every later phase (emails,
OG, admin) inherits them.

## Stack & hard constraints

- **Next.js 16 (App Router) + TypeScript strict + Tailwind CSS 4.3.3 (pinned:
  4.3.4 breaks Turbopack)**, Node 24 (`.nvmrc`), Vercel.
- **Payload CMS 3.93** embedded at `/admin` (route group `app/(payload)/`,
  config `payload.config.ts`, collections in `cms/collections/`).
- **Postgres everywhere** (no SQLite): local = docker-compose `db`
  (`npm run db:up`, port 54322), tests = a throwaway database per run, prod =
  Supabase (`DATABASE_URL`, transaction pooler 6543). Payload lives in its
  own `payload` schema (Supabase's Data API cannot reach it). `push: false`:
  schema changes ONLY via committed migrations in `/migrations`
  (`npm run migrate:create -- <name>`, applied by `npm run migrate` and by
  the `vercel-build` script).
- **The counter (POS)** lives at `/pos` (route group `app/(pos)/`, own root
  layout, Spanish). Auth: owner registers a tablet once (`/pos/registrar`),
  staff then sign in by name + PIN on that device only. Logic in
  `lib/pos/core.ts` (testable), cookies in `lib/pos/server.ts`. Baristas
  cannot password-login at all (`beforeLogin`); owner/manager use `/admin`.
- **The carta** source of truth is `content/carta.ts` (from the founder's
  carta PDF): seeded into Payload with option groups (usucha/latte +1,40,
  milk, extras, mochi flavours). The public menu and home preview render it
  through `lib/carta.ts` (prices = base + option delta, same as the till).
- **No payments yet** (Stripe is Phase 2). Public server code is
  `/api/waitlist`, `/api/og`, and Payload's `/api/[...slug]`.
- i18n via **next-intl**: routes `/es` (default) and `/en`, localized pathnames
  (`/historia`↔`/story`, `/eventos`↔`/events`, etc.). Zero hardcoded strings.
- Custom components only on public pages. Motion is CSS + IntersectionObserver
  (`components/Reveal.tsx`), honoring `prefers-reduced-motion`. No animation lib.
- WCAG AA: semantic HTML, visible focus, ≥44px targets. Fonts via `next/font`
  (no CLS). Lighthouse mobile target ≥ 95/95/95.

## Commands

```bash
npm run dev            # dev server (localhost:3000; /admin included)
npm run build          # production build (must stay clean)
npm run start          # serve the build
npx tsc --noEmit       # type check (strict)
npm run lint           # ESLint (must be zero errors)
npm test               # unit + integration tests (needs npm run db:up)

# Database (Postgres in Docker, same major version as Supabase)
npm run db:up                   # start local Postgres (docker compose)
npm run migrate                 # apply committed migrations
npm run migrate:create -- name  # new migration after a schema change (offline)

# Payload CMS
npm run seed                    # carta, IVA, events, story (idempotent upserts)
npm run generate:types          # regenerate cms/payload-types.ts
npm run generate:importmap      # regenerate app/(payload)/admin/importMap.js
```

NEVER `npm run build` while `next dev` is running — they share `.next` and
the dev server 500s on stale chunks. Kill dev → build → `rm -rf .next` →
restart dev. And after ANY `npm install`, repair the lockfile:
`npm_config_legacy_peer_deps=false npm install --package-lock-only`
(a global `~/.npmrc` flag otherwise poisons `npm ci` on CI/Vercel).

## Structure & conventions

- `app/[locale]/(site)/*` — public pages under a shared shell (header/footer).
  Root layout is `app/[locale]/layout.tsx` (renders `<html>`, fonts, provider).
- `i18n/` — `routing.ts` (locales + localized pathnames), `request.ts`,
  `navigation.ts` (typed `Link`, `usePathname`, `getPathname`).
- `messages/{es,en}.json` — UI chrome + prose. Keep keys in sync across locales.
- `content/*.ts` — structured localized data: `menu.ts`, `story.ts`,
  `events.ts`, `site.ts`. Fields that vary by language use `Record<Locale, …>`.
- `components/` — primitives: `Section`, `Eyebrow`, `Headline`, `Button`
  (+ `buttonClass`/`quietLinkClass`), `Reveal`, `KigumiGrid`, `PlaceholderImage`,
  `WaitlistForm`, `SiteHeader`, `SiteFooter`, `LocaleSwitcher`.
- Motion primitives (all hand-rolled, no animation deps): `WordReveal`
  (CSS-only staggered word entrance, hero), `ScrollInk` (scroll-linked
  faint→ink text, manifesto), `TimelineRail` (self-drawing historia rail).
  Keyframes (`word-rise`, `rise`) + `--text-hero`/`--text-poem` tokens live in
  `app/globals.css`. See the maisha-brand skill for the sanctioned motion
  vocabulary — one effect per place, nothing loops.
- Imagery: `public/images/salon*.jpg` are extracted from the founder's design
  deck (page 10 render + crops) — the deck's OTHER photos are third-party
  references (Aesop/Blue Bottle/nendo/artists) and must NOT be published
  without permission. Space section uses next/image static imports with blur
  placeholders and an honest "project render" caption.
- Brand assets: `components/BrandMark.tsx` (icon) + `BrandWordmark.tsx`
  (serif lockup) are exact vectors extracted from the brand kit PDF
  ("Maisha Proposed Brand Identity", Concept 1) via PyMuPDF path
  serialization, silhouettes verified by pixel IoU (0.988 / 0.979) against
  the kit's own render. Favicon = `app/icon.svg` (+ `apple-icon.png`),
  auto-wired by Next conventions. `PhotoDrink.tsx` is the recipe-builder
  visual: the kit's real drink photograph (`public/images/drink-real.jpg`,
  the 736×1308 image inside the brand identity PDF) re-tinted live to
  `blendColor(recipe)` via `mix-blend-color`, plus a warm veil that lifts
  when the drink is frío. `DrinkGlass.tsx` (animated SVG pour) is kept in
  the repo but unused.
- `cms/` — Payload: `collections/` (Users, Media, MenuCategories, MenuItems,
  RecipeOptions, Events, StoryChapters, InventoryItems, StockMovements
  append-only ledger + cached-stock hook, Orders, Members), `seed.ts`,
  `components/AdminLogo|AdminIcon`. Admin theme in `app/(payload)/custom.scss`
  (washi/sumi elevation ramps, matcha success ramp, theme forced light).
- `lib/seo.ts` — `pageMetadata({locale, path, title, description})` builds
  per-locale title/description + canonical + hreflang alternates + OG image.
  Every page's `generateMetadata` uses it. `SITE_URL` from `NEXT_PUBLIC_SITE_URL`.
- `lib/rateLimit.ts` — naive in-memory per-IP limiter (per instance).
- `emails/waitlist-confirmation.tsx` — React Email, locale-selected, brand
  tokens (serif stack + neutral sans; custom web fonts are unreliable in email).

### Gotchas

1. **Page/layout params are typed `{ locale: string }`** (Next 15's generated
   route types require `string`), then cast `locale as Locale` for the typed
   next-intl config. Call `setRequestLocale(locale)` in every page/layout for
   static rendering.
2. **Responsive grids need a base `grid-cols-1`.** A `md:grid-cols-[…fr]` with
   no base column falls back to an implicit `auto` track that sizes to text
   max-content and can overflow mobile. `grid-cols-1` = `minmax(0,1fr)` lets
   text wrap.
3. **Localized URLs** are produced by middleware; the build "Route" column shows
   the internal file path (e.g. `/[locale]/eventos`), while `/en/events` is the
   public URL. `usePathname()` returns the internal (locale-agnostic) pathname.
4. **Waitlist degrades without env**: missing `RESEND_API_KEY`/
   `RESEND_AUDIENCE_ID` → log a non-sensitive payload, return success. Never
   crash, never leak config.
5. **Seed runs via `tsx`, not `payload run`.** `payload run` exits as soon
   as the module loads, so the seed silently did nothing. The package is
   `"type": "module"` because Payload is ESM-only.
6. **System `python3` and `git` are Xcode shims.** Until the Xcode license
   is accepted they fail. Use Node for scripted edits, and git directly at
   `/Applications/Xcode.app/Contents/Developer/usr/bin/git`.
7. **OG image** (`/api/og`) uses next/og's default font by design (deterministic,
   no network). Swapping in Cormorant/Hanken is a nice-to-have, not required.

## Environment

```
RESEND_API_KEY          # server-only; waitlist audience + confirmation email
RESEND_AUDIENCE_ID
RESEND_FROM             # optional, defaults to "maisha matcha <hola@maishamatcha.es>"
NEXT_PUBLIC_SITE_URL    # canonical origin for metadata/OG/sitemap
PAYLOAD_SECRET          # 32+ chars; signs admin + POS cookies (random per instance if missing)
DATABASE_URL            # Supabase pooler :6543 in prod, PRODUCTION env only on Vercel
FIRST_OWNER_EMAIL       # prod: only this email may create the first (owner) account
```

## Known audit findings (accepted risk, re-check each release)

Re-assessed 2026-11-05 after Next 16 + Payload 3.93: the next@15 findings
are gone. What remains (`npm audit --omit=dev`) sits inside Payload's admin
editor stack (lexical/happy-dom, dompurify via monaco, drizzle-kit/esbuild
tooling). Reachable only by signed-in owner/manager in /admin, never by
public visitors or the counter. Re-check on every Payload upgrade.

## Content editing

Until public pages read from the CMS, `CONTENT.md` remains the team guide:
carta in `content/carta.ts`, recipe-builder options/prices/ratios in
`content/recipe.ts`; editing on GitHub auto-deploys. The Payload admin at
`/admin` holds the same content as collections (via `npm run seed`) plus
inventory/orders/members — it becomes the single source of truth once the
pages are migrated to CMS queries.

## The auditor bench (.claude/agents/)

Read-only critics, each with a verdict protocol (BLOCKER/SHOULD/NIT → SHIP
or ITERATE). Invoke after work in their domain:
- **design-reviewer** — visual/brand law + WCAG, on screenshots
- **ux-auditor** — flows, affordances, forms, mobile ergonomics
- **chief-architect** — structure, deps, performance budget, phase-migration
- **cto-review** — TS/React/i18n/a11y engineering quality
- **cmo-copy** — voice, bilingual quality, conversion, honesty
- **security-review** — API routes, secrets, input validation

For big milestones run design-reviewer + ux-auditor + cmo-copy in parallel;
add chief-architect + cto-review before phase transitions.

## The review loop (run at every visual milestone)

1. `npm run dev` (or `npm run build && npm run start`).
2. Screenshot affected pages at **390px and 1440px**, both locales. Playwright
   MCP if available; otherwise headless Chrome:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new
   --screenshot=out.png --window-size=1440,2000 <url>`. For a *true* mobile
   viewport use CDP `Emulation.setDeviceMetricsOverride` (a plain
   `--window-size=390` lays out wider and crops the PNG — misleading).
3. Invoke the **`design-reviewer`** agent on the screenshots. Fix all BLOCKERs,
   re-screenshot, proceed only on SHIP. Apply the quiet test yourself too.
4. For any server/API/secret/dependency change, invoke the **`security-review`**
   agent. Fix BLOCKERs before shipping.
5. Verify overflow with CDP: `document.documentElement.scrollWidth` must equal
   `clientWidth` at 390px.

## Roadmap (later phases, same repo)

- **POS build (2026-11-05 prompt, see POS-PLAN.md)**: Phase 1 Foundations
  DONE LOCALLY (roles owner/manager/barista, audit log, IVA rates, allergens,
  modifiers, atomic stock ledger, tablet registration + PIN login with
  lockout, Postgres migrations, 48 tests). Remaining before prod: Supabase
  project, Vercel env (Production only), media storage, owner approval of
  the Phase 2 mocks (claude.ai artifact "maisha barra mocks").
- **Phase 2 — Stripe founding membership**: paid founding tier, member accounts,
  the "founding price" promise honored at checkout.
- **Phase 3 — Recipe builder**: MVP SHIPPED without a database. `/crea`
  (`/create`): 4-step builder from `content/recipe.ts` (intensities, bases,
  fruits, temps: locale labels + surcharges + hues). `lib/recipe.ts` holds the
  pure logic: price (base 400c + surcharges), ratio label, hex color blend,
  URL codec (`?r=intensity.base.fruit.temp`, fruit "no" when none), display
  code (CLA·TON·YUZ·F). The recipe card shows a QR (qrcode-generator, dynamic
  import) encoding the share URL; redeem = show the card at the counter.
  Remaining for full phase 3: accounts/persistence, named recipes, pre-order.
- **Phase 4 — Events / RSVP**: real events + seat-limited RSVP (the "reservado a
  socios fundadores" gating becomes functional).
- **Phase 5 — Email campaigns**: broadcast beyond the confirmation email; the
  Resend audience built here is the seed list.
- **Phase 6 — Inventory ledger**: stock over an append-only stock-movements
  pattern. Collections exist (`InventoryItems` + `StockMovements` + cached
  stock hook); depletion wiring comes with Phase 7.
- **Phase 7 — POS + supplier automation**: counter point-of-sale where the
  team records each sale with grams of matcha used; barista accounts (Users
  role `barista`, POS-only access) with every order stamped by its barista;
  sales write gram "out" movements into the stock ledger; `Suppliers`
  collection + `reorderThresholdGrams` on inventory items → automated
  reorder email to the supplier when stock crosses the threshold (Resend;
  draft-for-team-approval first, debounced to one email per crossing).

When a phase lands, update this file and the `maisha-brand` skill if the brand
system evolves.

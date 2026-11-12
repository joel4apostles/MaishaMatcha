# CLAUDE.md — maisha matcha

Launch website for **maisha matcha**, the first premium matcha salon in Murcia,
Spain. Phase 0 (shipped): a bilingual (ES default, EN) marketing site with a
founding-members waitlist. Phase 1 is IN PROGRESS: Payload CMS embedded at
`/admin` (built + committed, not yet wired to prod Postgres). Later phases add
payments and more — scaffold cleanly, build only what a phase specifies.

## Session protocol

- **Start**: `HANDOFF.md` is loaded automatically (SessionStart hook in
  `.claude/settings.json`). It says what is live, what is local, what is next.
- **End**: run the `handoff` skill (rewrites HANDOFF.md, syncs memory).
- **Before any push**: run the `security-audit` skill; fix BLOCKERs.
- **After a feature lands**: run the `code-hygiene` skill (dead code,
  orphans, bloat), then the auditor bench below.

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
- **Stripe over plain HTTPS** (`lib/stripe.ts`, no SDK): hosted Checkout for
  web orders and the founding fee; `/api/stripe/webhook` (signature +
  timestamp + amount checked) is the ONLY place anything becomes paid.
  Public server code: `/api/waitlist`, `/api/og`, `/api/order-status/[token]`,
  `/api/stripe/webhook`, `/api/members/{sign-in,unsubscribe}`, the server
  actions in `pedir/` and `cuenta/`, and Payload's `/api/[...slug]`.
- **Customer accounts are optional** (guest ordering always works). Members
  sign in with an emailed signed link (`lib/members.ts`, 20 min, no
  passwords, account created on first open); session cookie bound to
  `sessionVersion` ("sign out everywhere"). Founding membership, event
  bookings and email letters hang off `members`. Not Supabase Auth: one
  auth system per audience (Payload for staff, PIN for the till, links for
  customers).
- **Shop**: products are menu items in a category marked "Tienda" (photo,
  web price, `stock` units). /tienda reuses the pickup checkout; units are
  taken atomically (`lib/units.ts`), max 5 per product per order, paid
  online when cards are on, and returned exactly once on cancel/void/expiry.
- **Monthly box** (2026-11-09, founder): the subscription includes one
  fixed shop product (Empresa → "Producto de la caja mensual"); each paid
  month the order carries it, takes one unit (flagged SIN EXISTENCIAS when
  none) and waits as "ready". Pickup: the counter's Pedidos page lists it,
  "Entregada". Post (only if Empresa has a shipping price): Stripe Checkout
  collects a Spanish address + a second monthly line; /admin/cajas lists
  addresses, "Marcar enviada" (conditional update, audited, emails). Members-
  only events = founders + subscribers with status active (`mayBookMembersOnly`).
- **Staff invitations** (/admin/invitar, owner only): account with a random
  password + a 7-day reset link (`lib/invite.ts`), emailed via Resend or
  shown to copy. Never a self-claim by email (no proof of ownership).
  Payload's emails use `lib/payloadEmail.ts` (Resend HTTP, silent w/o key).
- **Monthly membership** (`lib/premium.ts`; the word "premium" is internal
  only, customers read "suscripción mensual"): Stripe subscription, founding
  price for founders, one invoiced order per paid month (invoice.paid),
  status ONLY from customer.subscription.* events, applied in event order.
  Welcome email (2026-11-12, `premiumWelcomeEmail`): once per subscription
  when its status first turns active (claimed by `members.welcomedSubscription`,
  conditional update), in the member's language, built only from Empresa
  (box product, perks list, shipping price). Needs Resend to actually send.
- **Content split**: events come from the CMS (bookable when they have a
  date and capacity). The carta (`content/carta.ts`) and the story
  (`content/story.ts`) stay in code on purpose: the till seed and the
  design-tuned story page depend on their ids.
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
- `components/home/` — one file per home section (Hero, Manifesto, StoryTeaser,
  MenuPreview, TheSpace, Founding) + `motion.ts` delays; the page composes them.
- `components/` — primitives: `Section`, `Eyebrow`, `Headline`, `Button`
  (+ `buttonClass`/`quietLinkClass`), `Reveal`,
  `WaitlistForm`, `SiteHeader`, `SiteFooter`, `LocaleSwitcher`.
- Motion primitives (all hand-rolled, no animation deps): `WordReveal`
  (CSS-only staggered word entrance, hero), `ScrollInk` (scroll-linked
  faint→ink text, manifesto), `TimelineRail` (self-drawing historia rail).
  Keyframes (`word-rise`, `rise`) + `--text-hero`/`--text-poem` tokens live in
  `app/globals.css`. See the maisha-brand skill for the sanctioned motion
  vocabulary — one effect per place, nothing loops.
- Imagery: `public/images/salon-*.jpg` are REAL photos of the finished salon
  (founder folder "FOTOS MAISHA MATCHA", 2026-11-06), rotated, resized and
  stripped of EXIF/GPS with sharp. The old project renders are gone; the
  founder deck's OTHER photos are third-party references and must NOT be
  published. Copy describing the space must match what the photos show.
- Brand assets: `components/BrandMark.tsx` (icon) + `BrandWordmark.tsx`
  (serif lockup) are exact vectors extracted from the brand kit PDF
  ("Maisha Proposed Brand Identity", Concept 1) via PyMuPDF path
  serialization, silhouettes verified by pixel IoU (0.988 / 0.979) against
  the kit's own render. Favicon = `app/icon.svg` (+ `apple-icon.png`),
  auto-wired by Next conventions. `LayerColumn.tsx` is the recipe-builder visual
  (2026-11-07, founder choice after a flat cup illustration looked cheap):
  a quiet column of the recipe's layers (cloud, tea, milk, purées) in the
  carta's hues, each named beside it. No imitation drink; real per-drink
  photos can come from a shoot later.
- `cms/` — Payload: `collections/` (Users, Media, MenuCategories, MenuItems,
  ModifierGroups, Modifiers, TaxRates, PosDevices, AuditLog, Events, StoryChapters, InventoryItems, StockMovements
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
4. **The waitlist is stored in our database first** (2026-11-12: before
   this, with no Resend env, sign-ups were thanked and dropped). `lib/waitlist.ts`
   creates a member with tier `waitlist` + `emailOptIn` (the form's consent box),
   so the owner reaches them through Campaigns (one-click unsubscribe); admin
   sidebar Atajos → Lista de espera. An EXISTING address is never changed by
   the public form (it must not re-subscribe someone who unsubscribed). Resend
   (audience + confirmation) is extra: missing or failing, the sign-up still
   succeeds; stored nowhere → an error, never a false "thanks". Tests share one
   database, so `vitest.config.ts` runs phase1 first (first account = owner).
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
STRIPE_SECRET_KEY       # web orders + founding fee (both unset = card payment hidden)
NEXT_PUBLIC_TURNSTILE_SITE_KEY  # Cloudflare Turnstile (both empty = off)
TURNSTILE_SECRET_KEY
STRIPE_WEBHOOK_SECRET   # events: checkout.session.{completed,async_payment_succeeded,expired,async_payment_failed},
                        # invoice.paid, customer.subscription.{created,updated,deleted}. Enable the customer portal in Stripe.
```

## Known audit findings (accepted risk, re-check each release)

Security audit 2026-11-05 (security-audit skill): no high or critical
advisories left. Removed the unused rich-text editor (cleared the
lexical/happy-dom highs) and pinned `dompurify` to 3.4.17 via
`overrides` (cleared the critical inside Payload's Monaco editor).
Accepted: 5 low + 5 moderate in build/migration tooling (drizzle-kit,
esbuild-kit), email rendering (html-to-text) and Payload's deepmerge; none
reachable from public routes. Baseline security headers set in
`next.config.ts`; a full script-src CSP (nonces) is still to do.
Re-check on every Payload upgrade and remove the dompurify override once
Payload ships a fixed Monaco.

Security reviews 2026-11-06 (web ordering; accounts, founding, events,
letters): SHIP, every BLOCKER/SHOULD fixed. Accepted: a sign-in link keeps
working for its 20 minutes even after "sign out everywhere"; erasure does
not remove the email from the Resend waitlist audience or from the Stripe
customer records (say so in the privacy notice, remove by hand on
request). A founding fee paid with no place left (or paid twice) is flagged
"DEVOLVER" on the order and in the audit log: refund it in Stripe.

Two-step admin sign-in 2026-11-08: `payload-totp` (MIT, deps otpauth,
qrcode, jsonwebtoken; no install scripts). It wraps EVERY collection's
access: a new public collection must join `PUBLIC_READ` in
payload.config.ts, and any custom route that trusts `payload.auth()` must
check `verifiedBackOffice` (lib/auth/roles.ts), not just the role. The TOTP
secret is stored in plain text in `payload.users.totp_secret` (same DB as
the password hashes; never exposed by the API). Keep the plugin LAST
except for our translations/transaction override right after it.

Full security audit 2026-11-09 (security-audit skill + three read-only
reviewers: access/privacy, auth/sessions, entry points/payments). FIXED:
deleting a member with a live Stripe subscription (refused, also from the
admin), erasure now also clears box delivery addresses and runs on every
member delete (beforeDelete hook), dashboard figures need the code
(`verifiedBackOffice`), managers cannot create founding members, a
repeated founding webhook no longer flags DEVOLVER (`members.foundingOrder`),
forgot-password and login throttled per IP and address, admin cookie
Secure in production, hasTotp check fails closed, member tokens on their
own derived key, orders readable by owner/manager only, raster-only
uploads, GraphQL disabled, OG fetch from SITE_URL, portal rate limit,
first-owner rule on any production host. Then (same day, founder's choice): shared
rate limits in Postgres (`lib/limits.ts` → the ONE locked-down function
`payload.rate_limit_hit`: SECURITY DEFINER, `search_path = pg_catalog,
pg_temp`, schema-qualified names, EXECUTE revoked from PUBLIC/anon/
authenticated; migration 20261109_120000_rate_limits) on waitlist, sign-in
links, orders, admin login and forgot-password (per IP per minute and per
day, per email); falls back to the in-memory limiter if the DB is down.
Cloudflare Turnstile (`components/HumanCheck.tsx`, server `humanCheck`,
fails closed) on the waitlist, sign-in and order forms: OFF until
NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY are set in Vercel.
Rule: any future database function follows the same pattern (definer only
if needed, fixed search_path, revoke from PUBLIC and Supabase roles). Same 5 low + 5 moderate
advisories as accepted above. Live Supabase SQL not re-run (needs the prod
password; schema-level "no USAGE" from 2026-11-07 covers new tables).

Waitlist in the database 2026-11-12: accepted single opt-in (anyone can
type a NEW address; rate limits + Turnstile per IP and email, letters need
the owner's approval and carry one-click unsubscribe). Add a confirm link
(double opt-in) once Resend is live.

Live Supabase check 2026-11-07: anon and authenticated have NO usage on
the `payload` schema (has_schema_privilege false/false); "Automatically
expose new tables" turned off in the Data API.

Pre-push audit 2026-11-06 (security-audit skill): SHIP. Same 5 low + 5
moderate advisories as accepted above, no secrets tracked, lockfile all
registry.npmjs.org, every collection spells out access, headers present
on /es, /pos, /admin. A build and every public page work with NO reachable
database (ordering shows "no disponible", events fall back to the static
list). Pending: the live Supabase checks (section 3) once DATABASE_URL
exists; Payload GraphQL is disabled (2026-11-09).

## Content editing

Until public pages read from the CMS, `CONTENT.md` remains the team guide:
the carta, its option groups and the builder all live in `content/carta.ts`;
editing on GitHub auto-deploys. The Payload admin at
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
- **Phase 2 — Stripe founding membership**: BUILT 2026-11-06 (`lib/founding.ts`).
  Closed until the owner sets price, IVA, places and the switch in Empresa.
- **Phase 3 — Recipe builder**: MVP SHIPPED without a database. `/crea`
  (`/create`): rebuilt 2026-11-05 on the real carta: tea (every item with a
  preparation group), usucha/solo or latte (+1,40), milk for lattes, extras
  (multi). `lib/recipe.ts` holds the pure logic: price = carta price +
  option deltas (same as the menu and the till), colour blend for the photo,
  URL codec (`?r=nishio.latte.avena.coconut-cloud~ube`, "no" when empty),
  display code (NIS·LAT·AVE·CCL). On phones a sticky bar keeps the live
  price in reach. The recipe card shows a QR (qrcode-generator, dynamic
  import) encoding the share URL; redeem = show the card at the counter.
  Named recipes (device-only) and "order this recipe" BUILT 2026-11-05.
- **Phase 4 — Events / RSVP**: BUILT 2026-11-06 (`lib/events.ts`, Rsvps).
- **Phase 5 — Email campaigns**: BUILT 2026-11-06 (Campaigns collection,
  owner approves, opted-in members only, one-click unsubscribe). The old
  Resend waitlist audience is separate; Resend free = 100 emails a day.
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

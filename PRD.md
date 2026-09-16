# PRD — maisha matcha

The living product document. Phase 0 shipped; this records what exists, the
rules it obeys, and what each next phase means. Read alongside `CLAUDE.md`
(engineering conventions) and `.claude/skills/maisha-brand/SKILL.md` (brand
law). Team content editing: `CONTENT.md`.

## Product

maisha matcha is the first premium matcha salon in Murcia, Spain. The site
sells one thing before opening: becoming one of the **fifty founding
members** (first tasting invitation, early event access, founding price on
the future membership). Bilingual: Spanish first, English sibling.

Live: https://maisha-matcha.vercel.app · Repo: joel4apostles/MaishaMatcha
Pipeline: push → GitHub Actions (lint + tsc + build) → Vercel auto-deploy.

## Phase 0 — SHIPPED

- **Pages**: Home (cinematic render hero → manifesto → story teaser → carta
  bento → space gallery → founding band), Carta, Crea tu bebida, Historia,
  Eventos, legal ×2, localized 404.
- **Identity**: warm paper / ink / olive-gold accent / timber hairlines /
  matcha-ink moss surfaces / per-drink natural hues / powder wordmark.
  Motion: staged reveals, scroll-ink, drawing timeline — quiet, once, no
  loops. All AA-verified (measured, not eyeballed).
- **Waitlist**: Resend-backed with graceful no-env degradation, rate-limited,
  hardened per security audit (SHIP verdict).
- **Recipe builder (Phase 3 MVP, pulled forward)**: no-database composer at
  `/crea` — intensity, base, fruit, temperature from `content/recipe.ts`;
  live price/ratio/blended color; recipe encoded in the URL; card with
  counter code (CLA·TON·YUZ·F) + QR. Redeem = show the card.
- **SEO**: per-locale metadata, hreflang, canonical, render OG image,
  JSON-LD, sitemap, robots, cookieless analytics.

## Operating rules (do not regress)

1. No database, no auth, no payments until their phase arrives. Content
   files are the single source of truth; the team edits them on GitHub.
2. Brand law governs every user-facing change; auditors enforce it.
3. Every visual milestone passes the bench (below) before shipping.
4. Both locales always; prices stay marked as drafts until confirmed.

## The auditor bench

Read-only agents in `.claude/agents/`, verdict protocol BLOCKER/SHOULD/NIT →
SHIP/ITERATE: design-reviewer (visual/brand), ux-auditor (flows/mobile),
cmo-copy (voice/bilingual/conversion), chief-architect (structure/perf/
migration fitness), cto-review (engineering quality), security-review
(server surface). Milestones run design+ux+copy in parallel; phase
transitions add architect+cto.

## NOW — Design week (current sprint)

**Baseline audit (2026-08-11, five agents): complete.** Architect + security
SHIP; design/ux/copy ITERATE with strong consensus. All blockers fixed same
day: builder keyboard focus (option-tile:has(:focus-visible)), locale switch
now preserves ?r= recipes, dark-band label contrast to washi/85, bento dim
capped at 90%, menu meta describes the real carta, email promise honest
("on the list", not "your place"), draft prices marked on the carta, EN hero
line de-calqued, "plazas" register, localized origin, Hibisco, double-submit
guard, error focus management, builder→waitlist CTA, QR failure fallback,
canonical share URLs. Deferred (logged): locale-aware number formatting
(brand decision: Spanish price typography site-wide), codec version token
(before next schema change), recipe codec unit tests + CI test job,
StageWords/WordReveal merge, menu deep-links from home cards, mobile sticky
recipe summary, KV rate limiter (on first abuse signal).

Full-design pass across the site. Inputs: the five-agent baseline audit
above, founder direction, the deck.

**2026-09-07 — brand kit adopted (Concept 1, kit green site-wide).** The
"Maisha Proposed Brand Identity" kit's M-leaf icon + serif wordmark lockup
extracted as exact vectors (IoU-verified) → favicon/app icons, header/footer
lockup, hero wordmark. Kit green #9BAB37 replaces the moss as THE brand
green; bright bands flip to sumi ink (contrast battery: sumi 6.8:1, sumi/85
5.3:1; washi and gold fail on green — banned there). Recipe builder gains
DrinkGlass: a live glass where each choice pours/blends/bubbles/ices with
one-shot transitions (founder ask: "see the visual process of making the
matcha"). Open follow-ups: OG image with the new lockup, footer monumental
wordmark still typographic (kit serif version pending), eventos/email still
lagging the identity. Non-negotiables: brand
law, AA contrast, Lighthouse ≥95, no new dark bands, no gradients. Open
design intents from the founder: matcha color presence (delivered — keep
tuning by eye), drink-hue system (delivered), bigger typographic hierarchy
(delivered), more attention-capturing storytelling (staged reveals
delivered — evaluate). Pending founder input: new recipe ingredient list,
final prices, real photography.

## Next phases

- **Phase 1 — Payload CMS + admin dashboard: IN PROGRESS (2026-09-07).**
  Payload 3 embedded at /admin. Collections live: Users(roles), Media,
  MenuCategories/Items (prices in cents), RecipeOptions (builder steps),
  Events, StoryChapters, InventoryItems + StockMovements (append-only
  ledger, phase 6 pulled forward), Orders (status board, recipe codes),
  Members (founding/premium subscribers — Joel confirmed the premium
  ordering system needs the DB). ES/EN localization mirrors the site.
  DB: SQLite locally, DATABASE_URL (Neon/Vercel Postgres) in production +
  PAYLOAD_SECRET. Seed script imports content/*.ts (`npm run seed`).
  Remaining: boot-verify admin, first admin user, seed run, migrate public
  pages from content files to CMS queries with revalidation, media storage
  adapter (Vercel Blob) for prod uploads.
- **Phase 2 — Stripe founding membership**: paid founding tier, accounts;
  the founding-price promise honored at checkout.
- **Phase 3 completion — recipes get memory**: saved/named recipes attached
  to members (URL codec becomes the persistence key), share pages, drink of
  the month from community recipes, pre-order for pickup.
- **Phase 4 — Events/RSVP**: seat-limited booking; founding gating becomes
  functional.
- **Phase 5 — Email campaigns**: Resend audience built by the waitlist is
  the seed list; templates inherit the identity.
- **Phase 6 — Inventory ledger**: stock as append-only movements.
  Collections already live (pulled forward with Phase 1); depletion wiring
  comes with Phase 7.
- **Phase 7 — POS + supplier automation (founder vision, 2026-09-17).**
  maisha is a physical salon: website + admin + a counter POS. The canonical
  flow: customer orders a matcha latte → the barista (own account) taps the
  drink → the screen pre-fills its default grams + matcha variety → the
  barista measures and can adjust to the actual scoop → charge → the Order
  stores drink, price, recorded grams, variety, barista, timestamp → a
  StockMovement subtracts those grams from that variety, admin inventory
  updates live → when stock crosses `reorderThresholdGrams`, a reorder
  email to the linked Supplier (Resend; draft-for-team-approval before
  auto-send; debounced, one email per crossing). Data prerequisites:
  MenuItems gain `defaultGrams` + a relationship to their InventoryItem
  variety; Users gain a `barista` role (POS-only access); Orders gain a
  `barista` relationship; new Suppliers collection (name, email, varieties).
  Side benefit: recipe-vs-measured gram drift per barista falls out of the
  order data.

## Task board (session tasks #18-24, 2026-09-17)

| # | Task | Status |
|---|------|--------|
| 18 | Payload CMS: install + config + admin route scaffold | done |
| 19 | Payload collections: content + inventory + orders + media | done |
| 20 | Seed from content files + verify admin + ship (first user, `npm run seed`, Supabase DATABASE_URL + PAYLOAD_SECRET on Vercel, prod /admin verified) | in progress |
| 21 | POS counter sales screen (pre-filled grams, editable, tap-first) | pending, needs 20 + 22 |
| 22 | Barista accounts + per-barista order attribution | pending |
| 23 | Sales-driven inventory depletion in grams (StockMovements per drink line) | pending, needs 21 |
| 24 | Suppliers collection + automated low-stock reorder emails | pending, needs 23 |

Order of attack: finish 20, then 22 → 21 → 23 → 24. Between 20 and the POS
block sits the founder's stated priority: UX/UI polish + full mobile
optimization pass (390px CDP audit, auditor bench re-run on the new
identity).

## Open items

Resend env vars on Vercel (waitlist currently degrades) · NEXT_PUBLIC_SITE_URL
· custom domain · confirmed prices · legal review · real photography · the
founder's new matcha recipe (ingredients pending) · Lighthouse run on prod.

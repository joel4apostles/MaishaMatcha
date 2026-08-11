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
above, founder direction, the deck. Non-negotiables: brand
law, AA contrast, Lighthouse ≥95, no new dark bands, no gradients. Open
design intents from the founder: matcha color presence (delivered — keep
tuning by eye), drink-hue system (delivered), bigger typographic hierarchy
(delivered), more attention-capturing storytelling (staged reveals
delivered — evaluate). Pending founder input: new recipe ingredient list,
final prices, real photography.

## Next phases

- **Phase 1 — Payload CMS + admin dashboard**: `content/*.ts` become
  collections behind a real login. The team manages carta, recipe options,
  prices, ratios, events and story from an admin UI with roles. This — not
  an ad-hoc panel — is the "adaptive recipes" milestone.
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

## Open items

Resend env vars on Vercel (waitlist currently degrades) · NEXT_PUBLIC_SITE_URL
· custom domain · confirmed prices · legal review · real photography · the
founder's new matcha recipe (ingredients pending) · Lighthouse run on prod.

# CLAUDE.md — maisha matcha

Launch website for **maisha matcha**, the first premium matcha salon in Murcia,
Spain. Phase 0: a bilingual (ES default, EN) marketing site with a single
dynamic feature (a founding-members waitlist). Later phases add a CMS, payments,
and more — scaffold cleanly, build only what a phase specifies.

## Brand law (read first)

The **`maisha-brand`** skill (`.claude/skills/maisha-brand/SKILL.md`) is the law
for all user-facing UI, copy, and email. Load it before any such work. Summary:

- Palette (from the founder's design deck, 2–3 colors max, much whitespace):
  `washi #F5F1E8` paper · `sumi #1C1B18` ink · `gold #786000` the signature
  accent · `wood #B08D57` timber hairlines. **No green.**
- `gold` is RARE: the wordmark, one primary CTA per view, the focus ring.
  Nothing else.
- Wordmark "maisha matcha" is lowercase **body sans (Hanken Grotesk), medium,
  in gold** — not the serif. Editorial headlines use **Cormorant Garamond**.
- **No em/en dashes** in copy (use commas, periods, parentheses; ranges as
  words: "Mar a Dom"). **No gradients** anywhere — flat color fields only.
- Tone: poetic, sober, almost silent. No exclamation marks, no emojis, no
  "premium/elevate/indulge", no superlatives. The Octavio Paz register.
- The **quiet test**: if anything shouts (a color used twice, a bold weight, a
  busy section, a second accent), remove it. Choose the quieter option.

Design tokens live in `app/globals.css` (`@theme`). Every later phase (emails,
OG, admin) inherits them.

## Stack & hard constraints

- **Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4**, Vercel.
- **No database, no CMS, no auth, no payments.** Content lives in typed files
  under `/content`. The only server code is `/api/waitlist` and `/api/og`.
- i18n via **next-intl**: routes `/es` (default) and `/en`, localized pathnames
  (`/historia`↔`/story`, `/eventos`↔`/events`, etc.). Zero hardcoded strings.
- Custom components only on public pages. Motion is CSS + IntersectionObserver
  (`components/Reveal.tsx`), honoring `prefers-reduced-motion`. No animation lib.
- WCAG AA: semantic HTML, visible focus, ≥44px targets. Fonts via `next/font`
  (no CLS). Lighthouse mobile target ≥ 95/95/95.

## Commands

```bash
npm run dev            # dev server (localhost:3000)
npm run build          # production build (must stay clean)
npm run start          # serve the build
npx tsc --noEmit       # type check (strict)
npm run lint           # ESLint (must be zero errors)
```

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
5. **OG image** (`/api/og`) uses next/og's default font by design (deterministic,
   no network). Swapping in Cormorant/Hanken is a nice-to-have, not required.

## Environment

```
RESEND_API_KEY          # server-only; waitlist audience + confirmation email
RESEND_AUDIENCE_ID
RESEND_FROM             # optional, defaults to "maisha matcha <hola@maishamatcha.es>"
NEXT_PUBLIC_SITE_URL    # canonical origin for metadata/OG/sitemap
```

## Known audit findings (accepted risk, re-check each release)

`npm audit --omit=dev` reports 3 highs, all transitive inside next@15
(bundled postcss; sharp/libvips). Assessed 2026-08-11: postcss issues are
build-time on first-party CSS only; sharp is only fed our own static images
(no `remotePatterns`, no uploads), and Vercel runs optimization on managed
infra. Real fix requires next@16 (breaking). Re-assess when bumping Next or
if remote images / user uploads are ever enabled.

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

- **Phase 1 — Payload CMS**: move menu/story/events/space content behind Payload;
  keep the typed `/content` shape as the collection schema.
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
  pattern.

When a phase lands, update this file and the `maisha-brand` skill if the brand
system evolves.

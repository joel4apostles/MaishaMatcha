# maisha matcha — phase 0 PRD v2 (Claude Code edition)
### With design skills, agents, and visual self-verification

This document has three parts:
- **Part A** — one-time environment setup (run in terminal before the session)
- **Part B** — repo-local skill + subagent files (create these files verbatim in the repo)
- **Part C** — the PRD prompt itself (paste into Claude Code, or save as `PRD.md` and say: *"Read PRD.md and build it exactly as specified. Work phase by phase. Use the design-reviewer agent and Playwright screenshots to verify every visual milestone before moving on."*)

---

## PART A — Environment setup (terminal, before starting)

```bash
# 1. Playwright MCP — gives Claude eyes (screenshots, browser verification)
claude mcp add playwright -- npx @playwright/mcp@latest

# 2. Official Anthropic frontend-design skill (via plugin marketplace)
#    In a Claude Code session:
#    /plugin marketplace add anthropics/claude-code
#    /plugin install frontend-design@claude-code
#    (Alternative: npx -y skills add anthropics/skills --skill frontend-design --agent claude-code)

# 3. Verify
claude mcp list        # playwright should appear
```

Notes:
- The frontend-design skill bans generic AI-default fonts (Inter, Roboto, etc.) and forces a committed design direction — this PRD's typography is chosen to comply.
- The Playwright MCP is Microsoft's official `@playwright/mcp`. Claude will use it to screenshot `localhost:3000` at 390px and 1440px and iterate on what it *sees*, not just what it wrote.
- Screenshots cost tokens: instruct Claude to screenshot at milestones, not every edit.

---

## PART B — Repo-local skill and subagent (create before the build session)

### B1. `.claude/skills/maisha-brand/SKILL.md`

```markdown
---
name: maisha-brand
description: Brand law for maisha matcha — design tokens, typography, tone of voice, and the quiet test. Load for ANY task that produces user-facing UI, copy, or email in this repository.
---

# maisha brand law

maisha matcha is a premium matcha salon in Murcia. Its brand is "lujo
silencioso": quiet, real luxury — sensory and material, never loud.
References: Aesop, Blue Bottle, the Japanese chashitsu, kigumi joinery.

## Tokens (never invent colors or fonts outside this list)
- washi  #F5F1E8  background, warm paper
- sumi   #1C1B18  ink, primary text
- matcha #6B7F5E  RARE accent only: links, focus ring, one primary CTA
- wood   #B08D57  hairlines and borders, usually at 30–60% opacity
- Serif display: Cormorant Garamond (300/400) — headlines, drink names,
  poetic lines. Generous letter-spacing on small-caps eyebrows.
- Body sans: Hanken Grotesk (400/500) — body, UI, forms. Never Inter,
  Roboto, Arial, or system defaults.

## Layout
- Whitespace is the primary material. Section padding ≥ 6rem desktop,
  ≥ 4rem mobile. Text measure ≤ 65ch. Max content width 1100px.
- One signature motif: a fine kigumi grid (0.5px wood-tone SVG lattice,
  ≤ 8% opacity) used in ONE hero element per page maximum.
- Mobile-first at 390px.

## Motion
- Fade-and-rise on scroll only: 12px, 0.6s, ease-out, once.
- Nothing loops, bounces, or pulses. Respect prefers-reduced-motion.

## Tone of voice (ES first, then EN)
- Poetic, sober, almost silent. Short sentences. Concrete nouns.
- FORBIDDEN: exclamation marks, emojis, "premium", "elevate", "discover
  the world of", "indulge", superlatives, marketing clichés.
- The Octavio Paz register: matter and light, calm, presence.

## The quiet test (apply before declaring any screen done)
Look at the rendered result and ask: does anything shout? A color used
twice, a bold weight, a busy section, a second accent, a decorative
flourish? If yes, remove it. When in doubt between two options, choose
the quieter one.
```

### B2. `.claude/agents/design-reviewer.md`

```markdown
---
name: design-reviewer
description: Read-only design critic. Use PROACTIVELY after every visual milestone — reviews Playwright screenshots of the running site against maisha brand law and accessibility standards. Never writes code.
tools: Read, Glob, Grep, mcp__playwright__*
---

You are the design director for maisha matcha. You review, you never
implement. The maisha-brand skill is your law; WCAG AA is your floor.

When invoked:
1. Take (or receive) screenshots of the target pages at 390px and
   1440px via Playwright against the local dev server.
2. Critique against, in order of severity:
   a. Brand violations — wrong fonts/colors, loud elements, cramped
      whitespace, more than one accent per view, motif overuse,
      marketing-cliché copy, exclamation marks.
   b. Accessibility — contrast below AA, missing focus states, touch
      targets under 44px, heading order, form labels.
   c. Craft — misaligned baselines, inconsistent spacing rhythm,
      orphaned words in headlines, layout shift, overflow at 390px.
3. Return a numbered list: [BLOCKER] / [SHOULD] / [NIT], each with the
   exact element, what is wrong, and the minimal fix. No praise padding.
4. End with a verdict: SHIP or ITERATE. ITERATE requires zero BLOCKERs
   remaining to flip.

Be the honest senior colleague: direct, specific, never cruel.
```

---

## PART C — The PRD prompt

> Everything below is the build specification. Read fully before writing any code.

## 1. Context

You are building the launch website for **maisha matcha**, the first premium matcha salon in Murcia, Spain. The site launches **tomorrow**. It is phase 0 of a larger application (Payload CMS, Stripe founding membership, recipe builder, events/RSVP, email campaigns, inventory ledger) that will be built later in this same repository — scaffold cleanly, but build ONLY what this document specifies.

The `maisha-brand` skill in this repo is the brand's law: quiet luxury, minimalism with character, poetic and sober tone, matter and light. Load it for all UI and copy work. The `frontend-design` skill applies to all interface construction. The `design-reviewer` agent must approve every visual milestone.

**Audience:** design-conscious locals and visitors in Murcia seeking an experience, not a commodity. Bilingual: Spanish (default) and English.

## 2. Hard constraints (invariants)

- Stack: **Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4**, deployed on Vercel.
- **No database. No CMS. No auth. No payments.** Content lives in typed files under `/content`. The only server code is the waitlist API route and the OG image route.
- Waitlist: **Resend Audiences** + branded confirmation email (React Email). Env: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`. Missing env in dev → log payload, return success, never crash.
- i18n: **next-intl**, routes `/es` (default) and `/en`. Zero hardcoded user-facing strings.
- No component libraries on public pages. Custom components only. Framer Motion sparingly.
- Accessibility: semantic HTML, visible focus states, WCAG AA, `prefers-reduced-motion` honored.
- Performance: Lighthouse mobile ≥ 95 / 95 / 95. Fonts via `next/font` (no CLS). Images via `next/image`.
- Typography per brand skill: **Cormorant Garamond** display + **Hanken Grotesk** body. Never Inter/Roboto/system.
- Mobile-first at 390px.

## 3. Non-goals (do not build, do not stub, do not "helpfully add")

No login, no accounts, no Stripe, no admin, no blog, no recipe builder, no bookings, no cookie banner (analytics is cookieless), no dark mode, no CMS, no test suite beyond types + build. These are later phases. If tempted: stop.

## 4. Design system

Tokens exactly as defined in the `maisha-brand` skill (washi / sumi / matcha / wood; type scale display clamp 2.5→4.5rem, body 1rem/1.7, small-caps eyebrows 0.75rem with 0.15em tracking). Encode as Tailwind theme tokens in the first commit — every later phase (emails, OG, admin) inherits them.

Photography: warm, low-contrast placeholder blocks carrying the kigumi grid motif, aspect-locked, ready for real photos. No stock services, no generated images.

## 5. Pages and content

Routes under `/[locale]/`:

**`/` — Home**, sections in order:
1. Hero — lowercase serif wordmark "maisha matcha", one poetic line, eyebrow "Murcia · Primer salón de matcha", single CTA → waitlist. Kigumi motif lives here (only here on this page).
2. Manifesto — 3 short poetic paragraphs on the brand's definition of luxury (matter, light, calm). Write real copy, ES first, then EN.
3. Menu preview — 4 signature drinks as a restrained editorial list (serif name, one-line description, price) → `/menu`.
4. The space — 2–3 image placeholders + one paragraph (chashitsu, tatami, warm wood, curated art: chawans, weaving, the tree).
5. **Founding members** — "Socios fundadores" / "Founding members": the first 50 members lock in opening privileges (first tasting invitation, early event access, founding price on the future membership). Waitlist form: name + email + consent line. Success replaces the form with one quiet confirmation sentence.
6. Footer — Murcia address placeholder, Instagram placeholder, hours placeholder, ES/EN switcher, legal links.

**`/menu`** — full menu, editorial single column. Categories: Ceremonial (usucha, koicha), Lattes (matcha, hōjicha; oat default), Especiales (seasonal + "omakase del barista"), Dulces (2). Each: name, one-line description, price, optional origin note ("Uji, Kioto"). Content in `/content/menu.ts`, localized.

**`/historia` (`/story`)** — long-form editorial: restrained vertical timeline, 6–8 chapters (Tang origins → Eisai 1191 → chanoyu and Sen no Rikyū → wabi-sabi → shade-growing and grading → why Murcia, why now). Each chapter: small-caps era label, serif heading, ≤ 90-word paragraph. Accurate, real copy, both languages.

**`/eventos` (`/events`)** — program teaser (tastings, ceremony evenings, artist collaborations) + 2 placeholder events with "reservado a socios fundadores" badge + CTA to waitlist. Content in `/content/events.ts`.

**Legal** — `/aviso-legal`, `/privacidad`: minimal honest placeholders flagged for legal review, localized.

## 6. Waitlist flow (the only dynamic feature)

- `POST /api/waitlist`: zod-validated `{ name, email, locale }`, naive in-memory rate limit (5/min/IP), add contact to Resend audience with `locale` property, send confirmation.
- Confirmation email (React Email, brand tokens): serif "Bienvenido a maisha" / "Welcome to maisha", one poetic line, what happens next, footer. Locale-selected.
- Client: optimistic UI, inline sober error states. No toasts, no modals.

## 7. SEO and metadata

Per-locale metadata, `hreflang` alternates, canonicals. One static branded OG image via `@vercel/og` (wordmark on washi + grid motif). JSON-LD `CafeOrCoffeeShop` with Murcia placeholder address/geo. `sitemap.xml`, `robots.txt`, `@vercel/analytics` (cookieless).

## 8. Repository structure (create exactly)

```
.claude/skills/maisha-brand/SKILL.md      # Part B1 (already present)
.claude/agents/design-reviewer.md         # Part B2 (already present)
/app/[locale]/(site)/page.tsx
/app/[locale]/(site)/menu/page.tsx
/app/[locale]/(site)/historia/page.tsx
/app/[locale]/(site)/eventos/page.tsx
/app/[locale]/(site)/aviso-legal/page.tsx
/app/[locale]/(site)/privacidad/page.tsx
/app/api/waitlist/route.ts
/app/api/og/route.tsx
/components/
/content/menu.ts  /content/events.ts  /content/site.ts
/emails/waitlist-confirmation.tsx
/messages/es.json  /messages/en.json
/lib/
CLAUDE.md
```

`CLAUDE.md` must be written during this build: point to the maisha-brand skill as law, record conventions (i18n, content files, component patterns), the review loop (Playwright + design-reviewer), and the phase 1–6 roadmap (Payload, Stripe membership, recipe builder + share/redeem, events/RSVP, email campaigns, inventory ledger over the stock-movements pattern). Future sessions read it first.

## 9. Build order — with the visual verification loop

The loop, applied at every step marked **[REVIEW]**:
`npm run dev` → Playwright screenshots of the affected pages at **390px and 1440px** → invoke the **design-reviewer** agent on those screenshots → fix all BLOCKERs → re-screenshot → proceed only on SHIP. Screenshot at milestones only, not every edit.

1. Scaffold: Next + TS strict + Tailwind + next-intl + fonts + tokens. Verify: build passes, both locales render.
2. Design primitives: shell, section, eyebrow, serif headline, button, form field, kigumi SVG motif, placeholder image block. **[REVIEW]** — this checkpoint matters most; everything downstream inherits it.
3. Home with real bilingual copy (ES written first; tone per brand skill). **[REVIEW]**
4. Menu, Historia, Eventos, legal pages. **[REVIEW]**
5. Waitlist API + email + form states (screenshot the email preview too). **[REVIEW]**
6. SEO, metadata, OG image, sitemap, analytics. **[REVIEW]** the OG image render.
7. Final pass: clean `npm run build`, zero type/lint errors, Lighthouse locally until §2 budgets pass, full-site reviewer pass at both widths. List anything not verifiable locally.

## 10. Definition of done

- Build clean, TypeScript strict, zero ESLint errors.
- Every string localized; locale switching never 404s.
- Waitlist works with env, degrades gracefully without.
- Lighthouse mobile ≥ 95 / 95 / 95; zero CLS.
- design-reviewer verdict: SHIP on every page at 390px and 1440px, zero BLOCKERs.
- The quiet test passes everywhere: if any screen feels loud, busy, or like generic AI output, it is wrong — simplify until it is silent.

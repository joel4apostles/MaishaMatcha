---
name: maisha-brand
description: Brand law for maisha matcha — design tokens, typography, tone of voice, and the quiet test. Load for ANY task that produces user-facing UI, copy, or email in this repository.
---

# maisha brand law

maisha matcha is a premium matcha salon in Murcia. Its brand is "lujo
silencioso": quiet, real luxury — sensory and material, never loud.
References: Aesop, Blue Bottle, the Japanese chashitsu, kigumi joinery.

## Tokens (never invent colors or fonts outside this list)
Palette from the founder's design deck: paper, ink, olive-gold, timber.
Reduced palette, 2–3 colors maximum, much negative space.
- washi  #F5F1E8  background, warm paper
- sumi   #1C1B18  ink, primary text
- gold   #786000  the SIGNATURE accent (deck wordmark color). RARE: the
  wordmark, one primary CTA, the focus ring. Nothing else.
- wood   #B08D57  timber hairlines and borders, usually at 30–60% opacity
- The wordmark "maisha matcha" is set lowercase in the body sans, medium
  weight, in gold (as in the deck) — not the serif.
- Serif display: Fraunces (300-600) — adopted 2026-09-07 to match the brand
  kit's warm rounded terminals. Editorial headlines, drink names, poetic
  lines. Generous letter-spacing on small-caps eyebrows.
- Body sans: Hanken Grotesk (400/500) — body, UI, forms. Never Inter,
  Roboto, Arial, or system defaults.
- Green system (founder adopted the brand kit, 2026-09-07):
  - matcha #9BAB37 — THE brand green (kit Concept 1): the logo lockup, the
    hero panel, the founding band, favicon background, card hover tints.
  - Bright-green bands are LIGHT surfaces: ink on them is SUMI (full for
    headings, ≥/85 for small text — sumi/70 fails at 3.9:1). Washi and gold
    both fail on this green (≈2.3:1) — never put them on it. CTAs on green
    are sumi-filled with washi text. Use .brand-band for sumi focus rings.
  - Drink hues (content/menu.ts `color`) — each drink's natural color as
    swatch + that card's hover tint. Product color, like food on a table.
  - matcha powder (#9BAB37 + noise speckle) — footer wordmark only.
- The logo lockup (Concept 1): BrandMark (M-of-hillsides + split leaf) +
  BrandWordmark (serif "Maisha" with leaf i-dot over spaced MATCHA), both
  from the OFFICIAL designer SVGs in "Maisha logo files" (colorways:
  #9BAB37 bright, #454F0B deep green, white), rendered via currentColor:
  matcha green on washi, washi over the hero image. Logos are exempt from
  text contrast rules; body text never is.
- Matcha powder texture (public/images/matcha-powder.jpg, from the kit):
  the material of the green bands — always UNDER a bg-matcha/80 veil
  (20% powder show-through is the AA ceiling: sumi worst-case 4.55:1).
  Never place text on raw powder.

## Layout
- Whitespace is the primary material. Section padding ≥ 6rem desktop,
  ≥ 4rem mobile. Text measure ≤ 65ch. Max content width 1100px.
- One signature motif: a fine kigumi grid (0.5px wood-tone SVG lattice,
  ≤ 8% opacity) used in ONE hero element per page maximum.
- Mobile-first at 390px.
- NO gradients anywhere in the DESIGN. Flat color fields only (backgrounds,
  buttons, placeholders, OG image). Depth comes from whitespace and
  hairlines, not from blends.
- FOUNDER EXEMPTION (2026-09-07): the drink visualization in the recipe
  builder (today PhotoDrink; the Phase 6 live drink later) is treated like a photograph — it may use gradients
  (liquid depth, glass shine) and quiet ambient loops (rising bubbles,
  steam) because it depicts the physical drink. The exemption covers ONLY
  this component; ambient loops must die under prefers-reduced-motion.

## Motion (v2 vocabulary, founder-approved cinematic pass)
- Base: fade-and-rise, 12px, 0.6s, ease-out, once. Nothing loops, bounces,
  or pulses. Respect prefers-reduced-motion; no-JS fallback is fully visible.
- Sanctioned extensions, each used in ONE place:
  - Hero word-rise: per-word staggered fade-and-rise on load (CSS only).
  - Manifesto scroll-ink: words go faint (18%) to full ink with scroll.
  - Historia rail: a wood line draws down the timeline with scroll.
  - Story chapters: staged entrance on scroll (era rises, title assembles
    word by word, body follows; ~550ms sequence, once per chapter).
  - Hover only: image zoom ≤ 1.04 (0.7s), nav underline slide-in, menu
    bento focus-dim (others to 75%, never below AA).
- No blur flourishes, no parallax, no pinned/sticky scroll scenes.

## Tone of voice (ES first, then EN)
- Poetic, sober, almost silent. Short sentences. Concrete nouns.
- FORBIDDEN: exclamation marks, emojis, "premium", "elevate", "discover
  the world of", "indulge", superlatives, marketing clichés.
- NO em dashes and NO en dashes in user-facing copy. Use commas, periods,
  or parentheses. Ranges read as words ("Mar a Dom", "9:00 a 20:00").
- The Octavio Paz register: matter and light, calm, presence.

## Composition patterns (sanctioned)
- Tonal arc: the home page opens dark (image hero) and closes dark (founding
  band on matcha-ink). Everything between stays washi. No more dark bands.
- Image hero: render at low scrim (≤25%); text lives on a flat matcha-ink
  panel (80%), lower-left. Small text over raw image needs its own chip.
- Header: sticky single row; transparent with washi text over the home hero,
  washi background everywhere else. Colors transition, layout never shifts.
- Footer closes with the monumental wordmark in wood/35. Decorative,
  aria-hidden, one per site.
- On dark bands use the `.dark-band` class: focus rings switch to washi.
- Interactive cards may tint matcha on hover (bg matcha-ink ≤6%, border
  matcha-ink/50) — links only, never on inert surfaces.
- Mobile: image rows become snap-scroll galleries (82% cells); no carousels
  on desktop, no autoplay anywhere.

## The quiet test (apply before declaring any screen done)
Look at the rendered result and ask: does anything shout? A color used
twice, a bold weight, a busy section, a second accent, a decorative
flourish? If yes, remove it. When in doubt between two options, choose
the quieter one.

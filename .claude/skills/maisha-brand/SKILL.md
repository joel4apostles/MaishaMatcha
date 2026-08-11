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
- Serif display: Cormorant Garamond (300/400) — editorial headlines, drink
  names, poetic lines. Generous letter-spacing on small-caps eyebrows.
- Body sans: Hanken Grotesk (400/500) — wordmark, body, UI, forms. Never
  Inter, Roboto, Arial, or system defaults.
- No green. The deck's accent is olive-gold, not matcha green.

## Layout
- Whitespace is the primary material. Section padding ≥ 6rem desktop,
  ≥ 4rem mobile. Text measure ≤ 65ch. Max content width 1100px.
- One signature motif: a fine kigumi grid (0.5px wood-tone SVG lattice,
  ≤ 8% opacity) used in ONE hero element per page maximum.
- Mobile-first at 390px.
- NO gradients anywhere. Flat color fields only (backgrounds, buttons,
  placeholders, OG image). Depth comes from whitespace and hairlines, not
  from blends.

## Motion (v2 vocabulary, founder-approved cinematic pass)
- Base: fade-and-rise, 12px, 0.6s, ease-out, once. Nothing loops, bounces,
  or pulses. Respect prefers-reduced-motion; no-JS fallback is fully visible.
- Sanctioned extensions, each used in ONE place:
  - Hero word-rise: per-word staggered fade-and-rise on load (CSS only).
  - Manifesto scroll-ink: words go faint (18%) to full ink with scroll.
  - Historia rail: a wood line draws down the timeline with scroll.
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

## The quiet test (apply before declaring any screen done)
Look at the rendered result and ask: does anything shout? A color used
twice, a bold weight, a busy section, a second accent, a decorative
flourish? If yes, remove it. When in doubt between two options, choose
the quieter one.

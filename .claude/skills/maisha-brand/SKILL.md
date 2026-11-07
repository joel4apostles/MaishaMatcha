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
  the material of the green bands — always UNDER a bg-matcha/85 veil
  (raised from /80 on 2026-11-05: /80 was exactly the AA ceiling at 4.55:1).
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
- FOUNDER EXEMPTION (2026-11-07): the home pour video (PourVideo) has its
  edges feathered into washi with a CSS mask, so it reads printed on the
  page. Only that video; photographs keep their clean edge.
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
  - Story glyphs (sticky panel, desktop): each era's kanji is written in
    top to bottom (clip reveal, 1.1s, once per chapter change); the era
    label rises after it. Large and quiet (matcha/40). Phones show the
    kanji inline in each chapter's staged entrance.
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
- HOME HERO (founder, 2026-11-06, final): the full picture. The salon render
  full bleed under the transparent header, one flat sumi/45 veil (one
  layer only: stacked veils leave a visible edge). No panel or box (the
  founder rejected the green panel AND the light editorial spread as
  cheap). Poetic line in washi straight on the picture, lower left
  (Fraunces light, --text-hero, word-rise), one sumi CTA + one sumi
  underlined link (on the card), honest render note bottom right. The picture
  settles once from a slight zoom.
- HERO CARD (founder, 2026-11-06): the matcha card returns on the full
  picture (powder under matcha/95, sumi ink, shikishi inner hairline at
  sumi/25). Japanese touches, one each: 一期一会 brushed vertically beside
  the line (Yuji Syuku, aria-hidden, sr-only translation), signed by a small
  OUTLINE seal 抹茶 beneath it (never a filled block: it reads as a button).
  Seal presses in once (scale 1.08 to 1, no rotation).
- CARTA (founder, 2026-11-06, from the reference board): matchas as tasting
  cards (grade label in leaf #454F0B, name, region, notes, usucha/latte,
  a quiet link to /crea). Kanji numerals 一二三四 on section headings only
  (not the jump nav), one vertical phrase 和敬清寂, outline seal at the foot.
  Price labels sentence case. Never show [POR CONFIRMAR]: a fact we lack
  (cultivar, harvest) is simply absent until the founder gives it.
- HOME PATH (2026-11-06): sections marked 一 manifesto, 二 story, 三 carta,
  四 space, 五 founding (Eyebrow `numeral` prop). The home carta uses the
  same TastingCard as /carta; on phones the cards are a swipe row (82%).
- Kanji numerals mark steps on: home, carta, ordering, product "how to use".
- Language switch: a quiet "ES ⌄" dropdown (endonyms Español / English),
  never two loose letters.
- Visit block: a colophon (address large in the serif, hours and
  directions beside it). No street photography there.
- Story kanji use the brush face (Yuji Syuku, --font-brush), never a
  system gothic.
- Tonal arc (updated 2026-11-06): the home page opens on the full picture
  (dark veil) and closes on the matcha founding band. No other dark bands.
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

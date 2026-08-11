# CONTENT.md — editing the carta and the recipe builder (for the team)

Everything customers see comes from two files. Edit them on GitHub (no code
setup needed) and the site redeploys automatically in about a minute.

> GitHub → `content/menu.ts` or `content/recipe.ts` → pencil icon (Edit) →
> make the change → "Commit changes". Vercel deploys on save.

## 1. The carta — `content/menu.ts`

Each drink looks like this:

```ts
{
  id: "matcha-mango",          // unique, lowercase, no spaces
  color: "#D69A3F",            // the drink's natural color (swatch + hover)
  name: "Matcha Mango",        // shown as written (Spanish names everywhere)
  price: "6,00 €",
  signature: true,             // true = appears on the home page (max 4)
  origin: "Uji, Kioto",        // optional
  description: {
    es: "Mango batido, leche de coco.",
    en: "Blended mango, coconut milk.",
  },
},
```

- To ADD a drink: copy a block, change every field, place it inside the right
  category (`El matcha`, `Con burbujas`, `Con fruta`, `Sin matcha`).
- To ADD a category: copy a whole category block; the menu page renders it
  automatically with its own anchor.
- Keep descriptions one line, sober, no exclamation marks (see the brand law
  in `.claude/skills/maisha-brand/SKILL.md`).

## 2. The recipe builder — `content/recipe.ts`

Four option lists. Every option the team adds appears in `/crea` instantly,
with pricing, ratio and QR handled automatically.

```ts
// intensity: grams drive the ratio; surchargeCents drives the price
{ id: "intenso", code: "INT", grams: 3, surchargeCents: 100,
  label: { es: "Intenso", en: "Intense" },
  note:  { es: "Denso, para detenerse", en: "Dense, made to pause over" } },

// base: ml drives the ratio; hue tints the blended drink color
{ id: "tonica", code: "TON", ml: 200, surchargeCents: 100, hue: "#DCE0C8",
  label: { es: "Tónica", en: "Tonic" } },

// fruit: hue tints the color; surcharge adds to price
{ id: "yuzu", code: "YUZ", surchargeCents: 100, hue: "#C0B056",
  label: { es: "Yuzu", en: "Yuzu" } },
```

- `RECIPE_BASE_PRICE_CENTS` (top of file) is the starting price: 400 = 4,00 €.
- Prices are in CENTS (150 = 1,50 €). The ratio label ("2 g : 200 ml · 1:100")
  computes itself from grams and ml.
- `code` builds the counter code (CLA·TON·YUZ·F) — keep 2-3 letters, unique.
- Always fill BOTH `es` and `en` labels.

## 3. What the counter needs to know

A customer's custom drink arrives as a card with a code like `INT·TON·YUZ·F`
(intensity · base · fruit · temperature) and a QR that opens the same recipe.
The price on the card is computed from this file — if prices change here,
old screenshots show old prices; the live link always shows current ones.

## Later (Phase 1)

These files are shaped to become CMS collections (Payload) with a real admin
dashboard and roles. The editing workflow changes; the data shape does not.

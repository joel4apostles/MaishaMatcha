# CONTENT.md — editing the carta and the recipe builder (for the team)

Everything customers see comes from two files. Edit them on GitHub (no code
setup needed) and the site redeploys automatically in about a minute.

> GitHub → `content/carta.ts` or `content/recipe.ts` → pencil icon (Edit) →
> make the change → "Commit changes". Vercel deploys on save.

## 1. The carta — `content/carta.ts`

The website menu, the home page preview and the counter's seed all read this
one file, so a price changed here is the same everywhere. Each item:

```ts
{
  name: "Nishio",              // shown as written
  priceCents: 740,             // the base price in cents, IVA included (7,40 €)
  color: "#748A38",            // the drink's natural color (swatch + hover)
  signature: true,             // true = on the home page (keep it to 4)
  description: {
    es: "Ceremonial tradicional. Aromático, fresco y equilibrado.",
    en: "Traditional ceremonial. Aromatic, fresh and balanced.",
  },
  groups: ["preparacion-matcha", "leche", "extras"],
},
```

- `groups` are the choices that item offers, defined once at the top of the
  file in `cartaGroups`. "Latte" is an option worth +1,40 €, so the menu
  shows "Usucha 7,40 € · Latte 8,80 €" by itself.
- Extras (purés, Coconut Cloud, Ube) live in the `extras` group and get
  their own section on the menu page.
- Prices are in CENTS (150 = 1,50 €). Always fill BOTH `es` and `en`.
- Keep descriptions short and sober, no exclamation marks (see the brand law
  in `.claude/skills/maisha-brand/SKILL.md`).
- Once the admin is live, the counter's copy of the carta is edited at
  /admin (Carta, Opciones). This file then only seeds new installs.

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

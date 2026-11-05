# CONTENT.md — editing the carta and the recipe builder (for the team)

Everything customers see on the menu and in the builder comes from one file. Edit them on GitHub (no code
setup needed) and the site redeploys automatically in about a minute.

> GitHub → `content/carta.ts` → pencil icon (Edit) →
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

## 2. The recipe builder — reads the carta

`/crea` builds from `content/carta.ts` too: every item with a preparation
choice (the matchas and the teas), the `leche` group for lattes and the
`extras` group. Add a milk or an extra there and it appears in the
builder, the menu and the counter at once, with the same price. Each option
can carry a three-letter `code` (shown at the counter, e.g. NIS·LAT·AVE)
and a `hue` (tints the drink photo).

## 3. What the counter needs to know

A customer's custom drink arrives as a card with a code like `INT·TON·YUZ·F`
(intensity · base · fruit · temperature) and a QR that opens the same recipe.
The price on the card is computed from this file — if prices change here,
old screenshots show old prices; the live link always shows current ones.

## Later (Phase 1)

These files are shaped to become CMS collections (Payload) with a real admin
dashboard and roles. The editing workflow changes; the data shape does not.

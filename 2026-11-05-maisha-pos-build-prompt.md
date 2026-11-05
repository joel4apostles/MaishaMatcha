# Build prompt: Maisha Matcha end-to-end platform (website + admin + POS)

You are a senior full-stack engineer and product designer. You will extend an existing, half-built website for **Maisha Matcha**, a specialty matcha bar in Murcia, Spain (Pl. Cetina 3), into one end-to-end system: a premium customer website with online ordering, and a premium admin with a point of sale (POS), staff accounts, inventory and supplier ordering.

## 0. Before writing any code
1. Read the whole existing repository. Report the stack (framework, styling, database, auth, hosting), what already works, what is half built, and anything broken.
2. Reuse the existing stack unless it cannot support the requirements below. If you would change something, say why and wait for approval.
3. Ask me your open questions in ONE list (payment provider, card terminal, languages, suppliers, opening hours, tax setup). Do not guess business facts.
4. Propose a phased plan (section 9) with a data model diagram. Wait for my approval before Phase 1.

## 1. Users and roles
- **Owner**: everything, including money, staff, suppliers, settings.
- **Manager**: menu, inventory, purchase orders, reports; no payouts or owner settings.
- **Barista**: POS only (take orders, take payment, refunds up to a limit set by the owner, open/close shift). Quick login with a 4 to 6 digit PIN on the shared counter tablet, under a device the owner has signed in once.
- **Customer**: website ordering, optional account (order history, saved recipes, favourites).
- Owner creates and deactivates staff accounts. Every sensitive action (refund, discount, void, stock adjustment, price change) is logged with who, when and why.

## 2. POS (counter, tablet-first)
- Fast order screen: categories, items, modifiers (milk type, sweetness, ice, size, extra shot of matcha, toppings), notes, quantity. Common orders in 2 taps.
- Payments: card through a card terminal integration (use the provider I confirm, for example Stripe Terminal or SumUp; never handle raw card data), cash with change calculation, split payment. Refunds and voids with reason.
- Receipts: printed (ESC/POS receipt printer), emailed or QR. Spanish simplified invoice (factura simplificada) with correct IVA per line, and a full invoice on request with the customer's tax details.
- Spain compliance: invoicing software in Spain must follow the anti-fraud rules (Ley 11/2021, Real Decreto 1007/2023, VERI*FACTU). Check the current official deadlines and requirements, design records to be compliant (chained hashes, no silent deletion, QR on invoices), and tell me exactly what is needed. Do not claim compliance you have not implemented.
- Shifts: open with cash float, close with counted cash vs expected, Z report.
- Offline: the POS keeps working without internet (queue orders and cash sales locally, sync when back, card payments only when the terminal is online), and shows clearly that it is offline.
- **Receipt scanning**: (a) scan a SUPPLIER invoice or delivery note with the camera, extract lines (product, quantity, unit cost) with OCR, let a person confirm, then add the stock; (b) scan a PAPER sales ticket (for example from a day the POS was down) to back-enter the sale after confirmation. Never save scanned data without a human confirm step.

## 3. Menu, recipes and inventory
- Menu items with photos, descriptions, allergens (EU 1169/2011: the 14 allergens shown on website and POS), prices per channel (counter, online), availability toggles (sold out).
- **Recipes (bill of materials)**: each item and modifier uses ingredients in grams or ml (for example 2 g ceremonial matcha, 180 ml oat milk, 12 ml syrup, cup + lid). Every sale deducts stock automatically, including modifiers and waste.
- Ingredients: unit, cost, supplier, par level, reorder point, reorder quantity, shelf life and batch/expiry for perishables.
- Stock counts (full and spot), waste logging with reasons, stock value, cost per drink and margin per item.
- Alerts: low stock, expiring soon, item margin below a target.

## 4. Suppliers and purchase orders
- Supplier directory (contact, email, lead time, minimum order, catalogue with prices).
- When an ingredient reaches its reorder point, create a DRAFT purchase order grouped by supplier, with suggested quantities from par levels and recent usage.
- Default: the owner or manager approves with one tap, then the system emails the supplier a clean PDF purchase order and logs it. Optional per-supplier "auto-send" setting, off by default.
- Receiving: mark delivered (fully or partly), or scan the delivery note (section 2) to receive stock. Track supplier price changes.

## 5. Customer website (online ordering + pre-order)
- Order now for pickup, and pre-order for a chosen time slot (slot capacity set by the owner, lead time, cut-off, closed days from opening hours). Optional table ordering by QR on each table.
- Checkout with online card payment (and Apple Pay / Google Pay through the provider), order confirmation email, live status (received, preparing, ready), "ready" notification.
- Orders arrive in the admin and on a **kitchen display (KDS)** screen at the bar with timers, in the same queue as counter orders.
- Accounts optional; guest checkout allowed. Loyalty: points or stamps if I approve it (ask; Maisha already uses a digital stamp card on CafeRadar, so propose integration instead of duplicating).
- Languages: Spanish first, English second (ask about more). SEO basics, structured data for the business and menu, fast on mobile.

## 6. "Matcha comes alive" (signature website experience)
- When a customer builds a drink, show it being made in real time: a stylised glass that fills in layers (ice, milk, whisked matcha pouring and blending, foam, syrup, toppings), reacting to every choice (milk type changes colour, sweetness, iced vs hot with steam or condensation, size changes the glass).
- Smooth, physical-feeling motion (GPU-friendly, 60 fps on mid-range phones). Use SVG/Canvas/WebGL (for example a light Three.js or Lottie/Rive scene) and lazy-load it so the page stays fast. Respect "reduce motion" with a calm static version.
- The recipe the customer builds is the actual order (same modifiers as the POS), can be saved and named, and can be shared as an image card.
- Show a mock first (static frames + one short motion prototype) for my approval before building.

## 7. Premium design (website and admin)
- One design system for both: tokens for colour, type, spacing, radius, shadow, motion; light and dark. Maisha Matcha's own brand (ask me for logo, colours, fonts; do not invent a brand).
- Website: editorial, calm, high-end hospitality feel; generous whitespace, real photography, refined typography, subtle motion.
- Admin and POS: fast and legible first. Big touch targets on the POS, clear states (paid, pending, refunded, offline), no clutter. Every error says what happened and what to do.
- Accessibility WCAG 2.2 AA, keyboard support in admin, works from 320 px wide to desktop.
- Deliver design mocks for the key screens (home, menu, drink builder, checkout, POS order screen, KDS, inventory, purchase order) for approval before building each phase.

## 8. Reports and owner dashboard
- Today at a glance: sales, orders, average ticket, top items, channel split, staff on shift.
- Sales by hour/day/item/category/staff/channel; cost of goods and gross margin; waste; stock value; supplier spend.
- Exports (CSV/Excel) for the accountant; IVA summary per period.

## 9. Phases (propose dates for each)
1. **Foundations**: audit, data model, auth + roles, staff PIN login, design system, menu + allergens.
2. **POS**: counter orders, cash + card, receipts, shifts, offline queue, KDS.
3. **Inventory**: recipes, auto-deduction, counts, waste, alerts, margin.
4. **Suppliers**: draft purchase orders, approval, PDF email, receiving, invoice scanning.
5. **Website ordering**: pickup + pre-order slots, online payment, status notifications.
6. **Drink builder ("matcha comes alive")** after mock approval.
7. **Reports, compliance hardening, launch** (staff training notes, backup and restore test).

## 10. Engineering rules
- Security: role checks on the SERVER for every action (never trust the client), row-level access where the database supports it, secrets only on the server, rate limits on login and checkout, audit log. Payments only through the provider's hosted or SDK flows.
- Privacy (GDPR): collect only what is needed, privacy policy and cookie consent, customer data export/delete, staff data separate from customer data.
- Money is stored as integer cents with currency; tax rates are configuration, not hardcoded.
- Never delete financial records; corrections are new records (credit notes, adjustments).
- Tests for: price and tax calculation, stock deduction, offline sync (no duplicate orders), refunds, role permissions, purchase order generation.
- Small, reviewable commits with clear messages; a short README per module; a runbook for the owner (daily open/close, end of month).
- After each phase: a demo, the list of what changed, and a short real-device test checklist (tablet + phone) for me to run.

Start with section 0 only, and stop for my answers.

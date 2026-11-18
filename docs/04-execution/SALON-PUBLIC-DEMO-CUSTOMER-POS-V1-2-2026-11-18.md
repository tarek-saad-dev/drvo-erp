# DRVO Salon public demo POS V1.2 — visible Cashier-like Customer journey
**Date:** 2026-11-18. **Scope:** public `/demo/salon` synthetic UI, not private Cashier migration.
**Delivery state:** source committed, exact CI and staging HTTPS evidence are separate.

## Visible controls shipped in source
- Customer search by **name or synthetic mobile** in POS, including Arabic numerals; select matched Customer; duplicate detection.
- No-match **Register this customer** opens a prefilled quick registration modal; create name + 11-digit test number, immediately select within POS and reuse same session Customer in Booking; public sandbox only.
- Customers `عمر`, `علي` and `محمود` have explicit **sample nonpaid visit fixture**. Last in-session DRAFT takes precedence; operator clicks **Apply last visit** to fill item IDs+qty and barber, always checking current synthetic Catalog/stock and never replaying old prices, discounts or payment. Existing cart requires explicit replacement confirmation.
- Last-visit records are distinctly labeled sample/in-session DRAFT; not real invoices. Normal save remains DRAFT / NOT_COLLECTED, no stock/GL effects; refresh/reset erases added Customers and DRAFTs.
- Compact RTL Light UI with responsive layout; no browser zoom or guided tour.

## Ownership & safety
`demo-model.ts` pure session model; `salon-pos-customer-flow.tsx` customer UX; `salon-pos-workspace.tsx` cart reuse; `salon-demo-client.tsx` session state; `salon-pos-workspace.css` Light responsive layout. No API/SQL, K5/private flags, storage, real Customers, invoices, tax, payment, marketing consent or primary DB migration. **Do not count this as production Cashier parity.**

## Tests / acceptance
`apps/web/test/salon-demo.test.cjs` checks search, Arabic digits, quick customer validation/dedup, booking+POS selection, explicit sample/DRAFT re-use, immutability and no external API/network/storage. CI must run Next.js build/typecheck, route public 200 and private routes 404; stage deployment and independent HTTPS attestation must use exact commit/release.

After verified staging rollout: [open live demo](https://erp-stage.drvotech.com/demo/salon), select POS, search **01000000001** and pick عمر, click apply visit and see two services plus مصطفى; search **01000000005** and create, selected customer and Booking dropdown update; save DRAFT then repeat same customer’s last DRAFT; reload to ensure reset.

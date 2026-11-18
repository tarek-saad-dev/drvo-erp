# DRVO Salon public demo POS V1.2 — visible Cashier-like Customer journey
**Date:** 2026-11-18. **Scope:** public `/demo/salon` synthetic UI, not private Cashier migration.
**Delivery state:** SOURCE CI PASS, STAGING DEPLOY SUCCESS, EXTERNAL HTTPS REVISION PASS. No authenticated browser acceptance or primary DB write.

## Visible controls shipped in source
- Customer search by **name or synthetic mobile** in POS, including Arabic numerals; select matched Customer; duplicate detection.
- No-match **Register this customer** opens a prefilled quick registration modal; create name + 11-digit test number, immediately select within POS and reuse same session Customer in Booking; public sandbox only.
- Customers `عمر`, `علي` and `محمود` have explicit **sample nonpaid visit fixture**. Last in-session DRAFT takes precedence; operator clicks **Apply last visit** to fill item IDs+qty and barber, always checking current synthetic Catalog/stock and never replaying old prices, discounts or payment. Existing cart requires explicit replacement confirmation.
- Last-visit records are distinctly labeled sample/in-session DRAFT; not real invoices. Normal save remains DRAFT / NOT_COLLECTED, no stock/GL effects; refresh/reset erases added Customers and DRAFTs.
- Compact RTL Light UI with responsive layout; no browser zoom or guided tour.

## Ownership & safety
`demo-model.ts` pure session model; `salon-pos-customer-flow.tsx` customer UX; `salon-pos-workspace.tsx` cart reuse; `salon-demo-client.tsx` session state; `salon-pos-workspace.css` Light responsive layout. No API/SQL, K5/private flags, storage, real Customers, invoices, tax, payment, marketing consent or primary DB migration. **Do not count this as production Cashier parity.**

**VERIFIED 2026-11-18 (exact deployed application SHA `7095d8de647924e8377d2e42dfce332ae6c5b812`):** [Interactive Salon Demo CI #44327848014](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44327848014) **PASS**: 16/16 Salon model/UI tests; additional 4/4 Light UI and 7/7 private Salon tests; Next.js build/typecheck, public /demo/salon 200 and private K5 404. [Staging Deploy #44327847934](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44327847934) **SUCCESS** with receiver confirming the exact SHA. [External independent HTTPS marker smoke #44328217272](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44328217272) **PASS**, confirming `data-demo-revision="salon-pos-customer-v1-2"` visible at `https://erp-stage.drvotech.com/demo/salon`. Previous smoke #44328099520 failed because it expected the obsolete V1.1 marker; workflow corrected by commit `39c6646`. External evidence checks HTML marker, NOT browser-click interaction, exact VPS `release.sha` attestation, private SQL, or full Cashier POS.

## Tests / acceptance
`apps/web/test/salon-demo.test.cjs` checks search, Arabic digits, quick customer validation/dedup, booking+POS selection, explicit sample/DRAFT re-use, immutability and no external API/network/storage. CI must run Next.js build/typecheck, route public 200 and private routes 404; stage deployment and independent HTTPS attestation must use exact commit/release.

After verified staging rollout: [open live demo](https://erp-stage.drvotech.com/demo/salon), select POS, search **01000000001** and pick عمر, click apply visit and see two services plus مصطفى; search **01000000005** and create, selected customer and Booking dropdown update; save DRAFT then repeat same customer’s last DRAFT; reload to ensure reset.

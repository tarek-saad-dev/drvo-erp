# Cashier POS UX review → DRVO Light demo compact UX and controlled capability lift

**Date:** 2026-11-17  
**Owner request:** screenshot of DRVO Salon Demo: remove `GUIDED TOUR · SYNTHETIC DATA` block, increase viewport information density (elements visually overscaled) and review what Cashier's real POS does that DRVO lacks.  
**Status:** coded on `main`; [final source SHA `5703db68e` CI PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44134433270): 12/12 Salon demo tests, 4/4 Light/brand tests, 7/7 private Salon tests, Next production build/typecheck, public 200 and private K5 404. [Staging code deployment at UI SHA `542d1d4d6` SUCCESS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44134344251) and [independent external HTTPS feature marker/no-tour smoke PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44134584953). Final `5703db68e` stage artifact may be newer than independently checked UI code; this does not attest authenticated operator/SQL or exact VPS release.sha. **No real financial operation activated or primary SQL migrated.**

## Pinned, actually inspected Cashier source

Baseline `tarek-saad-dev/casher@a51101791c52bca90e45bd40ead3a46c08d78adb`:

- `src/app/income/pos/page.tsx` (1,421 lines at pin): Cashier POS composes `useSaleState`, `useSession`, `useShiftOperationalGate`, `useDayRollover`, customer lookup/history, barber carousel, service catalog, salon packages, branch retail product catalog, invoice/cart panel, payment methods and allocations, split payment, discounts, edit sale, recent invoices, printer, vouchers, tips and barber/add-on handoff views. It provides `F9` and keyboard shortcuts and distinct responsive mobile POS panels.
- `src/components/pos/PosInvoicePanel.tsx`: `CartPanel`, `InvoiceSummary`, `PaymentMethodSelect`, `SplitPaymentInput` and save actions. Customer/barber item associations and discount/allocations are sale state, not merely decoration.
- `src/components/pos/QuickActionsBar.tsx`: payment-method transfer, quick expense/income, tips, recent invoices, quick WhatsApp.
- `src/components/pos/luxury/ServiceCatalog.tsx`: category/search and selected-barber-gated service assignment (`/` search focus).
- `src/app/api/sales/route.ts` and other POS routes exist in legacy code, but **legacy features are reference behavior, NOT automatically approved DRVO financial/security/tenancy implementations**. Audit advanced APIs individually before porting.

## Founder UI feedback implemented for public synthetic Salon Demo

**No tour or fake onboarding:** removed Guided Tour component, `startTour` state/step automation, button, progress, dead base and Light CSS; retain one compact amber warning that the page is **synthetic, in-memory, without accounts, bookings or money**, and retain ability to use Booking→POS directly. Global reset remains in footer.

**Compact workspace, no browser zoom hack:** new `salon-pos-workspace.css` overrides light dashboard density on desktop: 260→222 px sidebar, 76→57 px top bar, tighter internal padding/gaps, dashboard stat min-height 159→114 px, heading clamp max 39→30 px, panel header and service tile density; preserve readable RTL and responsive breakpoints at 1240/950/620 px. No `transform:scale`, global `zoom`, forced viewport or loss of semantic labeling.

**Cashier-inspired functional synthetic POS:** new `salon-pos-workspace.tsx` with branch demo customer and barber selection, searchable service/package/retail catalog and type filters, bounded sample product stocks, safe integer-minor money cart, +/- quantities and per-item remove, fixed/percentage header discount preview, single or cash+electronic **NOT_COLLECTED** split preview, draft notes, `F9` save DRAFT, `/` search focus, and read-only expand of draft history. New domain helpers `demoPosItem`, `changeDemoCartQuantity`, `demoDraftTotals`, `demoSplitPreview` and improved `saveDemoDraft(options)`; all use in-memory state and reset on page reload. No SQL/API, paid claim, cash movement, inventory decrement, ledger, receipts or actual posted sale.

## Actual Cashier POS parity matrix — honesty about gaps

| Cashier operator capability | DRVO public synthetic demo 2026-11-17 | Real protected DRVO capability |
|---|---|---|
| Full-width compact cashier workstation, RTL sidebar/mobile | Denser Light first pass; no founder browser signoff yet | Existing private POS preview needs shared Cashier UX parity |
| Select actual customer and purchase history / quick new client | Synthetic customer select only | Customer master exists partial; POS customer history & creation not complete |
| Choose Barber and capture service executor | Synthetic Barber select only | HR↔Salon Barber resource partial, executor-at-sale evidence not complete |
| Search categories, services, Salon packages, branch retail products | Functional synthetic search/filter and sample products | Catalog service partial; true packages/product-stock POS integration open |
| Fast cart quantity +/- & removal, item-level assignment | Synthetic validated +/- and removal | POS saved DRAFT partial; complete item-level executor/price override open |
| Invoice discounts %, fixed, line-level / tax policies | Synthetic **header** fixed/percent preview only | Real fixed header discount preview partial; line %, tax and approved receipt open |
| Cash + electronic payment split and tender attribution | **NOT_COLLECTED** visual split preview only | Real Treasury collection/verified provider, split tender and GL gated ADR-031 |
| Save/edit/reload sale, refunds/returns, recent invoices | Save local DRAFT and view same-page history only | Real POS DRAFT persisted CI partial; posted/edit/refund/invoice not approved |
| Physical stock check/deduction | Synthetic per-product stock max guard only, no decrement | Inventory/stock movements not complete |
| Quick expense/income/payment transfer and tips | Not exposed as fake operational controls | Expenses DRAFT and Treasury count partial, no money moves; HR tips pending |
| Barber handoff/addon inbox, packages hydration | Booking→demo cart direct handoff only | Booking→POS DRAFT partial; handoff and add-ons pending |
| Print/reprint/receipts, vouchers, WhatsApp | Not implemented in demo | No authorized real invoice/receipt, vouchers/communications |
| Day/Shift permissions, reconciliation, role/branch negatives | Demo deliberately disconnected | Operations trusted readiness pure rule; persisted BusinessDay/Shift and actual finance gates pending |

**Decision:** User approved increasing density and removing tutorial, **not** activating payments or pretending these synthetic controls are Cashier full parity. Cashier's raw `dbo` schemas, numeric IDs, session/pool adapters and role shortcuts must never be copied into DRVO. Per ADR-040 each real feature belongs to shared Catalog, POS, Booking, HR, Treasury or Accounting owners; Salon adds only barber-specific scheduling/eligibility/handoff logic.

## Proof and acceptance

- [Latest source Web CI](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44134433270) PASS on `5703db68e`: 12 Salon demo, 4 Light brand, 7 private Salon tests, Next Build/Typecheck; external public marker check [PASS](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44134584953) following [successful deploy of UI code SHA `542d1d4d6`](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44134344251). Final deploy SHA and manual browser/mobile layout still separately unverified.
- Public target (verify exact newest deploy): [DRVO Salon Demo](https://erp-stage.drvotech.com/demo/salon). Check at desktop viewport 1696×863: no tour, dashboard summary and two panel headers visible without unnecessary scrolling; POS search/filter, +/- stock guards, discount, split, F9 and draft history operate. Confirm touch/mobile at <=950 and <=620 px. No hidden click affordances for unavailable real features.
- **Actual DB/production UI:** None of these demo changes test protected POS persistence, SQL schema, K5 flags or customer/pilot acceptance. Do not label paid/posted or complete Cashier POS.

## Next implementation priority for real DRVO POS

1. Integrate **real Catalog products and Barber attribution** into protected POS DRAFT UI/API with K5 scope and trusted price snapshot. Implement item discount and exact totals as nonposting document fields; test with SQL2022+browser rather than copying synthetic fixtures.
2. Add Booking→POS multi-line service package handoff, customer lookup/history, quick client create, and the responsive Cashier-like operator workspace. Keep Salon additions an Extension.
3. Add payment method, split tender, tip distribution and posted lifecycle **only after ADR-031 Finance/Founder signoff**, Treasury movements and Accounting source-of-truth design, Day/Shift controls, idempotent reversal, audited reconciliation and primary DB restore evidence.
4. Add printing/reprinting, cash drawer, vouchers, quick income/expenses, WhatsApp only when associated owner contracts and permissions can be exercised in authenticated UI/SQL.


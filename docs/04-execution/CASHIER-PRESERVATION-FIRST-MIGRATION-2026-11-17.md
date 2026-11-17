# Cashier → DRVO ERP: PRESERVATION-FIRST full functional migration (2026-11-17)

**Founder correction:** The DRVO ERP goal is **preserve all mature functioning Cashier capabilities and build on top**, not copy a simplified sample UI, rebuild functions from memory, or count incomplete synthetic modules toward parity. This is the operating contract for continuing ADR-040, not a claim of completed migration.

## Latest actual source lock

- **Cashier source:** `tarek-saad-dev/casher@bc9c03fff86074872590ad0fd3525f9a4e416958` (live `main` inspected 2026-11-17). Previous 2026-11-15 ADR-040 pin `a51101791c52bca90e45bd40ead3a46c08d78adb` is **historical**, NOT the current full baseline. The latest commit adds WhatsApp promotional-offer consent evidence and demonstrates why a one-time static route list is insufficient.
- [**Entire original Cashier source tree, all 4,291 Git blobs including SQL/migrations/fixtures/CI/docs/UI/media**](../../tools/cashier-reuse/cashier-all-source-blobs-2026-11-17.json). The manifest freezes original file path, immutable Git blob hash, and byte size from the complete untruncated Git tree. **No file is silently omitted** from this source baseline.
- [**2,168 runtime TypeScript / TSX files with source blob and proposed module owner**](../../tools/cashier-reuse/cashier-source-baseline-2026-11-17.json). Includes **496 API route files**, **128 page routes**, **64 application module implementation files**, **297 domain module files**, **346 UI component files**, **669 library files**, **12 hooks**, and additional source. Owner names are **AUTO-CANDIDATES only, not manually validated architecture decisions**; 288 require explicit cross-module review.
- [Root K0 source-ledger integrity tests](../../tests/cashier-source-baseline.test.cjs) enforce count, unique paths, exact blob provenance, coverage of SQL and high-risk user flows, all source-candidates UNVERIFIED until a capability/behavior-level acceptance link exists. A file count **is not a feature count**.
- Every next Cashier change must be handled by source-diff detection before each corresponding parity release; no unapproved migration from legacy `dbo`, sessions or numeric IDs.

## Why partial screen-copy work missed requirements

Cashier **already has** modular app boundaries in `src/apps/{pos,booking,treasury}` with `application`, `internal`, `public`, port composition and characterization tests, alongside the mature legacy POS UI. DRVO must reuse/adapt these boundaries and *their observable functional rules*, not derive reduced models solely from new Light UI cards.

E.g. Cashier `src/app/income/pos/page.tsx` is a 1,421-line orchestration page with real customer lookup/history, Barber, stock items, packages/addons, discount, split tender, invoice create/edit/delete, QuickActions, tips, recent invoices, print, Booking handoff, operational Day/Shift gates. The public DRVO synthetic demo and current private nonposting POS DRAFT **are not equivalent**. Cashier's own `src/apps/pos/__tests__/saleMutation.characterization.test.ts` checks original SQL mutation behavior including stock and Treasury side effects; DRVO must produce independent equivalent behavior/reversal tests only after proper owner boundaries and ADR-031 approval.

## One source rule genuinely ported this batch

**Latest exact Cashier source:** `src/lib/sales/service-line-totals.ts` blob `13942cef1852003af388a086f45c324ff1ae4d17` [verbatim preserved in DRVO test fixture](../../tests/fixtures/cashier/service-line-totals-2026-11-17.ts).

**New shared POS rule in protected Nest POS module (NOT synthetic demo):**
- `apps/api/src/pos-preview/cashier-invoice-pricing.ts` adapts Cashier's canonical service line price × quantity, **per-line explicit amount precedence over percentage**, sum of net lines, **header discount after per-line discounts**, explicit header amount precedence, discount clamping, total quantity/bonus and zero-net semantics. DRVO uses **safe integer minor units** and 0.01% basis points, validates 1–20 whole qty and money bounds, preventing invalid browser claims. Cashier permissive negative/NaN coercion is deliberately **not copied**.
- `apps/api/src/pos-preview/pos-preview.service.ts` provides `computeCashierQuotePreview` reading **current permitted Catalog offering prices**, branch scope from existing K5 actor/session/SQL `catalog.read` path and refusing foreign/inactive offerings, mixed currency, duplicate offerings and injected prices/employee fields. `POST /api/workspaces/{businessId}/branches/{branchId}/pos-preview/cashier-invoice-quote` has existing default-disabled K5 and POS preview feature gates, exact HTTPS Origin and no store. **No SQL migrations or posted Financial writes**.
- `apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/cashier-pricing-panel.tsx` adds actual **authenticated private POS operator controls**: per-line fixed or % discount and header fixed or % discount; reads server-calculated Gross, Line Discount, Header Discount and Grand Total; re-mounts on cart change to prevent stale results. It **does not save discounts to DRAFT** or enable paid invoices.
- `apps/api/test/cashier-invoice-pricing.test.cjs` loads and **executes original Cashier source** from the exact pinned Git blob inside a constrained VM, then compares the actual canonical Cashier totals with the DRVO integer-minor port. This test found a *real difference* in Cashier's zero-net header short-circuit; the DRVO port was corrected in `a9a8c76dec7411e41a411ff0d0456f97fd05e835`. Unlike a manually written spec, this is source-characterized parity.
- `apps/api/test/cashier-invoice-quote.test.cjs`, `apps/web/test/cashier-pricing-ui.test.cjs` and K5C ensure no forged Catalog prices, foreign Tenant/Branch, mixed currency, payment, stock or tax claims. Full API/Next CI and stage deploy must be reported **per exact code SHA**, not inferred from successful commits.

**Explicit remaining limitation:** This is one *real* source rule transfer; it is NOT even full Cashier POS parity. Saving per-line discounts to a DRVO approved immutable document, client/barber execution, booking package lines, Tax/Receipt policy, payment split, returns, inventory movement, loyalty, quick expense, and Treasury/Accounting impacts remain open.

## Full functional preservation policy and acceptance

Per existing [ADR-040](../05-decisions/ADR-040-CASHIER-FULL-FUNCTIONAL-PARITY-MODULAR-ERP.md) / [inventory V0](CASHIER-FULL-FUNCTIONAL-PARITY-MATRIX-V0-2026-11-15.md), carry **all** functional families (not just POS):
1. **Shared HR** (employee, Branch transfer, attendance, shifts, leave, payroll agreement, earnings, advances, commissions, bonuses, tips, employee portal), with Salon Barber skills, targets, service/employee rates as an Extension.
2. **Catalog + Products/Packages** (status, prices, categories, durations, eligibility, salon packages/addons).
3. **POS/Sales** (complete cart and price policy, customer history, executor/line assignment, discounts, tax, split tender, vouchers, sale lifecycle, return/reversal, receipts/printing, recent invoices, QuickActions and all upstream/downstream side effects).
4. **Booking + Queue** (public/staff calendar, employee schedule, duration/overlap, holds, reschedule, no-show, walk-ins, groom packages, booking-to-POS handoff).
5. **BusinessDay/Shift/Operations** (dates/timezones, carryover, opening/closing, cash custody, employee handovers, day shift events).
6. **Treasury** (cash and payment methods, movements, transfers, approvals, opening balances, shift/day reconciliation and reversals).
7. **Expenses, Other Income, Budgets** (reasons/approval, category, recurring/distributed documents, Treasury payment and Accounting recognition as distinct owners).
8. **Accounting** (journal/GL, cost/revenue/profit recognition, references and true reversal), **gated by ADR-031**.
9. **Inventory/Purchasing** (product stock/valuation, supplier, purchase receipts, transfers, salon recipe consumption and returns).
10. **Customers/CRM/Loyalty** (lookup/profile/history, points, memberships, consent, WhatsApp offers opt-in and revocation).
11. **Reports/Analytics** (cashier day, branch/month, attendance/payroll, staff, booking, POS, gross/net, stock and finance reports with real source-backed filters).
12. **Messaging/Integrations** (WhatsApp, consent, templates, campaigns, retries, outbox, notifications, staff-facing integrations).
13. **Platform/K5 Business/Branch** (access permissions, audit, release activation; **do not transplant Cashier legacy auth or DB**, retain DRVO architecture).

For **each audited workflow**, record these mandatory fields before closing:
`source files + Git blob`, `old UI flow + role/branch precondition`, `all edge/error/reversal cases`, `data read/write ownership`, `DRVO shared module or Salon extension`, `expected equivalent UI + API + SQL`, `difference classification USE/ADAPT/REBUILD/DEFER/REJECT with founder reason`, `source-characterization fixture`, `actual DRVO integration/negative tests`, `authenticated staging URL + exact release SHA`, `primary DB backup/restore + migration evidence`, `operator acceptance`.
**A module is NOT marked PARITY-VERIFIED while any essential capability lacks its audited equivalent.** A source file being catalogued does not certify its feature was implemented or that legacy functionality is safe to copy.

## Work execution order (NOT a new product-discovery cycle)

**Slice A — actual private POS:** move Cashier sale state/pricing/line discounts, Customer+Barber selection and branch-stock Catalog into real, K5-scoped POS DRAFT with source-owned price snapshots and cross-owner read APIs. Keep Bakery/Clinic/Hotel POS reusable as separate Catalog/HR/Inventory owners; Salon execution attribution is Extension.

**Slice B — full Booking↔POS:** group packages/addons (including exclusivity and service eligibility), booking order identity, no duplicate charge, true customer history, legacy reversal vectors, no fake payment on DRAFT.

**Slice C — Operations + Treasury + HR:** persistent BusinessDay and Shift, cash custody with approvals, employee attendance and payroll agreements, expense/income reasons; READ/DRAFT and negatives first; financial posting boundary only after ADR-031.

**Slice D — financial and side effects:** sale create/update/delete/refund with receipt, payment methods/split clearing, Treasury posting and GL, inventory decrement/reversal, loyalty and performance projections under independent approved contracts, SQL Server atomicity/idempotency and full source regression. Not approved to deploy as paid yet.

**Parallel work streams:** inventory/diff review, original pure-rule characterization, Light UX shell, per-module isolated API+SQL CI can run in parallel; migrations and money-moving cross-module commands cannot bypass backup/ADR-031 gates.

**Deployment truth at this document:** public `https://erp-stage.drvotech.com/demo/salon` continues to be synthetic and already tested on its own code SHA, *not* proof of the private POS upgrade. `https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/pos-preview` is a future **authorized K5** hands-on target, with private flags and real DB gates still OFF/unverified; no customer/pilot production GO.


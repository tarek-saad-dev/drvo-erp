# Cashier POS S3 — scoped customer draft history and safe new-cart reuse

**Date:** 2026-11-17. **Status:** SOURCE/CI VERIFIED (disposable SQL + Web), private primary-DB rollout/Owner browser still UNVERIFIED.

## Purpose and source
Cashier POS original `tarek-saad-dev/casher` includes customer lookup/history and recent invoice actions (see existing pinned source audit `CASHIER-POS-UX-DENSITY-AND-FUNCTION-PARITY-REVIEW-2026-11-17.md`). DRVO cannot truthfully expose paid customer history while posted Sales and ADR-031 remain unapproved. This slice exposes **only actual saved Cashier POS V2 nonposting draft snapshots** via existing `core.ReadBranchPosCashierDrafts` SQL022–023 (read scope, live K5 authorization). This is **not** complete Cashier customer purchase history, customer-level all-branch history or full cashier parity.

## Scope implemented in source
- New private Light `cashier-draft-history.tsx`, visible even if the cart is empty when the existing private POS V2 flags are enabled.
- Loads independently authorized `/customers`, `/hr/employees`, `/pos-drafts/cashier` from the selected Business/Branch; failure fails closed and clears data. No synthetic fixtures or customer phone numbers.
- Filters the bounded last **50** SQL-backed V2 draft records by Customer, unlinked drafts or all; displays actual server-persisted discounts/totals and per-line employee assignment, with explicitly labeled `DRAFT / NOT_COLLECTED / NOT_POSTED`. UI warns when results are truncated. No claim of paid purchase history.
- `Use as new cart` copies **only offering IDs and quantities**. Existing POS parent verifies current Catalog active offerings and 1..20 quantities/uniqueness, invalidates quotes, resets client idempotency key, and forces a fresh Cashier pricing component. **Historical customer, executor, discounts and persisted prices are never silently applied.** Original draft remains immutable.
- A successfully saved V2 draft triggers history reload. Existing older V1 saved drafts remain unchanged.

## Architecture / risk
Read-only view joins already separately authorized module owner read models in private client. POS is the only draft data owner; Customers and HR are still independent. **No new SQL migration, Nest API route, financial posting, payment, stock change, or public demo.** Existing K5 and V2 flags stay default OFF; original SQL permissions are unchanged. The data remains Branch scoped, not a Customer-wide history service; if a full Customer CRM purchase timeline is required, design a separately authorized Sales source after actual posting exists.

**2026-11-17 verified source CI:** Exact application/workflow SHA [`01f74a585f6eaad3d00ebf2f7794963212d1dea4`](https://github.com/tarek-saad-dev/drvo-erp/commit/01f74a585f6eaad3d00ebf2f7794963212d1dea4), [Cashier POS Rich SQL2022/Nest/Next run #44177702424](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44177702424) **PASS**: 11/11 disposable SQL2022/Nest HTTP integration groups (full SQL001–023), 110/110 API unit tests, **15/15 private Web source tests** (4 POS Draft V2, 4 new Customer history, 3 Cashier pricing, 4 quick-cart), Next.js build and typecheck. [K5C private default-deny run #44177589913](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/44177589913) **PASS** on earlier `b0dcc2d` app code; later workflow-only changes do not affect the private UI behavior. **This is NOT evidence of primary DRVO database migration, independently verified release.sha, authorized private browser access or user-visible live S3.**

## Verification and rollout
- Web source regression: `apps/web/test/pos-rich-customer-draft-history.test.cjs`, existing `pos-rich-draft.test.cjs`, Next Build/typecheck and linked GitHub workflows.
- No private browser session, SQL022–023 primary DB apply, independent restore proof, flag enablement or live deployment is claimed by source commit.
- When approved primary DB/restore and flags are verified, go to `https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/pos-preview`, inspect the new Customer draft history card before adding items, filter existing SQL draft history by client, expand executor/discount lines, prepare a new cart, re-quote current Catalog pricing, confirm old draft unchanged and no paid/ledger/stock effects.
- Still OPEN: full paid customer purchase history, Barber skills/service eligibility (current generic employee executor is NOT proof), Booking/packages handoff, real posted sale/refund, and external Salon pilot gates.

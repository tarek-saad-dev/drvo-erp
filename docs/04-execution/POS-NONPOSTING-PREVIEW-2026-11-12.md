# PL-1 — scoped nonposting POS Draft + Checkout Preview

**Date:** 2026-11-12 · **Status:** GitHub feature branch/PR, not merged, not enabled, no live users. This is the first functional **read-only-cost computation** vertical slice of Shared POS, not Sales Posting. It follows [PL-0 ADR-031 gate PR #59](https://github.com/tarek-saad-dev/drvo-erp/pull/59) but does not require approval of its proposed financial strategy.

## Impact before implementation
Shared POS owns only a temporary browser draft and server preview. Existing Catalog owns price and permission; POS calls Catalog's authorized service, does not query its tables directly or write Catalog. No Accounting/Treasury/HR/Inventory/Booking/Cashier database coupling. Tenant/Business/Branch scope always derives from K5 authenticated actor and live `core.ReadCatalog`; no client-supplied money/tenant reference. Future real POS permissions and entitlement are NOT granted by informational catalog access.

## Changed code
- `apps/api/src/pos-preview/pos-preview.service.ts` + controller; AppModule registration; strict independent default-OFF API flag and POST Origin gate.
- `apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/*`: gate-default-OFF RTL form for temporary, nonpersisted cart and preview, no checkout/pay action.
- Workspace link shown only after authorized `GET /pos-preview`, plus pre-existing successful Catalog GET.
- `apps/api/test/pos-preview.test.cjs`: price recalculation and injection/Origin/default deny checks.
- `tools/catalog/verify.cjs`: expands disposable SQL 2022 real Nest HTTP suite with scoped read, cross-scope, forbidden money fields, forged Origin, SQL role and membership revocation.
- [Module contract](../03-modules/POS-PREVIEW-CORE-V0.md); synchronized Current State, Architecture, Roadmap and Changelog.

## Release/security holds
- `DRVO_POS_PREVIEW_ENABLED` / `DRVO_POS_PREVIEW_WEB_ENABLED` **not configured (OFF)** and neither K5/Catalog public flag changed.
- SQL migrations 010–013 **remain source/CI-only**, no staging/VPS SQL, secrets, user email, sales data or Cashier changes.
- No actual checkout, customer record, shift, tax, discounts, inventory reservation, payment, receipt, financial entry, durable idempotency or immutable booked invoice. A preview can become stale after catalog updates and must always be recomputed before future authorized posting.
- ADR-031 Option A/B still **PROPOSED**. ADR-032 paid activation and K5F operational security gates OPEN; RLS separately deferred.
- CI + security/code review must pass on exact PR HEAD. GitHub merge, Staging Deploy and operational activation are distinct verified actions.

## Next
PL-1b: reviewed POS-owned durable versioned Draft with explicit `pos.preview/manage` RBAC + SQL/HTTP negative tests (no POSTED), after permission and schema review. PL-2: explicit Finance/Founder ADR-031 approval and tender/GL/AR mapping. PL-3: atomic/pending first journal according to accepted policy, never before approval.

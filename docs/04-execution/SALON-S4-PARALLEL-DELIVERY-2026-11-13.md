# DRVO ERP Salon S4 — fast parallel delivery checkpoint (2026-11-13)

> **HISTORICAL S4 CHECKPOINT:** S4 source counted 001–015 correctly at creation. S5 [PR #84](https://github.com/tarek-saad-dev/drvo-erp/pull/84) subsequently adds migration 016 for explicit dated Booking resource availability. It remains **source/isolated CI only**; VPS 010–016 not authorized. [S5](SALON-S5-THREE-TRACK-DELIVERY-2026-11-13.md).


**PRs #80, #81, #82 merged to main; independent reviewed PR-head tests PASS.** GitHub [#80](https://github.com/tarek-saad-dev/drvo-erp/pull/80), [#81](https://github.com/tarek-saad-dev/drvo-erp/pull/81), [#82](https://github.com/tarek-saad-dev/drvo-erp/pull/82). Three isolated workstreams, **not** three independent industry backends.

## What exists, and its architecture ownership

1. **Shared Booking** gained forward-only migration `015_booking_appointment_lifecycle.sql`, Auth/Origin-gated `POST /booking/appointments/:bookingId/status`, strict BOOKED→CANCELLED / COMPLETED terminal transitions, immutable per-Branch status audit, UUID request idempotency, scoped Resource-row lock ordering. Cancelling a reservation releases its slot in existing SQL overlap prevention, while completing a past-started reservation **does not** create a sale, invoice, payment, HR commission or GL. A failed/unauthorized transition cannot alter status. Existing private Booking UI shows status and safe actions. **24 disposable real SQL2022/Nest HTTP checks PASS**, including 5 new lifecycle checks; all 16 triggered workflows on PR #80 passed including K0/K1/K4/K5D/SQL modules/Web. No old migrations modified; 001–014 checksums preserved.
2. **Shared POS private UX** now has fast-add active Catalog offering buttons and an explicit `prepare NEW cart from saved draft` action. Saved drafts remain immutable, current Catalog references are independently rechecked and prices are freshly computed at server save. No auto-save, financial invoice, payment, GL or posting. Dedicated Web regression and K5C, all SQL module CI, K0/K1 PASS on PR #81.
3. **Private Salon Industry Solution UI composition** new `/workspace/:businessId/:branchId/salon` route, visible only after K5 + three Module Web gates, authorized workspace branch and separate read-success for Catalog/Customers/Booking. Optional POS Draft count requires independent permission and Web flags. Shows last-list-limited appointment status and service/customer counts, not revenue or whole-business reporting. No new Salon domain tables, PII sharing or Cashier production access. Public `/demo/salon` remains synthetic. New default 404/Next build/CI, all SQL Modules and K0/K1 PASS on PR #82.

## Original architecture upheld

- Modular Monolith, one Next Web + Nest API; Shared Booking/Catalog/Customers/POS owned independently. Salon is a composition/UX, not a duplicated ERP or a cross-module SQL owner.
- ADR-030 server K5 Session → Tenant/Business/Branch scoped stored procedures, exact Origin, separate read/manage RBAC, composite FK, runtime app EXECUTE-only rights and negative multi-tenant tests.
- Bookings stay independent of HR/POS/Accounting; StatusChange has no financial consequence. No unsafe Cashier global EmpID locking.
- Forward-only migration 015 stays **source/isolated CI ONLY**. Source manifest 001–015; K5F pre-migration audit continues pinned to observed 001–009. Operator transition must separately authorize SQL **010–015** after off-host encrypted backup/isolated restore and root-owned checker proof. The staged SQL migration workflow was NOT invoked.
- ADR-031 accounting first journal and ADR-032 Business activation/paid entitlement remain PROPOSED; K5F root operator, reverse proxy/Origin and independent off-host disaster recovery not approved. No Public K5 Auth or customer Module flags activated. Staging code deploy success, if independently verified, does NOT prove staging schema/feature readiness.

## Next fastest safe product step

Operator closes K5F+offhost recovery gates and authorizes a separate SQL 010–015 staging change window. Meanwhile engineering can add Branch working hours and first Staff/Chair scheduling under isolated SQL CI (Booking owner), improve POS DRAFT operations without posting and build specific Salon role-based onboarding. Do not block the private pilot on Payroll/Inventory/BI, but never imply financial functionality without ADR-031 approval.

**Evidence:** PR #80's Shared Booking disposable SQL + HTTP run PASS **24 checks**. PR #81/82 K0, K1, K5C/Interactive Demo, Catalog, Customers, Booking, POS Drafts and Staging Artifact workflows PASS on individual heads. Post-merge main runs and Staging Deploy are checked independently; keep exact release SHAs in GitHub Actions logs, never infer public DNS from CI.

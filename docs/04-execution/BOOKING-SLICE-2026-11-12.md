# Booking first shared vertical slice — delivery/verification packet

**Date:** 2026-11-12  
**Status:** feature branch and PR; CI sign-off, merge and deployment must be confirmed separately. No customer-facing activation.

### Authoritative changes
- `db/migrations/013_branch_booking_foundation.sql`: Branch-owned resources and appointments, scoped composite FKs for Customer/Catalog Service/Resource, proc-based current K5 auth & Branch RBAC, idempotent creation, resource-row locked overlap rejection. **Not allowed on VPS.**
- `apps/api/src/booking/*`, `apps/api/src/app.module.ts`: fixed read/create endpoints, strict UUID/time and exact-Origin writes; two independent default-OFF API flags; token hashing and typed SQL parameters; sanitized errors.
- `apps/web/src/app/workspace/[businessId]/[branchId]/booking/*` and `workspace-home-client.tsx`: feature-gated private RTL forms and booking list. UI consumes authorized Customers/Catalog endpoints, no direct SQL, shows Booking link only after successful server-side authorization reads.
- `apps/api/test/booking.test.cjs`: default denial, invalid scope/fields/date and forged Origin.
- `tools/booking/verify.cjs` + `shared-booking-ci.yml`: isolated disposable SQL Server + real Nest HTTP, including overlapping and **concurrent same-resource** requests, foreign Tenant/Business/Branch, revoked session/role/membership, idempotent create/replay, product-as-service rejection and FK protections.

### CI and delivery acceptance
- [ ] Booking SQL + HTTP CI passes on exact final PR HEAD.
- [ ] K0 + K1/Web build, current Customers/Catalog and K5/K6C regression CI remain green.
- [ ] No code mistakenly modifies Customers or Catalog authoritative tables; no extra SQL grants and no hard-coded Salon-only domain data.
- [ ] Independent code/security reviewer accepts resource-locking and time-bound rules before merge.
- [ ] Mainline merge and staging code Workflow verified independently; no SQL migration, K5/Auth flag, Booking Web/API flag, seed or public onboarding enabled.

### Dependencies and deliberate limits
- PR depends on Customers PR #57 (and Catalog PR #55), already merged to `main` at K7 Booking PR creation time; review Booking as an **independent diff**.
- K5F security/inbox/backup/Nginx/real synthetic 2-Tenant manual E2E remains OPEN, and the K5F root checker expects only SQL migrations 001–009.
- ADR-030 trusted server scope + Default Deny accepted. SQL RLS separate review. ADR-032 paid activation still PROPOSED; documentation review PR #56 is not acceptance.
- Booking Core v0 does not guarantee full Salon V1; read [Booking Core contract](../03-modules/BOOKING-CORE-V1.md).
- If not merged, revert branch. If merged but DB not approved, rollback code only. Future applied SQL requires authorization, migration/checker version compatibility, verified backup and forward-fix rollback.

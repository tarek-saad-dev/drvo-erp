# Customers — product-acceleration stacked delivery PR

**Date:** 2026-11-12 · **Status:** Engineering-only, private flags OFF. **Dependency: Shared Catalog PR #55 must merge before Customers PR retargets to main.**

- Added shared Business Customer records/optional phone, immutable scoped IDs, idempotent create and limited list.
- Existing K5 session/RBAC is checked on every API operation and again inside scoped SQL transaction. `customers.read` and `customers.manage` are distinct, neither seeded into live Owner roles.
- Added private RTL Customers UI and conditional Workspace link; all Web/Identity/Customers feature flags OFF.
- Isolated disposable SQL 2022 + real NestJS HTTP CI with negative Tenant/Business/Branch and revocation tests; unit tests for default-deny/strict inputs. CI results must be verified on exact PR SHA before signoff.
- **No real customer accounts, phone numbers, legacy Cashier imports, emails, API feature enables or VPS migration.** SQL 012 staged only in PR and requires prior 010/011 migration review.
- Future Booking records will reference CustomerId through a composite Tenant/Business FK, not copy this Module's contact identity.
- ADR-030 baseline accepted for trusted scope; RLS/support policies still open; ADR-032 approval required before customer-visible commercial Module activation. ADR-031 remains separate financial gate.
- Rollback before DDL is revert-only; any future applied forward-only migration needs a dedicated authorized corrective plan with backup/restore.

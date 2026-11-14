# P4-D — Cross-domain runtime SQL privilege denial on disposable 017

**2026-11-14 · source + disposable GitHub SQL2022 test only. NOT actual VPS permission review or approved SQL change.**

The existing Shared Booking SQL API HTTP CI already boots a localhost SQL Server 2022 Docker instance, applies migrations 001–017 from source, creates `drvo_erp_stage_app` as a restricted principal, then uses real K5/Nest HTTP to exercise persisted Catalog, Customers, Booking and POS **DRAFT**. This PR adds one **additional test** on that same disposable database; it does not create any migration.

Check the restricted runtime SQL user's effective object grants for all six `SELECT/INSERT/UPDATE/DELETE/ALTER/CONTROL` rights on **eight** Module-owned tables: `core.CatalogCategory`, `core.CatalogOffering`, `core.Customer`, `core.BookingResource`, `core.BookingAppointment`, `core.BookingStatusChange`, `core.PosDraft`, `core.PosDraftLine`. Every right must equal **0**, not `NULL`; a direct `SELECT TOP(0)` additionally must fail with SQL Server error **229**. Separately ensure approved Module read/create procedures have `EXECUTE=1`, while internal `Assert*BranchAction` guard procedures have `EXECUTE=0`.

This tests **SQL least privilege across four reused independent domain owners**, rather than assuming the UI or Nest controller's role guard makes direct SQL safe. It does not prove total Tenant isolation, independently sign signed operational evidence, review the production app user's SQL login, or authorize schema changes; the existing negative HTTP/DB scope tests remain required as well.

**Architecture impact:** zero product code, SQL migrations, API/Web/Kernel, commercial finance, public login, production grants, or runtime flags. ADR-030 (Tenant/Business/Branch), ADR-032 (limited ACT-01–07 baseline), ADR-037 (Lean Kernel/Module ownership) unchanged.

**Acceptance:** `Shared Booking SQL API HTTP CI` plus K0/K1 green on PR SHA. **Rollback:** revert a test-only file and this documentation; no DB rollback needed. P1–P7/C1–C3 in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) remain OPEN. Before real P4: P1 #121, P2 #122, P3 #123 witnessed operational evidence, independent DBA/Security/Founder authorization and immutable revised post-017 checker with actual VPS credentials/permissions. Never copy credentials or backups into CI or PRs.

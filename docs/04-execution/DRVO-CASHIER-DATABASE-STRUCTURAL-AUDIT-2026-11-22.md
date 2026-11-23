# DRVO vs Cashier SQL Server: structural evidence and performance gap baseline

**Date:** 2026-11-22 — **SOURCE-ONLY AUDIT.** No production SQL access, database measurements, Query Store, execution plans or real customer rows inspected. This is not a database-strength certification.

**Refs:** DRVO `b22aaa2eb99ebd01ff45239bfb2b66968478c432`; Cashier `f8fa67d2b1c8254e638cf89d95dcee75edc88598`. This review covers representative DDL, *not every historical database object*. Repo directories currently expose **40** DRVO sequential SQL migration files (`db/migrations/001…040`) and **94** Cashier `db/migrations` files plus **21** DRVO-related Cashier migration directories. These are **file/directory counts, not actual table/index counts nor applied migration counts**.

## Verified DDL examples

| Capability | DRVO code evidence | Cashier evidence | Assessment |
| --- | --- | --- | --- |
| Tenant/Biz/Branch parent-child integrity | [SQL001](../../db/migrations/001_platform_identity_foundation.sql): composite `PK(TenantId,BusinessId,BranchId)`; `Business→Tenant`, `Branch→Business`, `BranchAssignment→Branch/Membership` composite FKs; `ROWVERSION`, checks, two account membership lookup indexes | Legacy `TblBranch`/branch ownership, plus Cashier DRVO TenantContext and migrations | **Stronger-by-design multi-business physical scope in DRVO source**, not proof all queries obey it |
| Business catalog | [SQL011](../../db/migrations/011_shared_business_catalog.sql): composite PK, unique request key, category FK, `IX_CatalogOffering_List`, money/duration/check constraints | Service/price migrations; Cashier domain queries | SQL constraints exist; query-plan comparison OPEN |
| Customers | [SQL012](../../db/migrations/012_business_customers.sql): unique idempotent request, Business FK, `IX_Customer_Business_Name`; [SQL024](../../db/migrations/024_customer_business_search.sql) adds server search | [Cashier follow-up indexes](https://github.com/tarek-saad-dev/casher/blob/f8fa67d2b1c8254e638cf89d95dcee75edc88598/db/migrations/add-customer-followup-indexes.sql): `IX_TblClient_RegisterDate`, `IX_TblClient_BirthDate`, `IX_TblinvServHead_ClientID_invDate` with INCLUDE columns | DRVO has basic search/indexing; Cashier has **specialized visit/follow-up covering indexes**. No equivalent posted-sale visit model certified yet |
| Booking FK and range performance | [SQL013](../../db/migrations/013_branch_booking_foundation.sql): resource/customer/offering FKs; `IX_BookingAppointment_ResourceRange` and `IX_BookingAppointment_BranchTime` | Cashier slot claims, availability revision, booking public idempotency migrations | Structural progress; conflict/race, public booking and  realistic load proof OPEN |
| POS draft constraints | [SQL014](../../db/migrations/014_branch_pos_drafts.sql): scoped draft+line composite FKs, one unique request key per Branch, `IX_PosDraft_Branch_Created`, line/amount checks | Mature posted sale header/detail/payment tables and triggers | **Not comparable as production POS:** DRVO only DRAFT; posted invoice, cost, tender/reversals and indexing still needed |
| HR/Salon extension | [SQL018](../../db/migrations/018_hr_employee_salon_barber.sql): employee→branch→barber resource FK, employee code uniqueness, filtered `UX_SalonBarberProfile_ActiveResource` | Cashier HR, attendance, payroll/pay-plan/ledger indexes | Correct shared-vs-extension ownership exists; payroll/attendance lifecycle parity incomplete |
| Stock and idempotency | [SQL027](../../db/migrations/027_inventory_branch_stock.sql): `BranchStockBalance` composite PK; receive/adjust unique request, cancel filtered unique indexes, Branch/Offering FKs | Cashier stock moves, purchase ledger, sale-side effects | Stock structure real in source; **sale stock decrement / costing / return integrations not yet certified** |
| BusinessDay/Shift | [SQL029](../../db/migrations/029_operations_business_day_shift.sql): `UX_BusinessDay_OneOpenPerBranch`, `UX_OperationalShift_OneOpenPerAccount`, unique BusinessDate | Cashier WorkDate, `TblNewDay`, `TblShiftMove` | Correct concurrency invariants in source; legacy real shift/day parity OPEN |
| Treasury | [SQL030](../../db/migrations/030_treasury_cash_movements_recon.sql): scoped movement + day/shift FK, unique request and reconciliation; GL state check **GATED** | [Cashier filtered unique recon index](https://github.com/tarek-saad-dev/casher/blob/f8fa67d2b1c8254e638cf89d95dcee75edc88598/db/migrations/add-treasury-shift-recon-unique-index.sql) | DRVO has structural custody and recon; **no approved GL posting** under ADR-031 |

## Distinctions that matter

**Strong schema ≠ proven live database or fast system.** DRVO has solid *declared* PK/FK/UNIQUE/CHECK/index patterns. We still need: (a) verify applied SQL001–040 and actual trusted/disabled FK states on the target; (b) compare index coverage for Cashier's most frequent operator queries; (c) Query Store / execution plans with representative, anonymized Cut-sized data; (d) test insert/write overhead, contention, deadlocks, lock duration and retry behavior; (e) validate backups, restore, migrations, RPO/RTO and least-privilege access; (f) complete posted Sales/Treasury/Inventory/Accounting and reconciliation.

**Avoid both extremes:** Don't clone legacy tables/triggers into DRVO and call them tenant-safe. Don't reinvent proven Cashier compound/INCLUDE/filtered indexes blindly; port the query semantics, then tune indexes from measured SQL plans. An index on `(ClientID, invDate)` in a single-tenant legacy schema is **not automatically safe or selective** in DRVO; a DRVO historical-sales equivalent likely needs `TenantId, BusinessId` and authorized branch/role predicates as appropriate. Exact key and INCLUDE columns must follow observed query filters, ordering and cardinality.

## Repeatable READ-ONLY schema metadata inspection

[Schema health probe](../../tools/db/schema-health-readonly.sql) is **SELECT-only** against the database context chosen **by an authorized operator**. It reports schema/table, index, filtered index, unique, FK, CHECK and disabled/untrusted counts plus index/constraint exceptions **without reading business rows, modifying objects or choosing a connection**. Run independently on approved DRVO and legacy Cashier instances using least-privilege metadata access, keep exact DB identity/checksum evidence, and compare outputs offline. No credentials/PII in GitHub.

### Next engineering work

1. Owner verify live isolated **DRVO_ERP_PILOT** identity, version/checksums, backup/restore and K5 private Owner access. Source 001–040 is **not target apply evidence**.
2. Produce a logical ERD and exhaustive relation/constraint inventory from *live metadata*, comparing DRVO vs only the Cashier workflows Cut actually uses. Escalate untrusted/disabled constraints or missing critical FK to schema-owner review; don't auto-fix production.
3. Capture actual POS customer/visit, Booking availability, HR attendance, Payroll ledger, Treasury shifts and Reports SQL shapes. Compare reads at warm/cold cache, index usage and query plans on representative non-sensitive sizes. Set explicit latency and concurrent workload SLOs with founder, then measure.
4. Author **incremental** indexes and unique constraints only after review of query plans, read/write tradeoffs, scope isolation and safe deployment. Prove impact on CPU, logical reads, locks and regression, then run disposable SQL tests and separate authorized pilot apply.
5. Block Cut replacement until Financial Posting/ADR-031, data reconciliation, failure/recovery and operational E2E prove source-of-truth correctness.

## Related acceptance

[Operational cutover ledger](CUT-SALON-OPERATIONAL-REPLACEMENT-BASELINE-2026-11-22.md), [ADR-030 isolation](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md), [ADR-031 finance](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md), [Pilot activation](PRIVATE-PILOT-LIVE-ACTIVATION-ONE-COMMAND-2026-11-21.md). **No DB was queried or changed by creating this document.**

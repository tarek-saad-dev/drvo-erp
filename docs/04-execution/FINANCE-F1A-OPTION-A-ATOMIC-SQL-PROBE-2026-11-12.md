# F-1a — Conditional Option A atomic SQL mechanics probe (2026-11-12)

**Status: PR #70 MERGED with K0/K1 and Option A SQL Mechanics CI success. CI-ONLY SYNTHETIC TRANSACTION EXPERIMENT. Not a real Sale, Accounting implementation, API, ERP migration or financial sign-off.** This follows [ADR-031 Founder/Finance decision packet](ADR-031-FOUNDER-FINANCE-DECISION-PACKET-2026-11-12.md), which remains **PROPOSED**. The founder's instruction to continue two development tracks is not a substitute for Finance/account mapping or formal ADR acceptance.

## Architecture impact before changes

- Shared **Sales/POS** source and **Accounting** first journal would share a carefully bounded SQL transaction under **Option A**, with an Outbox write. This PR demonstrates only the transaction pattern, and does not transfer table ownership or allow POS to write future Accounting domain tables.
- Production **POS Draft** code, SQL 014, Treasury, Customers, Inventory, HR, Salon Extensions, Booking, K5 authenticated scopes and all entitlement/feature flags are **unchanged**.
- All new SQL tables exist only inside isolated `DRVO_ERP_FINANCE_CI_ONLY` on the disposable GitHub Actions SQL Server 2022 container and are removed after the proof. **No new migration 015**. No change to stage or Cashier.

## What is actually exercised

- `tools/finance/option-a-atomic-sql-proof.cjs`: create throwaway scoped Branch/Draft/Sale/FirstJournal/Outbox proof tables with composite Tenant/Business/Branch keys and FKs. A transaction acquires a scoped per-operation SQL application lock and re-reads the test Draft under SERIALIZABLE isolation. The money value is read from a seeded synthetic source snapshot, never trusted from a request.
- A single SQL transaction attempts **source sale + equally-valued first-journal debit/credit + outbox**. Faults injected immediately after Source Sale and immediately after FirstJournal must roll back all three effects. Exact replay uses immutable key + source snapshot hash. Parallel replays must produce one canonical effect across eight identical calls.
- Cross-Business, cross-Tenant draft access and changed snapshot/hash fail; unique scoped Draft reference prevents a second operation from double-posting the same snapshot. The test uses a **synthetic single amount** and arbitrary matching DR/CR to prove mechanics ONLY, **not valid account codes, legal journal entries, VAT, AR, tender or settlement**.
- `.github/workflows/finance-option-a-atomic-proof-ci.yml` starts the dedicated disposable SQL Server container, installs test SQL driver, runs the probe, cleans up. No SSH, VPS, DNS, secrets or actual account data.

## Explicit exclusions

Passing SQL transactional mechanics does **not** prove actual tenant authorization/RBAC, current valid customer invoice, correct book period, taxes, legal receipt, Chart of Accounts, multi-currency/exchange, cashier shift custody, third-party settlement, costs, offline credit, reversals or measured scale/SLA. **This is an isolated synthetic branch ID proof, not a user-authenticated HTTP negative test.** Code must NOT be imported into Nest/Next apps or called from service workers.

## Next gated steps

1. Founder + qualified Finance + Architecture explicitly adopt ADR-031 A or B, legal tender/AR/VAT/CoA/reversal and period policies. Conditional A is recommended, not silently approved.
2. Implement typed `SalePostCommand` and Accounting-owned first-GL contract with explicit `pos.sale.post` permission, versioned price/tax snapshot and default-DENY entitlement, on a separate reviewed PR.
3. Build proper POS/Accounting domain-owned SQL 015+ only after above approvals; deploy only after K5F and operator authorized migrations. Repeat atomic/concurrency/partial failures under **actual** live K5 scoped HTTP, not only this synthetic probe.
4. Test critical SQL lock wait / checkout p95 in controlled disposable SQL load for realistic one-/many-Branch workloads, preserving invariant under failure; do not claim enterprise-scale performance from 8 concurrent synthetic replays.

**Release hold:** SQL 010–014 still not authorized on VPS; Public K5/module flags remain OFF; K5F and ADR-032 remain open; no `POSTED` real product entry point exists.
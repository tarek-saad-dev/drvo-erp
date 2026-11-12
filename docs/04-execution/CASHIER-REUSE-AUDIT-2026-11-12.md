# Cashier → DRVO reusable rules — first pinned audit (2026-11-12)

**Scope:** static code review and synthetic characterization. Source: [Cashier repository](https://github.com/tarek-saad-dev/casher/tree/7a1d0218eec05ba541f65eaee4b665c782845704), pinned **7a1d0218eec05ba541f65eaee4b665c782845704**. No Cashier changes, no copied database, no live PII, no code imported by DRVO runtime, no production parity demonstrated. Earlier sampling: [discovery](CASHER-REUSE-DISCOVERY.md).

## Architecture impact before implementation

Reuse **rules and test vectors**, never its DB pool/session or route wiring. New implementation must remain owned by DRVO Shared modules with per-Tenant/Business/Branch K5 scope, and Salon features through bounded Extensions. No universal Kernel leakage of POS/HR/Inventory domain logic, no direct schema copying. Cashier is legacy system-of-record during approved coexistence; DRVO Booking authority and cutover require separately reviewed contract. For micro-business and multi-branch enterprise: same shared contracts; benchmark cross-branch concurrency and scale before claims. ADR-030 trust boundaries govern all adapted work; ADR-031 finance and ADR-032 commercial choices remain open.

## Source-backed reuse shortlist

| Priority | Exact Cashier source, pinned at audit commit | Finding / target DRVO owner | Decision / missing proof |
|---|---|---|---|
| P1 | [operations/day reconciliation](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/modules/operations/domain/businessDayReconciliation.ts) | Pure OPEN day catch-up: NO_OP, ROLLED_OVER, OPENED_MISSING_DAY. Candidate for future **POS/Shift/BusinessDay** core | **CHARACTERIZED, NOT PORTED.** 5 fixture groups in DRVO root CI, strict ISO-date guard is deliberate hardening; evaluate timezone/rollover and shifts |
| P1 | [booking transaction applock](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/lib/booking/publicBookingCreateLocks.ts) | SQL `sp_getapplock` transaction-owned helper, Booking owner | **ADAPT / REVIEW** resource key includes Legacy EmpID, potential truncation/collision; DRVO Booking 013 already uses resource-row locks. Test against SQL concurrency before any replacement |
| P1 | [payroll agreement math](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/lib/payroll/payrollAgreementMath.ts) | Proration, retroactive branch impact, validations for future HR | **ADAPT AFTER HR POLICY**: uses JS number + rounding to 2 decimals and legacy numeric Branch IDs. DRVO uses scoped UUIDs and currency minor units; investigate partial-period rules, payroll posting |
| P2 | [tip allocation candidates](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/lib/pos/tipMath.ts) | POS tender surplus and barber revenue-ranked suggested allocation | **SALON EXTENSION ONLY**: named EmpID/EmpName and `roundMoney` dependency; never mix customer tip with taxable revenue or treat source figures as verified settlement |
| P2 | [inventory stock policy](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/lib/inventory/stockPolicy.service.ts) | Inventory negative-stock gate concept | **DESIGN REFERENCE ONLY**: reads/writes `dbo.TblInventoryStockPolicy`, legacy pool; re-author with Business ownership, cost pending, concurrency and SQL scoped procedures |
| P2 | [messaging tick](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/modules/messaging/application/processOutboxTick.ts) | Claim/retry/stale recovery concepts for opt-in Messages/Outbox | **PATTERN ONLY**: WhatsApp-specific, tenant job context; never make notifications blocking for financial posting |
| REJECT | [legacy DB adapter](https://github.com/tarek-saad-dev/casher/blob/7a1d0218eec05ba541f65eaee4b665c782845704/src/lib/db.ts) | Connections include local/cloud modes and legacy environment | **DO NOT COPY**; DRVO has independent hardened SQL principal/credentials, migrations and scoped access |

## Testable characterization delivered

`tools/cashier-reuse/business-day-characterization.cjs` is an **independent test-only expression** of a tiny sampled decision function, not production logic. `tests/cashier-business-day-characterization.test.cjs` covers same date, previous date before/after rollover, future open, missing day, skipped dates and invalid inputs. Runs with `npm test`. Source sample does not validate ISO date inputs: explicit DRVO guard changes out-of-domain behavior; only valid-input behavior is claimed compatible.

**Not verified:** execute Cashier and DRVO against identical fixtures, no cross-repo CI/parity job, salary rounding in EGP/SAR/AED, historical data comparison, workload/lock benchmarking, API/db security. A sampled pure function is NOT a guarantee Cashier is safe to transplant.

## Next non-overlapping implementation packets

1. **CU-1 P1**: build read-only contract inventory and fixture comparison on pinned Cashier HEAD and DRVO for shift/date, booking concurrency, salaries and tips. Source and expected outputs version-controlled; mismatches explicit.
2. **CU-2 P1**: map legacy customer/service/employee/shift IDs to DRVO Business/Branch-scoped identifiers; synthetic ETL only, never live DB until backup/reconcile/authorization.
3. **CU-3 P1**: choose one approved Shared POS/HR subdomain and implement pure functions in its **domain owner** with money precision and Tenant isolation tests; independently review against original Cashier behavior.
4. **CU-4 P2**: multi-branch operational parallel run, reconciliation with immutable source snapshots, rollback, no data copying or bidirectional writes until cutover contract approved.

## Explicit held gates

No changes to Cashier production, no secret/data copies, no automatic Migration 010–013 to VPS, no Public Auth/feature flags, no actual booking transfer or ledger posting. [POS→Ledger parallel PR #59](https://github.com/tarek-saad-dev/drvo-erp/pull/59) is a separate PR; first-GL implementation waits for ADR-031, Commercial activation waits for ADR-032, security operations K5F stays OPEN.

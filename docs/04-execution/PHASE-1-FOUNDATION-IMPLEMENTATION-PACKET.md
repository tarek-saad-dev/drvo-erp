# DRVO ERP — Phase 1 First Development Work Package (Kernel Before Modules)

> **2026-11-01 K0 IMPLEMENTATION UPDATE:** [PR #4](https://github.com/tarek-saad-dev/drvo-erp/pull/4) is **merged**. It implements an intentionally bounded K0.0 **TypeScript baseline + CI + pure test fixtures** (not full Next.js/NestJS bootstrap), with eight passing local unit tests and successful PR-head Actions. No SQL/API auth/Module activation/finance runtime. Follow-up [Issue #3](https://github.com/tarek-saad-dev/drvo-erp/issues/3) remains open for framework bootstraps; [Issue #5](https://github.com/tarek-saad-dev/drvo-erp/issues/5) tracks the disposable SQL Server spike; [Issue #2](https://github.com/tarek-saad-dev/drvo-erp/issues/2) tracks ADR/security/finance/billing gates. The original status below is the **pre-code proposal snapshot**, not the current implementation state.

**Date:** 2026-11-01  
**Status:** **READY-FOR-FOUNDER/ENGINEERING REVIEW AS A BOUNDED WORK PACKAGE — NOT AUTHORIZATION TO START CODE, SQL OR VPS CHANGES.**  
**North Star:** One global-ready extensible multi-industry SaaS ERP, one Lean Kernel and independently owned Business Modules. First commercial Salon/Cut Salon Edition, no private forks.

> **2026-11-01 sequencing confirmation:** Following the founder's new development direction, **minimal SaaS Commercial Core is Phase 2 after Kernel**, not an afterthought in a late commercial phase. The Kernel keeps trusted Business-scoped entitlements/Module gates; an adjacent DRVO Billing owner handles plans, verified/manual payments, invoices and renewals; Business Accounting remains a separate customer-domain Module. Only a *free test grant* belongs in Kernel K0.4; real paid activation still requires ADR-032 approved state/consent/settlement semantics. K1 Web/API/Worker runtime PR is a non-production scaffold. Full Salon V1 scope and release gates are unchanged.

## 1. What is already locked vs not

- **Foundational principles approved:** Constitution V1, Tenant→Business→Branch, industry-independent Business, optional Enterprise relations, governed third-party Extensions, verified country/industry releases and Lean Kernel (ADR-033–037).
- **Product architecture approved:** Modular Monolith, shared SQL Server V1, independent user-facing Apps, Required/Optional dependencies, one priced Required-bundle consent, configurable Industry Starter, Core+Extension for Modules, conditional independent Domain Modules.
- **First industry:** comprehensive Salon commercial V1 after real Cut Salon validation; Clinic is next after specific privacy/compliance design. Staged coding does NOT create a reduced commercial V1.
- **Still require signed security/finance/billing engineering decisions:** ADR-030/031/032, plus module-specific finance/permissions and tested physical SQL/data-access configuration. This work package does not falsely mark these accepted.

## 2. Minimum non-production Milestone P1-K0 — when founder authorizes coding

**Goal:** DRVO engineering can build and test the protected Kernel without fake POS financial behavior or paid provider integration.

| Slice | Concrete deliverable | Owner | Exit check |
|---|---|---|---|
| K0.0 Repo and app shell | Strict TS monorepo skeleton, API/web/worker separation; UI shell scaffold; lint/typecheck/unit/CI; env/secrets templates | Platform | Build passes; no real payment or customer data |
| K0.1 Persistence spike | Disposable SQL Server edition/version, selected typed repository/driver and versioned migration runner; backup/restore rehearsal | Platform + Ops | Compare SQL transactions, scoped FKs, decimal/locks/RLS risks; choose driver by evidence |
| K0.2 Identity/tenancy | Platform-global unique username auth, Tenant→Business→Branch canonical scope, explicit Business Owner membership, narrow roles and Allow-only/Default Deny | Kernel identity | Tests SCOPE-01–04, 07–08; no privilege escalation |
| K0.3 Trusted services and audit | Service/worker identity, trusted scoped command context, domain scope guard, security audit and event-contract envelope | Kernel + infrastructure | Tests SCOPE-05–06, 09 on jobs, files, cache/export fixtures |
| K0.4 Module governance | Static reviewed Module manifest/release registry, Required/Optional compatibility validator, free test grant, per-Business activation and independent authorized App tile | Kernel registry + UI shell | Tests MOD-01–04, 06, 09; paid billing excluded |
| K0.5 Evidence and handoff | CI run, negative threat matrix, restore report, source ownership ledger, open risks/ADRs, reproducible dev environment | Platform QA | Exact evidence links, signed gate for next slice |

**No actual Salon POS sale/GL, Cashier database migration, Clinic records or real commercial payment in K0.** These require their own owner, financial and market gates. Do not introduce fake posted financial data merely to demonstrate the UI.

## 3. Next development slices — keep Module ownership separate

- **K1 Domain basics:** Catalog, Customers and selected valid Salon Starter contracts; module-level scope, pricing snapshots and client records. Exact Required edges signed by actual owner; don't overbuild future sector hooks.
- **K2 Financial online vertical slice:** POS / Treasury / Accounting source-of-truth transaction contract; choose/ratify ADR-031, cash/verified vs unverified electronic evidence, balanced GL/refund, replay and real SQL latency test. This is the first finance-critical end-to-end flow.
- **K3 Salon workflows:** Booking, scoped salon resource extensions, HR/commission, Inventory/Purchasing and protected Reporting in separate small Module contracts.
- **K4 Offline and real devices:** PWA IndexedDB device queue, replay/sync/period close/lost-device cases, optional printer and integration adapters; preserve accepted ADR-009–013 product rules.
- **K5 Cut Salon validation and DRVO SaaS commercialization:** complete commercial V1, DRVO plan/entitlements/manual collection, cross-branch pilot with legacy Cashier coexistence, data migration/rollback and QA, real Business verification, release permission.

**Order is not "finish all Accounting before any POS code"**; it is “sign authoritative financial boundary before real POSTED sale path.” Internal engineering slices do not replace the comprehensive Salon commercial release objective.

## 4. First bounded engineering PRs — acceptance contracts

**PR-01** Scaffold and CI (no SQL/business endpoints).  
**PR-02** SQL Server driver/migration spike + disposable DB + restore test (after technology owner review).  
**PR-03** Tenant/Business/Branch + global username + initial membership and Default Deny (after ADR-030 baseline approval).  
**PR-04** Scoped worker/event/security audit contract + negative security tests.  
**PR-05** Static Module Registry + free-grant activation + independent launcher tile + concurrency tests (after in-scope ADR-032 rule signoff).  
**PR-06** First domain-owned Module Contract (Catalog or Customers) with actual published APIs and data-owner tests.

Each PR must include owner, accepted ADR refs, actual test evidence, migration impact, rollback and exactly **which open decisions are intentionally out of scope**. Contract rulebook: [Standard Module Contract](../02-architecture/STANDARD-MODULE-CONTRACT-V1.md).

## 5. Founder/architecture signoff checklist before the first **persisted** code

- [ ] ADR-030 trusted scope policy chosen including explicit Owner membership, Manager delegation and no unscoped support access; SQL FK/RLS validation plan signed.
- [ ] Technology spike result/primary DB driver/migration runner; isolated development SQL Server edition, secrets/restore policy.
- [ ] Module ownership contract rules accepted; each in-scope entity has scope class and source-of-truth; exact cross-module imports forbidden.
- [ ] CI/negative integration criteria, test environment and Quality Plan linked and measurable.
- [ ] Explicit authorization for **K0 non-production** only, with responsible reviewer and no automatic Production deploy.

**Before K2 POS POSTED:** additionally sign ADR-031 financial source/GL account and tender/reversal/period contract and measure Option A vs fallback B.  
**Before real paid activation:** additionally sign ADR-032 approver/pricing/refund/grace, quote/activation states and concurrency and verify provider/manual settlement.  
**Before any real Salon pilot/production:** security review, negative tests, backup-restore, cross-Branch money/offline reconciliation, Cut Salon coexistence and legal market eligibility signoff.

## 6. Files to read in order

1. [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) / [Constitution V1](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md).
2. [Master Map](../02-architecture/DRVO-UNIVERSAL-ERP-ARCHITECTURE-MASTER-MAP-V1.md), [ADR Register](../05-decisions/DECISIONS.md).
3. [Engineering Decision Packet](../02-architecture/PHASE-1-FOUNDATION-TECHNICAL-DECISION-PACKET.md), [Data and Contract Boundaries](../02-architecture/FOUNDATION-DATA-AND-CONTRACT-BOUNDARIES-V1.md).
4. [Technology Baseline](../02-architecture/TECHNICAL-STACK-AND-MIGRATION-BASELINE-V1.md), [Standard Module Contract](../02-architecture/STANDARD-MODULE-CONTRACT-V1.md), [Salon Domain Ownership/Starter](../03-modules/SALON-V1-OWNERSHIP-AND-DEPENDENCY-STARTER.md).
5. [Quality and Evidence Plan](FOUNDATION-QUALITY-AND-TEST-PLAN-V1.md) and [Foundation Closure](FOUNDATION-CLOSURE-AND-NEW-INDUSTRY-READINESS-GATES.md).

## 7. Final assessment

**Architecture F0 COMPLETE as founder-approved laws. F1 complete as a usable documented ownership map, still requiring any exact technical classifications to be signed. F2 prepared as a bounded engineering-review packet, not implemented/tested or ready for customer data.**

This document provides a realistic start sequence. It does **not** authorize code, database changes, production, a legal compliance claim or a finished universal ERP.

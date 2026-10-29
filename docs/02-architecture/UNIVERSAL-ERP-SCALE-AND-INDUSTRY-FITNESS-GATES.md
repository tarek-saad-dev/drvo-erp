# DRVO ERP — Universal Industry / Customer-Size / Platform-Scale Fitness Gates

**Date:** 2026-10-30
**Status:** DESIGN REVIEW FRAMEWORK governed by founder-approved Charter and ADR-029. Individual performance targets, production SLAs, actual product capacity and test results remain UNDECIDED/UNVERIFIED. No coding.
**Purpose:** Turn the three ambitious pillars into concrete acceptance questions and evidence, so no engineering convenience silently makes DRVO Salon-only or locks a micro/enterprise future into one size.

## 1. Distinguish dimensions from marketing claims
| Independent dimension | Real meaning | Wrong shortcut |
|---|---|---|
| Industry coverage | compatible, published, tested solution with required workflows/security/regulation | “any new industry is ready because Modules exist” |
| Module breadth | count and compatibility of app capabilities, optional extensions and dependencies | “more modules = enterprise grade” |
| Customer size/organization | Businesses, Branches, operators, permissions, workforce, workflows and data volume | “larger company just buys extra apps” |
| SaaS scale | number of Tenants/Businesses, peak write throughput, queue latency, reporting demand, storage/recovery | “single SQL DB works for unlimited users” |
| Risk/regulation | sensitive medical data, taxes and labor/local compliance, residency and retention | “shared Booking handles clinical records” |
| Operations/reliability | on-call/support, alerts, SLOs, data restore, payment/finance correctness | “architecture diagram means SLA readiness” |

## 2. Gate A — Reuse into a new industry
**PASS only with documented evidence for target sector**:
- Industry discovery records critical workflows, entities, roles, regional legal/privacy requirements, expected load and integration.
- Fit-Gap against Shared Core chooses typed Extension vs owned Domain Module vs provider Integration, based on invariants/lifecycle/data/privacy, not names or UI appearances.
- Extension cannot bypass finance/RBAC, publish sensitive data to generic events or import direct cross-module tables.
- Industry Solution manifest references released compatible versions, Required dependencies, permissions, tax/account config, localized display, onboarding and migration strategy.
- Repeatability: a second Business in the industry can onboard via published solution/config rather than first customer's code fork.
- Missing capability/industry is marked unsupported/requested, not silently provided with broken fields.
**Stress test examples:** Salon Booking↔Clinic medical encounters (separate); Warehouse Inventory↔Timber BOM/MRP (new domain); simple salon service attribution (bounded extension, no mandatory V1 execution module).

## 3. Gate B — Serve the smallest viable customer
**PASS when:**
- New Business selects industry and obtains **smallest valid** module/extension set and required platform/financial safety dependencies, explicit bundle pricing/consent (ADRs 016/020/021).
- Only activated and role-authorized Apps appear; everyday action discoverable within first viewport.
- Optional modules add value later without forcing unrelated modules or disabling history.
- Subscription/seat/branch allowance is transparent and proportional; avoid charging per HR employee record merely because HR tracks people (pricing still undecided).
- Initial setup, device/browser compatibility, backup support, data export and simple accounting flows fit customer resources.
**Failure mode:** “Install all apps to start a one-chair barber” or “turn off accounting controls to be cheaper”.

## 4. Gate C — Serve a complex enterprise without pretending capacity
**PASS design readiness** requires:
- Support multi-Business/multi-Branch scoped authorization, managerial segregation, approvals, audited finance/HR/stock and complex integrations.
- Domain-specific Modules and Extensions compose without giant `industry` switch piles or conflicting ownership of GL/Inventory.
- Support external API/batch imports, versioned integration contracts, entitlements and tenant-aware rate limits; separate heavy read/report processing and isolated retries from POS writes as needed.
- Operational provisioning/capacity plan from expected workloads, growth curve and geographic/data residency restrictions.
- Defined recoverability and exit strategy with tested tenant-scope export/move and correction/reconciliation; customer cannot be trapped by irreversible deployment assumptions.
**CAPACITY IS NOT PROVEN** until Gate D evidence exists. A Business with 100,000 employees or sites is not implicitly supported by this design.

## 5. Gate D — Platform-scale verification before any commercial SLA
Evidence items (numeric targets remain **TBD** and must be signed off by product/engineering):
- **Workload matrix:** Tenant count, Businesses/Tenant, Branches/Business, active/concurrent operators, orders/day, invoice lines/day, GL journals, inventory updates, Booking writes, peak POS requests/sec, integration messages/minute, data retention/size.
- **Latency/error SLO candidates:** POS sale/search/checkout end-to-end and p95/p99 with warm/cold starts, financial post/reconciliation elapsed time, control center query/report latency, error rates at normal/peak load.
- **Correctness:** exact-once financial effect under retried messages/duplicates (implemented via idempotency), balanced journals, no cross-Tenant scope bypass, tenant-scoped aggregation, offline reconciliation evidence.
- **Concurrency/data:** SQL Server deadlocks/locks/log throughput, indexes, slow queries, DB connection pools, schema migrations, backup/restore consistency, large Tenant noisy-neighbor impact.
- **Availability/recovery:** off-host backups, tested restores, RPO/RTO assumptions verified, incident/runbook/alerts, restore scope per Business/Tenant and whole pool.
- **Capacity stress:** p50/p95/p99 Tenant demand, bursty one-Tenant workloads, one Enterprise Business heavier than many SMEs, mass export/AI/report jobs and reporting isolation.
- **Tenant portability:** export, backfill, reconcile, move/restore from one shared SQL placement to a future pool/stamp/dedicated deployment without changing Module contracts.
- **Security:** auth/RBAC isolation under concurrency, secret/data encryption, audit gaps, staff/support access, medical/regulated data boundaries and vendor compliance.
- **Evidence artifact:** test code/report/environment/date, target values vs observed, pass/fail, named owner; do not invent benchmark results.

## 6. Architecture evolution — milestones based on evidence
| Stage | Default | Triggers for next step | What is NOT a guarantee |
|---|---|---|---|
| **V1 foundation** | Modular Monolith + tenant-aware one shared SQL Server + web/worker jobs | measured query load, contention, queue latency, recoverability/operational gaps | enterprise SLO, infinite throughput or one-tenant point-in-time restore |
| **Growing SaaS** | horizontal API/worker scale where safe, workload isolation, optimized read reports/queues | repeatable hot tenant, target failure, DB bottleneck, noisy-neighbor metric | automatic linear SQL scale |
| **Multi-stamp / pools** | additional compatible deployment pools / Business placement routing, tenant migration, strict consistency | capacity/regulatory/residency/business isolation evidence | zero-downtime movement, instant split |
| **Dedicated Enterprise placement** | isolated resources where contract, compliance or performance demands | justified customer SLA/cost/security/legal conditions | any arbitrary enterprise size without acceptance testing |

Avoid choosing Kubernetes, event streaming cluster, microservice sprawl or one DB per Business merely to feel “enterprise”. Each evolution step needs a cost/benefit and rollback plan.

## 7. Mandatory Architecture Fitness Record template
Each major ADR / new Module / industry / pricing cap / enterprise deployment request should include:

```text
Change / Industry / Target customer:
Founder Charter pillars impacted: I / II / III
Domain owner & lifecycle:
Shared Core / Bounded Extension / Domain Module / Integration / Industry Solution:
Required dependencies / activation / entitlements:
Tiny Business experience (valid minimal set, no unnecessary complexity):
Large Enterprise experience (throughput, compliance, support):
Tenant/Business/Branch & RBAC / data isolation / audit effect:
Financial consistency, offline queues, retries and idempotency:
Interfaces/contracts/versions/migrations/deprecation:
Performance / observability / load hypothesis:
Backup/restore/RPO/RTO/placement portability:
Open compliance / region / licensing:
Evidence/tests required and owner:
Status: PASS (supported) / NEEDS DESIGN / BLOCKED (unproven)
Approving ADR / founder sign-off:
```

**Rules:** PASS is not a declaration of enterprise runtime readiness; that additionally needs Gate D evidence at defined load and geography. `NEEDS DESIGN` may continue discovery but not bypass authorization for dependent app code. `BLOCKED` means redesign or explicit founder-exception ADR with justified migration/exit path.

## 8. High-priority architecture validation backlog — proposed order
1. Ratify Tenant/Business/Branch isolation contract, composite scoped identifiers and Server RBAC for all auth/read/write/queue/search/report interfaces.
2. Finalize Module Registry, Core+Extension points, dependency closure, versioned industry solution manifests, activate/suspend/update and billing/entitlement contract.
3. Finalize Salon V1 ownership map and cross-module transactional/event financial invariants, offline sync and reconciliation.
4. Perform **design-level** Clinic fit-gap for clinical record privacy, consent and independent domain, and Manufacturing fit-gap for BOM/MRP/imports. These are not implementations/launch commitments.
5. Define test workloads and SLO proposal by micro/SME/Enterprise customer scenario, VPS capacity/SQL edition verification and future placement/migration seams; conduct load/security tests **only when development is separately authorized**.
6. Define region/country support and service guarantees based on legal/security evidence; clarify pricing and Enterprise placement support/cost.

**References:** [Founder Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md), [Industry Architecture](INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [SaaS Scale](SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md), [Incremental Module Growth](INCREMENTAL-BUSINESS-MODULE-GROWTH.md).

**No app code, data migrations, load test or production deployment authorized.**

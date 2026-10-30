# DRVO ERP — Foundation Closure, Pre-Code Gates & Repeatable New-Business Readiness

**Date:** 2026-10-31  
**Status:** **PHASE-0 REVIEW CHECKLIST / EVIDENCE GATES — NOT A NEW ACCEPTED ADR OR ENGINEERING AUTHORIZATION.**  
**Applies to:** new Businesses using already released capabilities, new industry Modules/Solutions, any V1 platform engineering, and future country/enterprise expansion.  
**Read first:** [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) → [Core Constitution V1](../00-start-here/DRVO-CORE-ARCHITECTURE-CONSTITUTION.md) → [Accepted ADR register](../05-decisions/DECISIONS.md) → [Master Architecture Map](../02-architecture/DRVO-UNIVERSAL-ERP-ARCHITECTURE-MASTER-MAP-V1.md).

## 1. What "foundation closed" honestly means

There are **three independent closures**, do not label all of them DONE just because a constitution exists.

| Gate | Definition | Actual state on 2026-10-31 |
|---|---|---|
| **F0: Universal architecture rules** | Founder mission; seven platform laws; Business≠Industry; optional Enterprise; controlled ecosystem; verified market support; Lean Kernel vs Module ownership | **CLOSED AS APPROVED DESIGN DIRECTION** via Constitution V1, ADR-033/034/035/036/037 |
| **F1: Responsibility map and cross-layer routing** | Every new feature has a decision path: Kernel vs Shared Module vs bounded Extension vs new Domain Module vs Integration vs Industry Solution vs adjacent SaaS services/operations | **DOCUMENTED AS ONE COHERENT WORKING MAP — NOT A RATIFIED FINAL TECHNICAL DESIGN**. Kernel maps 01–04 and Master Map exist. Exact adjacent packaging still to review |
| **F2: Safe implementation architecture** | Trusted isolation mechanism, first GL/posting policy, idempotent activation, live commerce, precise release contracts, selected infrastructure & tests | **OPEN / NOT APPROVED FOR CODING**. ADR-030/031/032 remain PROPOSED. No implemented safety/performance tests |

**Meaning for founder:** DRVO now has a consistent architectural *place* to file virtually any future industry requirement. This is not proof that any arbitrary industry is ready to operate, nor permission to code a universal ERP without further decisions.

## 2. Specific founder/engineering pre-code decision backlog — in priority order

| Priority / decision | What must be decided or demonstrated | Owner of decision / review | Existing source | State |
|---|---|---|---|---|
| **P0-1 Trusted scope & authorization** | Authoritative Tenant/Business/Branch context in every protected API/worker/export/report/cache/file; permission inheritance/owner bootstrap/support break-glass and DB defense choices; negative tests | Founder + Security + Backend | [ADR-030 PROPOSED](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md), [Kernel 01](../02-architecture/PLATFORM-KERNEL-IDENTITY-TENANCY-AUTHORIZATION-BOUNDARY-V1.md), [Isolation Matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md) | **OPEN** |
| **P0-2 First POS → GL posting truth** | Choose transactionally atomic mandatory GL vs durable PENDING barrier; how monetary effects, refunds, offline and period-close reconcile without false posting, data loss, duplicate effect or unacceptable latency | Founder + Finance + Architecture | [ADR-031 PROPOSED](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md), [Financial Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md) | **OPEN** |
| **P0-3 Module activation correctness** | Agree Business-scoped immutable approved bundle/quote, concurrency/idempotency, stale plans, dependent disable protection, verified entitlement vs billing, release/extension version safety and who approves purchases | Founder + Billing + Security + Architecture | [ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md), [Kernel 02](../02-architecture/PLATFORM-KERNEL-MODULE-REGISTRY-AND-LIFECYCLE-BOUNDARY-V1.md), [Kernel 03](../02-architecture/PLATFORM-KERNEL-ENTITLEMENTS-AND-SUBSCRIPTION-BOUNDARY-V1.md) | **OPEN** |
| **P0-4 Cross-module ownership / mandatory guarantees** | For actual first selected Modules, assign source-of-truth, trusted typed contracts and event safety, idempotency, pending work, failure/rollback consequences | Module architects + Finance + Security | [Kernel 04](../02-architecture/PLATFORM-KERNEL-AUDIT-AND-CONTRACTS-BOUNDARY-V1.md), [Foundation Contracts Proposal](../02-architecture/FOUNDATION-CORE-CONTRACTS-PROPOSAL.md) | **OPEN TO TECHNICAL SIGN-OFF** |
| **P0-5 First actual release/module catalog** | Finalize Salon V1 selected released App list, real Required/Optional graph, named owning Module and constrained Extensions; differentiate customer minimum starter from full platform V1 | Product + Founder + Module owners | [Core/Extension Matrix](../02-architecture/CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md), [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md), [ADR-021](../05-decisions/ADR-021-CUSTOMIZABLE-RECOMMENDED-INDUSTRY-STARTER.md) | **OPEN; broad principles ACCEPTED** |
| **P0-6 Verified runtime, DB, offline & recovery plan** | Final SQL Server environment/edition and restoration strategy, device offline security/queues, migration/version compatibility, capacity measurement criteria, deployment/operations owners | Architecture + Security + Ops | [Technology Architecture](../02-architecture/TECHNOLOGY-ARCHITECTURE.md), [Scale Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md) | **OPEN TO DESIGN/MEASUREMENT** |
| **P0-7 Founder authorizes specific code scope** | Approved exact milestone, owners, security/finance acceptance conditions and deployment boundary; never interpret Phase-0 docs as permission to deploy | Founder | [Implementation Readiness Gate](IMPLEMENTATION-READINESS-GATE.md) | **NOT YET AUTHORIZED** |

**Not all rows can be "solved" by a founder opinion alone:** transaction latency, negative isolation tests, provider integration safety, SQL contention and recovery must be validated during an authorized engineering stage. Approval of a policy is not proof of runtime fitness.

## 3. The repeatable factory for ANY NEW industry (with clear artifacts)

This sequence is **process guidance**, building on accepted ADR-018 and the [New Industry Playbook](NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md); no market support is automatic.

| Stage | Artifact produced | Approval / stop condition |
|---|---|---|
| **0 — Intake** | Industry + target country, legal Business identity, branch/enterprise scope, intended operations and actual customer needs | Don't promise coverage before validation |
| **1 — Discovery & fit-gap** | Critical workflows, sensitive data, actors/roles, external systems, regional requirements, expected volume and acceptance criteria | Explicit unsupported/safety-critical gaps |
| **2 — Correct owner classification** | Matrix: reuse Shared Module Core / bounded Extension / independent owned Domain Module / official Integration; named source of truth | Never expand Kernel with sector-specific lifecycle; no per-client fork |
| **3 — Contracts & permission scope** | For each owner: commands/events, Tenant/Business/Branch, compatibility, audit/sensitivity and finance implications | No other Module writes the owned tables |
| **4 — Composable product** | Versioned Industry Solution offering and customizable valid Starter with Required closure, optional apps and complete pricing consent | Only reviewed released capabilities; no invisible paid dependencies |
| **5 — Country & security validation** | Eligibility evidence/limitations, local financial/regulatory/privacy review, data residency/recovery if relevant | Don't market/enable unsupported industry-country combination |
| **6 — Approved implementation & QA** | Authorized engineering scope; unit/integration/negative scope/finance/offline/replay/compatibility tests; rollback and ops evidence | No claim of correctness from documents or unrun tests |
| **7 — Repeatability check** | Onboard a **second independent Business** through released config and standard support, without code fork; document real gaps and productization | If customer-specific code fork needed, not yet a reusable Industry Solution |

**Acceptance questions for each new sector:** Could a new operator understand which Module owns the truth? Can it run at minimal required scope? Are mandatory costs visible? Are clinical/regulatory/privacy exceptions safe? Can it evolve/disable safely? Does it work for independent second customer? Is workload capacity *measured separately*?

## 4. A new BUSINESS using an ALREADY SUPPORTED Solution (not the same as a new industry)

1. Verify legal Business/Branch ownership and explicitly authorized memberships.
2. Confirm intended target country, supported Solution/release limits and tenant data placement if required.
3. Select a recommended **customizable** Starter with smallest dependency-valid Modules; distinguish Optional from Required.
4. Preview every new Required dependency and applicable charge once; obtain actual authorized approval; no inferred settlement.
5. Verify Business entitlement, module activation readiness and employee Branch/action permissions separately.
6. Configure Business-domain owned data/workflows; retain accounting/security/audit safeguards regardless of plan.
7. Validate critical end-to-end acceptance tests and record any unsupported features honestly; this is not automatically completed merely because it is a known sector.

## 5. Seven-question architectural fit card for every new requirement

| Question | Answer required |
|---|---|
| 1. Who owns the canonical data and invariant? | One named Kernel or Module owner; if multiple effects, name each with contract |
| 2. Kernel, reusable Module, Extension, new Domain, Integration or adjacent platform? | Classify with reasoning; no kitchen-sink Kernel |
| 3. Which Tenant/Business/Branch and sensitive permissions apply? | Trusted server scope, denial of unauthorized access |
| 4. Is this a released compatible capability? | Version/Required/Optional graph, governed Extensions |
| 5. How does it affect finance, history or audit? | No false payment/posting, no deletion, define correction/reconciliation |
| 6. Does it change an industry/country eligibility claim? | Document evidence and unsupported limits; qualified sign-off if applicable |
| 7. Does it work for smallest Business and scale to Enterprise after measurement? | Functional composition now; observed performance, backup and recovery separately |

Record each response as **ACCEPTED EXISTING RULE / PROPOSED DESIGN / BLOCKED BY DECISION / VERIFIED BY TEST**. Unknowns are explicit; never silently implement a proposed contract.

## 6. Stop signs / conditions for rejecting a task or PR

Reject or return for review if an agent/engineer:
- Directly accesses another Module's authoritative tables instead of declared ownership contracts.
- Introduces `if industry == salon/clinic` business lifecycle inside universal Kernel.
- Assumes all Businesses in a Tenant, or all Branches, share access by default.
- Treats a customer-uploaded Extension as privileged executable code, or third-party services as DB clients.
- Skips Required dependencies/quotes/authorization or declares a module ACTIVE with failed prerequisites.
- Claims paid/posted/settled status from unverified evidence or loses mandatory past financial history.
- Markets Clinic/GCC/enterprise capacity without industry-country/security/legal or workload evidence.
- Turns ADR-030/031/032 from proposed into "accepted" by using their schemas in a pull request without explicit sign-off.
- Starts source-code changes/SQL/server/Production based on Phase-0 documentation alone.

## 7. Minimum handoff packet to start real implementation (future)

Required before the first authorized coding milestone:
1. A bounded exact first-release work package (e.g., approved Kernel Identity boundary + named minimal modules), with one accountable owner per domain.
2. Explicit founder/technical disposition of ADR-030/031/032 for in-scope paths; unresolved details labeled conditional and excluded if outside scope.
3. Signed decisions on essential API/data/permission/financial contracts, initial SQL/worker/offline safety and reliable backup/rollback.
4. Named acceptance tests and load/security targets appropriate to claimed scale, plus actual later test evidence.
5. Clearly scoped authorization to code, test and deploy; Production requires its own separate gate.

**Final disposition (2026-10-31):** **F0 closed, F1 documented and under design review, F2 open**. We have a strong reusable architectural map and clear next decisions, **not** a working universal ERP. This checklist adds no new ADR and authorizes no code, SQL, CI, VPS, staging, Production or marketing claims.

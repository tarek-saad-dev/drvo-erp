# Start here — project handoff

> **2026-11-14 P4-D SOURCE PROOF:** [#132](https://github.com/tarek-saad-dev/drvo-erp/pull/132) merged at `8d0e20ff925af80c01d51089aa5c34e4026d55ee`. Existing SQL2022/Nest HTTP disposable CI proves direct SQL SELECT/INSERT/UPDATE/DELETE/ALTER/CONTROL denial on 8 Catalog/Customers/Booking/POS tables for the *test* stage runtime principal, direct SELECT raises 229, public domain stored procedure EXECUTE-only, internal guard EXECUTE denied. K0/K1/Shared Booking SQL/Salon Browser **4/4 PR PASS**, post-merge K0/K1/Shared Booking SQL/Salon Browser/Staging Artifact **5/5 main PASS**. [#133](https://github.com/tarek-saad-dev/drvo-erp/pull/133) is **OPEN; S12 real UI mutation browser work not yet accepted**. **All P1–P7/C1–C3 remain OPEN/NO-GO** in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106): no independently authorized VPS SQL010–017, P1 root K5F, P2 encrypted off-host recovery, P3 external security, P5 real release/market/audited scoped grants, P6 authorized live staging Owner/Staff/browser or P7 signoff. No deployment approval, Public Auth, real customer PII or finance POSTED.


> **2026-11-14 LATEST SALON S11 — REAL DISPOSABLE BROWSER + SQL (NOT LIVE PILOT):** [PR #130](https://github.com/tarek-saad-dev/drvo-erp/pull/130) MERGED `79a57494a22a857b39816039b442889d2f491e4b`: Chrome browser → production-built Next → K5 Nest → disposable SQL2022, separate privileged synthetic Scheduler and read-only Staff, persisted branch data, POS rights denial, foreign scope and anonymous rejection; **10/10 exact-PR CI PASS**, 36 Booking SQL/HTTP checks. Browser exposed and fixed real case-sensitive UUID comparison bug in Salon Overview with strict validated GUID equality. Tests on throwaway environment only; **not** a real Owner or authorized VPS browser. [S11 proof](../04-execution/SALON-S11-DISPOSABLE-CHROMIUM-SQL-BROWSER-2026-11-14.md). **NO-GO:** P1–P7 and paid C1–C3 remain OPEN in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106); real independently witnessed P1 K5F, P2 encrypted off-host recovery, P3 external network/Identity, separately approved P4 VPS SQL010–017, independently trusted and audited real P5 rights, actual authorized staging P6 and P7 Founder/Security signoff remain required. No VPS SQL, Public Auth, production entitlements, real customer records or finance POSTED executed.


> **LATEST 2026-11-14 S10 P6-PREPARATION + PRIVATE UI FIX:** [#127](https://github.com/tarek-saad-dev/drvo-erp/pull/127) merged a separate synthetic read-only K5 Staff session in *real disposable SQL Server 2022/Nest HTTP*, including denied writes/cross-scope access and immediate Role/Branch/Session revocation (K0/K1/Shared Booking CI **3/3 PASS**). [#128](https://github.com/tarek-saad-dev/drvo-erp/pull/128) fixed a malformed four-group UUID regex blocking legitimate Salon Overview Business/Branch/Offering IDs; added regression and default-OFF private /salon 404 smoke (**9/9 PR CI PASS**). Latest product main `9ced7f2648f2dac33db49506b7f71296684dc7aa`. These are source/disposable tests, NOT real Owner authentication or live browser. **NO-GO remains:** P1–P7 and commercial C1–C3 in [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) remain OPEN. CI is not actual VPS K5F, off-host disaster recovery, external proxy security, authorized SQL 010–017, real release/grant or a live private browser acceptance. No SQL/Auth/grants/deployment authorized.


> **LATEST 2026-11-14 P5 SOURCE + OPERATOR HANDOFF:** [#124](https://github.com/tarek-saad-dev/drvo-erp/pull/124) merged review-only production trust-anchor acceptance and [#125](https://github.com/tarek-saad-dev/drvo-erp/pull/125) merged standalone **synthetic-only** key-snapshot comparison, expiry/revocation/issuer separation and negative tests (K0/K1 PASS). The caller-supplied snapshot is NOT independently enrolled trust; no release/rights/publishing/runtime change. Real parallel operator reviews: [P1 #121](https://github.com/tarek-saad-dev/drvo-erp/issues/121), [P2 #122](https://github.com/tarek-saad-dev/drvo-erp/issues/122), [P3 #123](https://github.com/tarek-saad-dev/drvo-erp/issues/123). **NO-GO:** All P1–P7 Private Salon Pilot gates + C1–C3 paid gates in [#106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) remain OPEN. No production key enrollments, market release, K5 grants, public login, real customer PII, VPS SQL 010–017, live off-host recovery or external K5F/network acceptance were performed. See [P5-C](../04-execution/P5C-SYNTHETIC-TRUST-ANCHOR-BOUNDARY-2026-11-14.md). Earlier dated notes are historic.


> **2026-11-14 P4/P5 READINESS UPDATE + PARALLEL OPERATOR HANDOFF:** [#118](https://github.com/tarek-saad-dev/drvo-erp/pull/118) merged offline fail-closed SQL post-`017` history checksum reviewer; does **not** change root-owned K5F `001–009` or apply SQL. [#119](https://github.com/tarek-saad-dev/drvo-erp/pull/119) merged two-key Ed25519 Publisher+Market **synthetic/untrusted** signature test; no production trust anchors or released Module. [P1–P3 operator parallel handoff](../04-execution/SALON-OPERATOR-P1-P3-PARALLEL-HANDOFF-2026-11-14.md) specifies independently witnessed tasks, not authorization to operate. **All 7 first Salon Pilot gates remain OPEN**, +3 for paid. No VPS SQL010–017, Public Auth, actual private grants or real customer accounts. Older text below is historic.


> **2026-11-14 P4/P5 PARALLEL SOURCE PROOF (NO LIVE PILOT):** SQL [PR #115](https://github.com/tarek-saad-dev/drvo-erp/pull/115) merged **real disposable SQL Server 2022 K5F 001–009 → 010–017** with restricted migrator, checksum-validated pre-010 backup restore and separate post-017 restore. P5 [PR #116](https://github.com/tarek-saad-dev/drvo-erp/pull/116) merged **pure synthetic CAS/idempotency/revocation planning**; no actual grant, transaction, audit write or runtime use. These are source/CI tests only; **not** independent VPS K5F, offhost restore, private entitlement or live migration signoff. **7 restricted Salon Pilot gates remain open** in [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106), and 3 additional for paid Salon. [P4 CI plan](../04-execution/P4-009-017-DISPOSABLE-MIGRATION-RESTORE-PROOF-2026-11-14.md) · [P5 model](../04-execution/P5B-PILOT-GRANT-CAS-IDEMPOTENCY-2026-11-14.md).


> **2026-11-14 OPTION A GITHUB-ONLY DELIVERY (STILL NO LIVE PILOT):** Founder selected Option A for non-commercial Pilot *engineering*, [P5 policy simulation #112](https://github.com/tarek-saad-dev/drvo-erp/pull/112) merged (strict synthetic-only Tenant/Business/Branch action, expiry, revocation and audit preview; **never grants actual access**). [P3 offline Network/Origin reviewer #113](https://github.com/tarek-saad-dev/drvo-erp/pull/113) merged (untrusted reported evidence **not** external security attestation). **P1–P7 all still OPEN** in [Issue #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106), C1–C3 extra for paid. No real release trust anchor, SQL010–017 on VPS, Public Auth, K5F independent root proof, backup restore or real Salon accounts. New [P5A boundary](../04-execution/P5A-SYNTHETIC-PILOT-ACCESS-CONTRACT-2026-11-14.md) and [P3 boundary](../04-execution/P3-NETWORK-SECURITY-OFFLINE-REVIEW-2026-11-14.md) supersede dated prior Pilot rights proposal status.


> **2026-11-14 SALON PARALLEL READINESS SOURCE UPDATE:** K5F-3 [#108](https://github.com/tarek-saad-dev/drvo-erp/pull/108) merged guard for K6C/SC-0/SC-1 OFF flags (not a live K5F attestation), P2 local isolated-restore evidence reviewer [#109](https://github.com/tarek-saad-dev/drvo-erp/pull/109) merged (not a restore), and P5 non-commercial Pilot rights **proposal only** [#110](https://github.com/tarek-saad-dev/drvo-erp/pull/110) merged (no grant). **Issue #106 still has 7 OPEN Pilot gates + 3 paid gates**; all VPS SQL 010–017 and Public Auth remain unauthorized. Read [current state](CURRENT-STATE.md) before acting; older snapshots below are historical.


> **2026-11-14 SC-0 / SC-1 MERGED + FIRST SALON NO-GO:** ADR-032 ACT-01–07 V1 baseline recorded in #103; verified-read-only Release Registry #104 and private UNQUOTABLE preview #105 merged into main `98470283d7e239567f71e56417f9e9def7130450`. These produce no real publication/entitlement. **[7 restricted Pilot gates + 3 full paid Salon gates](../04-execution/SALON-FIRST-REAL-CUSTOMER-GATES-2026-11-14.md) remain**. SQL 010–017 on VPS, K5F root/offhost restore, K5 public auth, real customer activation and ADR-031 POSTED remain OPEN/unauthorized. Older S9/Phase 0 paragraphs below are dated historical snapshots.

> **CURRENT HANDOFF OVERRIDE — 2026-11-14 S9:** Source `5fd770aa39b52fd3b7621fc5bcf6d78b053e3a46` merges #99 scoped private Booking Customer search (within independently granted max-200 Customers), #100 fake public Salon Demo half-hour duration-aware booking, #101 nonauthorizing bounded Pilot remediation punch list. The old Phase-0 “not started” lines below are archival. Start with [CURRENT-STATE](CURRENT-STATE.md), [ARCHITECTURE](../02-architecture/ARCHITECTURE.md), [ROADMAP](../04-execution/ROADMAP.md), [S9 integrated](../04-execution/SALON-S9-INTEGRATED-DELIVERY-2026-11-14.md). SQL 010–017 VPS NOT approved, Public Auth and Business activation OFF, K5F/offhost restore and ADR-031/032 OPEN.

> **CURRENT HANDOFF OVERRIDE — 2026-11-14 S8:** S8 merged product #95–#97 as main SHA `94a3f46ab171b84c691e409d13480e6521bd7f48`: private Shared Booking safe two-step close→publish correction, public synthetic guided Salon Demo and **non-executed** conditional Owner/Staff browser review matrix. The archived Phase-0 text further below is historical and MUST NOT be treated as the implementation status. For actual code and release gates read [CURRENT-STATE](CURRENT-STATE.md), [ROADMAP](../04-execution/ROADMAP.md) and [S8 handoff](../04-execution/SALON-S8-INTEGRATED-DELIVERY-2026-11-14.md). VPS SQL 010–017 not authorized, Public Auth and paid flags OFF, K5F/offhost restore, ADR-031/032 OPEN.

> **2026-11-11 ADR-030 BASELINE APPROVED / K6C LIMITED IMPLEMENTATION:** Founder approved trusted server-side Tenant/Business/Branch scope, Default Deny, scoped SQL predicates/referential integrity and negative isolation tests, with SQL Server RLS deferred to separate review. The K6C read-only Business candidate registry is authorized on a GitHub feature branch and PR only; **no Public Auth activation or VPS SQL migration**. See [ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) and [K6C review](../04-execution/K6C-SCOPED-BUSINESS-MODULE-CANDIDATES-2026-11-11.md). Historical 2026-10-30 PROPOSED references below are preserved as dated history; ADR-031/032 remain proposed.

> **NEW ACCEPTED PLATFORM LAW — ADR-034:** [Optional Enterprise Organization](../05-decisions/ADR-034-OPTIONAL-ENTERPRISE-ORGANIZATION-STRUCTURE.md). Keep Tenant→Business→Branch as the simple default while supporting future Enterprise group relationships independently of legal books, Branch ownership and permission grants. Only CONST-03/04 remain OPEN.

> **LATEST ACCEPTED CONSTITUTION DECISION (ADR-033):** [Business identity is independent of Industry](../05-decisions/ADR-033-BUSINESS-IDENTITY-INDEPENDENT-OF-INDUSTRY.md): one Business may mix compatible industry activities; create separate Businesses for real legal/financial ownership boundaries, not industry labels. Two other general platform questions remain proposals in the [Foundation Policy Brief](../02-architecture/CORE-CONSTITUTION-REMAINING-FOUNDATION-POLICIES.md). No code authorization.

> **CURRENT PHASE-0 FOCUS: PLATFORM CONSTITUTION, NOT PER-MODULE DESIGN.** Read [Founder Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) **then** [DRVO Core Architecture Constitution](DRVO-CORE-ARCHITECTURE-CONSTITUTION.md). Seven universal platform rules govern; specialist POS/Accounting/Tender/Activation draft contracts are parked until their relevant Module work. This supersedes their priority as the **immediate work queue**, NOT existing founder-approved business decisions. No app code authorized.

> **READ FIRST — FOUNDER'S NON-NEGOTIABLE 3-PILLAR ARCHITECTURE CHARTER:** [DRVO ERP Project North Star](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md). All future Modules, Industry Solutions, pricing and infrastructure architecture must pass its universal-industry / micro-to-enterprise / Egypt-scale review. The mission is design intent, not a proven capacity claim. [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md).


**Project:** DRVO ERP  
**Baseline date:** 2026-10-27  
**Phase:** 0 — documentation / architecture  
**Implementation:** not started

DRVO ERP is a new multi-tenant, multi-industry, modular ERP SaaS product. Cashier POS remains separate and operational; useful features may be adapted after review. DRVO's UI direction is **inspired by Odoo**, not a verbatim copy.

The initial implementation strategy is a **modular monolith** with a shared POS core and optional industry extensions. Salon is the first vertical, **medical Clinic is the second approved direction** (superseding the obsolete Retail-second plan); medical data/compliance requirements need separate discovery.

## Handoff checklist

Before planning or coding, read:
- **[Founder Architecture Charter — FIRST](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md)**
- **[DRVO Core Architecture Constitution — SECOND](DRVO-CORE-ARCHITECTURE-CONSTITUTION.md)**
- **[Universal ERP Scale & Industry Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md)**
- [Current state](CURRENT-STATE.md)
- [Architecture](../02-architecture/ARCHITECTURE.md)
- [Decisions](../05-decisions/DECISIONS.md)
- [Open questions](../04-execution/OPEN-QUESTIONS.md)
- [Roadmap](../04-execution/ROADMAP.md)
- [Modules](../03-modules/MODULES.md)

Before editing: identify impacted docs, tests and architecture. After editing: update status, changelog, ADR(s), roadmap and implementation evidence as appropriate. Never claim deployment without verification.

**Repository:** https://github.com/tarek-saad-dev/drvo-erp


## Phase-0 foundation review — 2026-10-30 (MANDATORY before implementation)

Before treating the current architecture as build-ready, read the [Foundation Architecture Gap Review](../02-architecture/FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) and [Core Contracts Proposal](../02-architecture/FOUNDATION-CORE-CONTRACTS-PROPOSAL.md). The founder charter direction is accepted, but tenant-scoped resource/worker isolation, POS first journal consistency, atomic dependency/paid activation, Module compatibility and enterprise workload proof are NOT yet finalized or tested. Review findings are proposals/risks, not production bugs or approved schemas. No code is authorized.


## Tenant Isolation first security design gate — 2026-10-30

Read the [Tenant/Business/Branch Isolation Contract](../02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md), [40 negative threat and test scenarios](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md), and [PROPOSED ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) before any scoped API/SQL/worker implementation. Approved product-level identity and default-deny roles are preserved, but detailed FK/RLS, Support/Manager delegated powers and data movement are not yet signed off. **No code or security tests performed.**


## P0 Financial Source-of-Truth Gate — 2026-10-30

Before implementing POS, Accounting, Treasury, Inventory, HR commissions or offline financial sync, read [Financial Consistency Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md), [46 Failure/Recovery Tests](../02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md), and [ADR-031 (PROPOSED)](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md). The first mandatory POS GL journal **A atomic vs B durable pending** is still unresolved; no single `POSTED/PAID/RECONCILED` shorthand and no customer screenshot as provider settlement. Founder product rules ADR-009–013 remain binding but no code/testing authorized.


## Financial journey — mandatory before any implementation (2026-10-30)

New [End-to-End Sale-to-Ledger Design](../02-architecture/SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md) traces one authorized POS operation through typed Sales/Accounting boundary, deterministic replay, Outbox Stock/HR/Treasury obligations, distinct receipt/GL/payment/cost statuses, refunds and offline/late-period reconciliation. [Tender Mapping & Close Gate Review](../02-architecture/FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md) **does NOT approve any chart of accounts, tax accounting or final posting policy**. ADR-031 remains proposed; Option A vs B needs formal founder/accountant/architect review. No code or tests.


## Next platform foundation: Business-scoped Module Activation Engine — 2026-10-30

**Read before any registry, billing/entitlement, Apps catalog, activation/disable/upgrade or Industry Solution code:** [Module Activation Dependency Contract](../02-architecture/MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md), [50 Concurrency & Failure Tests](../02-architecture/MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md), [ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md). The founder-approved required full-bundle priced preview/one consent is NOT blanket authorization to implement the proposed state machine, paid approver roles, payment policy or specific Salon graph. Financial first GL A/B is additionally gated by [Atomicity/Performance Decision Gate](../02-architecture/FINANCIAL-ATOMICITY-DECISION-GATE.md), and remains OPEN. No implementation/testing authorization.


## Core Constitution high-level review — current work (2026-10-30)

Read [Consistency Review 01](../02-architecture/CORE-CONSTITUTION-CONSISTENCY-REVIEW-01.md) and [Four-Scenario Stress Review](../02-architecture/CORE-CONSTITUTION-FOUR-SCENARIO-STRESS-REVIEW.md) before investigating specialist Modules. The seven laws align with reviewed founder-accepted architecture ADRs as a **direction**, the earlier four-question snapshot now has **CONST-01 RESOLVED by ADR-033 (multi-industry one Business)**, with **CONST-02 also resolved by accepted ADR-034**; only Extension ecosystem governance and industry/country verified eligibility remain open. Preserve existing decisions; do **not** prematurely accept implementation designs or claim operational tests were run.

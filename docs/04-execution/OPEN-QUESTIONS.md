# Open questions — unresolved only

| ID | Open decision | Priority |
|---|---|---|
| OQ-001 | Backend/frontend framework and TypeScript structure | High |
| OQ-002 | SQL engine, ORM/query tooling and migrations | High |
| OQ-003 | Tenant isolation strategy and cross-tenant integrity guarantees | High |
| OQ-004 | Ownership of subscriptions and entitlements | High |
| OQ-005 | Hosting, staging, environments and secrets | High |
| OQ-006 | Salon MVP and legacy Cashier migration/coexistence/rollback | High |
| OQ-007 | Identity and invitations | Medium |
| OQ-008 | Offline PWA POS, device/printing support and sync | High |
| OQ-009 | Final ERP module capability map vs integrations / MVP cut | High |
| OQ-011 | Which Gulf countries first, and required regulatory, tax, language and payment support for concurrent Egypt + Gulf launch? | High |
| OQ-012 | PWA offline capability, stakeholder portal timing and later native-app requirements | High |
| OQ-013 | Mandatory Core + Extension contracts for **every** module: interface, packaging, lifecycle and dependency rules | High |
| OQ-014 | Measurable 3-month/12-month customer benefit targets | Medium |
| OQ-015 | Target branches/users/transaction volume | High |
| OQ-016 | Must-have Odoo capabilities vs DRVO additions | Medium |
| OQ-017 | After barber salons then medical clinics, when do beauty/aesthetic and supermarket editions launch? | Medium |
| OQ-018 | Clinic clinical data scope, privacy, compliance and safe release criteria | High |
| OQ-019 | Cut Salon pilot date, scope, transition and operational rollback | High |

## MVP Round 2 unresolved scope / delivery

| ID | Open decision | Priority |
|---|---|---|
| OQ-020 | One-month target feasibility: team, resources, delivery scope, acceptance gates | Critical |
| OQ-021 | Distinguish limited pilot, replacement parity, and first external commercial sale | Critical |
| OQ-022 | Offline POS writes, sync conflicts, payment processing, stock and journal posting | Critical |
| OQ-023 | Parallel operation: per-entity system of record and duplicate prevention | Critical |
| OQ-024 | Full general ledger design/requirements vs operational cash summaries | Critical |
| OQ-025 | Full existing HR parity checklist and dependencies | High |
| OQ-026 | Subscription payment provider(s), invoicing and operational billing | High |
| OQ-027 | Receipt printing postponed: pilot process and replacement acceptance | High |
| OQ-028 | Pilot date/branch, data migration strategy, booking concurrency test | Critical |
| OQ-029 | Arabic-first vs Gulf-market localization and compliance at simultaneous launch | High |

See [MVP Discovery Round 2](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Resolved from founder follow-ups (2026-10-28)

- Former OQ-010 second industry: **medical clinics**, after barber salons.
- Comprehensive ERP ambition, delivered in stages.
- Egypt and Gulf both in initial commercial launch strategy.
- Responsive Web / PWA for first release.
- Core + Extension mandatory for every module.
- Cut Salon is first pilot.

[Source answers](../01-product/DISCOVERY-01-FOLLOWUPS.md). Record detailed architecture choices in ADRs before implementation.

## MVP clarification resolutions (2026-10-28)

- OQ-020 partly resolved: team = founder + Cursor; one-month target flexible. Detailed estimate remains open.
- OQ-021 partly resolved: **one comprehensive commercial V1**, with testing and all-branch validation gates (not separate commercial releases). Exact acceptance criteria open.
- OQ-022 partly resolved: offline POS cash sales only, sync later. Conflict/idempotency/accounting specifications still open.
- OQ-023 partly resolved: DRVO authoritative for bookings. Legacy Cashier integration and write lockout still open.
- OQ-024: **full GL accounting required in V1**; detailed accounting model remains open.
- OQ-026 partly resolved: subscription collections manual initially; gateway deferred. Entitlements/reconciliation unresolved.
- OQ-028 partly resolved: all Cut Salon branches included in initial validation; phased activation and rollback remain open.

[Release strategy decision](../01-product/MVP-RELEASE-STRATEGY.md).


## Final MVP clarification resolutions — 2026-10-28

- Existing Cut Salon public booking website stays; integrate it with DRVO's new Booking API. Migration, cutover and fallback remain OQ-023.
- Offline cash sales are accepted despite post-sync stock shortages; create a reviewable stock discrepancy. Negative-stock rules, valuation and reconciliation remain OQ-022.
- Accounting manual vs automatic journal-entry workflow is **unresolved**, to be decided during detailed Accounting Module discovery (OQ-024). Full accounting remains in commercial V1.
- Internal tests during development are allowed; **one comprehensive commercial launch** after acceptance, not separate public MVP stages (OQ-021).

## Tenancy discovery — unresolved details (2026-10-28)

| ID | Unresolved issue | Priority |
|---|---|---|
| OQ-030 | Business transfer between Tenants: prohibited or controlled migration? | Medium |
| OQ-031 | Business partner shares and ownership model | Medium |
| OQ-032 | Module dependency policy (recommended DAG/explicit required and optional dependencies, awaiting approval) | High |
| OQ-033 | SaaS branch/user/module limits and expired subscription workflow | High |
| OQ-034 | Tenant/Business export and portability policy | Medium |
| OQ-035 | Per-entity deletion, retention, audit and legal rules | High |
| OQ-036 | Business-level currency/timezone/language vs multi-country Branch needs | High |
| OQ-037 | Tenant-qualified username uniqueness, identity and recovery | High |
| OQ-038 | Manager-only finance visibility: Owner/Super Admin exceptions | High |
| OQ-039 | Cross-Business consolidated financial reports, accounting periods and currency conversion | High |
| OQ-040 | Branch-to-Branch transfer approval/posting and inter-branch finance rules | High |

Founder decisions: [Tenancy Discovery](../01-product/TENANCY-DISCOVERY-ROUND-3.md). Architecture blueprint: [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md).

## Tenancy final follow-up (2026-10-28)

- OQ-032 remains **open**, explicitly awaiting Module Dependencies design discussion and founder approval.
- OQ-036: founder approved Business-only settings, no Branch overrides. Unresolved risk: Businesses spanning countries/timezones/currencies.
- OQ-038: Manager access to profit/cost is always granted **inside authorized management scope**. Exact owner exceptions and scope-to-role matrix still require documentation.

## Identity & Access discovery unresolved — 2026-10-28

| ID | Open decision | Priority |
|---|---|---|
| OQ-041 | Explicit Deny permission semantics versus default-deny Allow-only system | High |
| OQ-042 | Manager privilege delegation, role creation scope and escalation prevention | Critical |
| OQ-043 | Tenant/Business role precedence, inherited scopes and one-Role-per-Branch merging | Critical |
| OQ-044 | Tenant signup, first Business membership bootstrap, verified recovery email and invitation | Critical |
| OQ-045 | Session revocation on next protected API request; refresh token/session architecture | Critical |
| OQ-046 | Email OTP expiration, throttling, recovery and first-login credential enrollment | High |
| OQ-047 | Temporary permission delegation after role matrix design | Medium |

Approved: global username uniqueness, username/password login, self-registration, manager-account creation, explicit Owner Business membership, one Role/Branch, email OTP reset, mandatory first-login password change, revoke on refresh intent. [Identity & Access](../02-architecture/IDENTITY-ACCESS.md).

## RBAC matrix unresolved (2026-10-28)

- OQ-041: founder requests illustrative comparison before Allow-only vs explicit Deny decision.
- OQ-048: user QR discount: user is discount issuer, discount recipient or both; what determines final percentage/amount and role cap?
- OQ-049: QR security: revocable card tokens, second-factor/manager sign-off and audit rules (proposal only).
- OQ-050: manager may create/edit Roles but not grant equal Manager Role without Owner; define effective privilege ceilings.
- OQ-051: refund amount tiers, void permissions, closed-day reopening and journal reversal semantics.
- OQ-052: expenses, accounting entries, salaries, advances, stock transfer, price changes, booking, approvals, protected permissions still unanswered (questions 11–20).

[RBAC Discovery](../02-architecture/RBAC-MATRIX.md).

## QR / permission follow-up (2026-10-28)

- OQ-041 **resolved**: founder approved Allow-only + Default Deny. No explicit Deny in V1.
- OQ-048 **open**: QR card usage differs from suggested staff-authorizes-discount/personal-discount options; founder explanation required before designing feature.
- OQ-049 **partially resolved**: QR card for owner only with additional verification; exact authentication, revocation, credential/storage and abuse protection remain open.
- Discount Engine design and precedence vs Role limits remain **open**.

## POS and salon discovery open items (2026-10-28)

- OQ-053: Service has one executor but manager can split revenue and commission among multiple beneficiaries. Distinguish credited sales, targets, payroll and actual cash ledger; rules and percentages open.
- OQ-054: Draft invoice lifecycle, lock/resume, booking/stock reservations, offline behavior.
- OQ-055: Temporary catalog line review plus tax, inventory and accounting mapping.
- OQ-056: Split payments, credit-limit authorization, settlements, refunds and partial balances.
- OQ-057: Cash-only Offline POS sales require open shift; local shift availability and reconciliation.
- OQ-058: Correction documents and adjustment policy for immutable paid invoices.

[POS Discovery Round 1](../03-modules/POS-DISCOVERY-ROUND-1.md).

## POS payments / refunds / attribution discovery (2026-10-28)

- OQ-059: Custom payment method settlement, reconciliation and restrictions.
- OQ-060: Credit limit atomic checks, mixed cash/receivable payments, partial collection and aging.
- OQ-061: Refund by item or arbitrary amount, to tender/customer credit, preventing over-refunds and refunding unpaid debt.
- OQ-062: Tips distinct from service revenue: payroll/payable, allocation, refund and reporting.
- OQ-063: Manager approval for over-limit refunds: authorization workflow and thresholds.
- OQ-064: Automatically reverse target/commission on refund if earned, posted or paid; correction periods undecided.
- OQ-065: Service executor vs revenue/commission share mechanics and whether total shares equal 100%; HR to set attribution rules.
- OQ-066: Financial day reopening deferred to Accounting Module.

[POS Discovery Round 2](../03-modules/POS-DISCOVERY-ROUND-2.md).

## POS Round 3 unresolved — 2026-10-28

- OQ-067: Founder to describe one-executor / multiple-attribution-beneficiaries scenario; 100% share rule remains unknown.
- OQ-068: Shared Branch treasury with separate cashier shifts: cash custody, overlapping shifts, shortage attribution and evidence.
- OQ-069: Manager post-payment service attribution adjustments vs immutable invoice, HR and accounting.
- OQ-070: Cash shortfall charged to cashier and surplus described as sales income: investigate, approve, lawful employee recovery, and distinguish cash variance from verified sales/tax revenue.
- OQ-071: Financial day may close with active shifts; late-shift and offline sync settlement policy.
- OQ-072: Offline cash sale same shift; closing shift with pending unsynced transactions unresolved.
- OQ-073: Treasury transfers deferred; Tips credited to Employee Ledger (payout timing/settlement unresolved).

[POS Discovery Round 3](../03-modules/POS-DISCOVERY-ROUND-3.md).

## POS Round 4 follow-ups (2026-10-28)

- OQ-074: Shared branch treasury shortage allocated to last employee receiving cash; need custody handover proof, shared access rules, investigation and deduction approval.
- OQ-075: Founder wants surplus immediately labeled sales income; unresolved accounting/legal classification as true sales versus cash variance.
- OQ-076: Day close with open shifts: workflow and provisional/final adjustments unresolved.
- OQ-077: Business setting for multiple concurrent shifts; overlaps, cash custody and reconciliation.
- OQ-078: Offline original sale date plus post-close adjustment: financial/tax period policy and distinct posted_at vs occurred_at.
- OQ-079: Manager edits approved cash adjustment: preserve version/reversal audit and immutable posted journals.
- OQ-080: Salon opener upsell commission **10% for Mohamed**, while Youssef executes skin care and owns its target. Commission calculation base, stacking and refunds unsettled; prior 70/30 arbitrary revenue split not adopted.

[POS Discovery Round 4](../03-modules/POS-DISCOVERY-ROUND-4.md).

## POS state / shift specification — 2026-10-28

**Resolved founder decisions:** opener commission 10% on post-discount pre-tax service value, one opener, opener ≠ executor, automatically reverse on refund; cash surplus to variance then verified reclassification; approved settlements corrected via new linked entry preserving original.

**Still open:** rounding and partial refund commission reversal, employee commission plan interaction, financial-day closure finality, shift close with offline pending sales, signed custody chain, staff shortage liability approval, event/API/DB contracts, credit/refund ledger exact accounts and discount policy.

Design drafts: [POS State Machine](../03-modules/POS-STATE-MACHINE.md) and [Shift Lifecycle](../03-modules/SHIFT-LIFECYCLE.md). Their proposed state names and implementation choices are **not approved** merely by documenting them.

## Offline POS discovery — 2026-10-28

- OQ-081: Earlier cash-only Offline POS conflicts with latest all-payment-methods request. Decide supported tender type per offline capabilities, external terminal proof and provider confirmation.
- OQ-082: Should pending external gateway authorization create a draft, pending sale or posted receivable; prevent false PAID.
- OQ-083: Offline local login TTL, device trust, revocation during outage and encrypted credential storage.
- OQ-084: Offline corrected/cancelled sale permissions, immutable cash history, sync ordering.
- OQ-085: Closing cashier shift and counting physical cash when device queues remain unsynced; day finality.
- OQ-086: Duplicate sale idempotency, failed synchronization retry/review and manager pending-device dashboard.
- OQ-087: Lost POS device queue disaster recovery and limits of backup.
- OQ-088: Offline credit limit enforcement cannot be assumed safe across independent devices; online reservation or offline credit disabled pending decision.

[Offline founder responses](../03-modules/OFFLINE-POS-DISCOVERY-ROUND-1.md) · [Sync Spec](../03-modules/OFFLINE-SYNC-SPEC.md) · [Shift Closing](../03-modules/SHIFT-CLOSING-WORKFLOW.md).

## Offline POS follow-up decisions — 2026-10-28

- OQ-085 **partially resolved**: founder approved provisional *shift* close with pending sales and final reconciliation; all received offline cash included in count. Detailed day closing policy remains undecided.
- OQ-086 **partially resolved**: automatic retries then Manager error display approved; idempotency required to avoid duplicate financial events, exact retry escalation unresolved.
- OQ-081/OQ-082 **OPEN**: electronic tenders without provider confirmation. No assumption of offline card/gateway settlement.
- Remaining: scope of offline credit, queue-loss recovery, session TTL/revocation, terminal evidence, final exception resolution, finality of business-day close.

See [Offline Sync](../03-modules/OFFLINE-SYNC-SPEC.md) and [Shift Closing](../03-modules/SHIFT-CLOSING-WORKFLOW.md).

## Offline day-close follow-up (2026-10-28)

**Founder-resolved:** Day close with open shifts or pending offline sales is **provisional until final reconciliation**. Lost local POS queue/device handled via incident report + **manual physical cash reconciliation**, without assumed restoration. Payment providers to be evaluated **one payment method at a time** (unresolved).

**Open:** criteria for formally resolving a lost-device exception; late period tax/journal adjustments; specific card/terminal/wallet/transfer/gateway tender states; offline credit risk; cached login expiry; exact API schemas/database platform; cash handover and cross-device visibility; pending-payment handling on final close.

New design drafts: [Offline API Contracts](../03-modules/OFFLINE-API-CONTRACTS.md), [Offline Database Design](../03-modules/OFFLINE-DATABASE-DESIGN.md).

## Founder decision — 2026-10-29: payment selection availability

All payment methods configured for a Business must remain visible and selectable in POS both online and offline. Do not gate or hide a method merely because connectivity is lost. Founder explicitly skipped per-payment-method discovery for now.

Selecting a method is NOT equivalent to receiving or verifying funds. Cash may be recorded locally as received; provider-dependent payments must retain an unverified/pending reconciliation status until reliable confirmation or evidence exists. Never manufacture provider authorization, and never post pending electronic payment as settled cash. Payment selection UI availability is APPROVED; exact provider confirmation and settlement semantics are technical design work, not additional UI selection questions.


## POS technical design follow-up (2026-10-29)

Drafts created: [POS Data Model](../03-modules/POS-DATA-MODEL-V1.md), [Accounting Events](../03-modules/POS-ACCOUNTING-EVENTS.md), [Module Integrations](../03-modules/POS-MODULE-INTEGRATIONS.md). Open decisions: selected SQL engine/ORM, taxes, chart of accounts and posting policy, offline credit, provider confirmation, inventory reservation, rounding, payroll reversal timing and Module Dependencies. No source code/schema deployed.


## Accounting Core discovery (2026-10-29)

- Accounting hierarchy nesting depth OPEN; posted GL entries must balance debits/credits as an integrity invariant even though founder did not explicitly decide.
- Business-configured reports: required minimum list TBD; Tenant consolidation currency conversion TBD.
- Permission to reopen monthly/yearly periods approved; control and actor policy still TBD; posted entries remain immutable, corrected via linked reversing journal.
- Sensitive-only Audit Log policy approved, while immutable financial source/provenance must still be retained.
- See [Accounting Core](../03-modules/ACCOUNTING-CORE-SPEC.md), [Chart of Accounts](../03-modules/CHART-OF-ACCOUNTS.md).


## Treasury discovery — 2026-10-29

Confirmed one treasury per Branch; bank accounts at Business and Branch levels; approved and logged Manager-authorized transfers; expenses paid via bank or cash, with Manager approval for large expenses; bank reconciliation deferred; outside-sale cash movements logged; Manager balance visibility under independent permission. Open: large-expense amount thresholds, cross-Business transfers, account-level permissions and transfer reconciliation. [Treasury Core](../03-modules/TREASURY-CORE-SPEC.md).


## HR and Commission Engine — 2026-10-29

Founder approved per-employee flexible pay, configurable execution commission/target rules, different opening commission by service and user (supersedes universal 10% rate, preserves after-discount pre-tax basis), separate per-Branch targets, daily accrual/monthly close, advance offset, early payouts treated as advances, Business-configured negative balances, auditable historical adjustments and Owner/permissioned Manager payroll approvals. Open: rate precedence, lawful advance deductions, rounding, bonus targets, Branch assignment, payroll post-close refund adjustments. Cash-shortage deduction still requires separate approval. [HR Commission](../03-modules/HR-COMMISSION-ENGINE.md) · [Employee Ledger](../03-modules/EMPLOYEE-LEDGER.md).


## Inventory & Purchasing discovery (2026-10-29)

Founder approved Branch-scoped inventory and inter-Branch transfers, automatic service Recipe consumption, Business-configured valuation, negative stock with alert/review, direct purchase and receipt (no mandatory PO), Business-shared suppliers, supplier returns, full/partial stocktake, Manager-approved adjustments, reorder warnings in V1; Batch/Expiry deferred beyond V1. **Cross-Business transfers remain UNDECIDED**. Outstanding: valuation method choices/cost layers, recipe and return consumption rules, negative-stock costing, purchasing payments and taxes, transfer approvals. [Inventory](../03-modules/INVENTORY-CORE-SPEC.md) · [Purchasing](../03-modules/PURCHASING-CORE-SPEC.md).


## Architecture readiness review — 2026-10-29

Review identified seven production-critical design gates: offline credit, electronic tender posting, inventory costing with negative quantities, late postings and closed periods, module dependencies, employee/service commission rule precedence, and DB/runtime stack. All configured payment methods remain selectable online/offline. Review is a proposal and not an approval to deploy. [Architecture Readiness Review](ARCHITECTURE-READINESS-REVIEW.md).


## Technology Architecture — 2026-10-29

Founder selected **SQL Server**. Proposed Next.js frontend, dedicated NestJS modular-monolith API, TypeScript workers and per-device offline local queue; this application stack is an engineering recommendation, not an explicit founder-approved framework choice. Critical gates: offline credit, external tender verification/settlement, negative-stock valuation, late closed-period posting, module dependencies, opener commission rate precedence, SQL Server hosting/version, ORM driver, device storage/security and tax rules. **Do not start coding until blocker decisions recorded.** [Technology Architecture](../02-architecture/TECHNOLOGY-ARCHITECTURE.md) · [V1 Plan](V1-IMPLEMENTATION-PLAN.md).


## Final architecture round — 2026-10-29

APPROVED: Required/Optional module dependencies with conflict checks (ADR-007), opener commission precedence defined in Commission Plan (ADR-008), SQL Server on VPS + POS PWA with IndexedDB local queue as initial choice (ADR-009). Not approved: offline credit handling, electronic tender verification/settlement, negative stock costing, late offline sale posting after month close. These four remain blockers for the relevant financial code. No implementation authorized. [Cursor preimplementation plan](CURSOR-PREIMPLEMENTATION-PLAN.md).


## Final four financial founder answers — 2026-10-29

Resolved at product-intent level: offline credit recorded immediately with post-sync over-limit review ([ADR-010](../05-decisions/ADR-010-OFFLINE-CREDIT.md)); customer payment evidence recorded and discrepancies reviewed without pretending proof is settlement ([ADR-011](../05-decisions/ADR-011-OFFLINE-ELECTRONIC-PAYMENT-EVIDENCE.md)); provisional last known cost for negative stock plus later adjustment ([ADR-012](../05-decisions/ADR-012-NEGATIVE-STOCK-COSTING.md)); preserve original sale date and post to open accounting period with documented adjustment ([ADR-013](../05-decisions/ADR-013-LATE-OFFLINE-POSTING-CLOSED-PERIOD.md)). Supersedes earlier unanswered B1-B4 entries above. Remaining implementation-critical details: excess-credit follow-up policy, unverified/failed electronic tender financial outcome, first-ever unknown cost, statutory tax treatment for late sales, offline security/SQL Server hosting/driver.


## Technical Design Sign-off review — 2026-10-29

[Technical Design Sign-off](TECHNICAL-DESIGN-SIGNOFF.md) was drafted, **NOT APPROVED**. Outstanding A-E: handling excess offline credit, failed customer evidence and unpaid tender, product with no prior known cost, country-specific taxes on late postings, and device/SQL Server security/operations readiness. Product intent ADR-010..013 remains accepted; implementation remains blocked until specific operational contracts and explicit code permission.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**


## Technical validation remaining — 2026-10-29

Before implementation authorization: inspect SQL Server version/edition/VPS capacity, select data access driver, establish/test off-host backup and restoration, verify actual POS devices and IndexedDB eviction/offline login threat model, settle RPO/RTO and country-specific fiscal integration details. [Infrastructure Checklist](INFRASTRUCTURE-OFFLINE-PRECODE-CHECKLIST.md). No tests have been executed.


## Windows POS target — 2026-10-29

**Resolved:** V1 POS initially targets Windows Browser; testing plan at [Windows PWA/IndexedDB Test Plan](WINDOWS-POS-OFFLINE-TEST-PLAN.md). **Still open:** exact Windows/browser versions, shared-kiosk Windows user policy, offline local session TTL, PWA storage and eviction safeguards, live SQL Server VPS edition/resources/backups, DB driver/ORM and security verification. Test plan exists but has NOT been executed.


## VPS audit status — 2026-10-29

Read-only operator instructions are at [VPS Audit Runbook](VPS-READONLY-AUDIT-RUNBOOK.md); actual resource/version, encryption and backup evidence are still missing because direct server access is not available. Need redacted operator output and verified restore test, browser/storage device testing and ORM selection before production readiness. No code authorization.


## Data access decision — 2026-10-29

[SQL Server Data Access Memo](SQLSERVER-DATA-ACCESS-SELECTION.md) recommends node-mssql + tedious, explicit financial transactions and reviewed SQL migrations, pending proof. Confirm compatible server/driver versions, real SQL integration tests and owner signoff. No implementation authorized.


## Module ecosystem and UX discovery — 2026-10-29

Pending founder review: exact V1 app tiles/capability grouping; contract between Core and extension for every module and optional multi-extension interactions; business-scoped install/disable billing and prerequisites; WhatsApp add-on at V1 launch vs later; Clinic Pack launch and sensitive domain boundary; original DRVO UX design referencing (not reproducing) Odoo; Cashier pure-logic/test reuse boundary and migration strategy. [Module proposal](../02-architecture/MODULE-ECOSYSTEM-DISCOVERY.md), [UX proposal](../02-architecture/ODOO-INSPIRED-UI-DISCOVERY.md), [Cashier review](CASHER-REUSE-DISCOVERY.md). DRAFT only.


## Module architecture review — 2026-10-29

**Approved:** ADR-015 each user-facing Module is a separate App tile; not default-grouped mega-apps. This resolves navigation grouping choice, not OQ-009 exact V1 app inventory or OQ-013 contracts. Details still to ratify: Global Module Registry and Business-scoped activation, exact Required/Optional edges and dependency-install approval, paid add-on permissions, WhatsApp V1 availability, Salon Pack visibility, Clinic Pack separate rollout, journal consistency boundary. [Draft spec](../02-architecture/MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md). No coding.


## Required Module activation decision — 2026-10-29

**RESOLVED:** founder approved Option A: a single activation preview of the selected Module plus its full Required dependency set and all applicable costs, followed by one explicit approval to activate together; see [ADR-016](../05-decisions/ADR-016-BUNDLED-REQUIRED-DEPENDENCIES.md). Remaining questions: exact V1 app catalog and dependencies, who can approve/install/pay, proration/entitlement failure semantics, disabling an app with dependents, WhatsApp launch timing, Salon Pack visual representation, core extension hook conflicts, and first-journal financial consistency. [Architecture draft](../02-architecture/MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md).


## Multi-industry and SaaS scaling approved direction / remaining gaps (2026-10-29)

**RESOLVED architecture direction, ADR-017/018:** Product platform with reusable Shared Core/Modules, narrow Extensions, independent Domain Modules for truly different processes, and versioned Industry Solutions; repeatable industry analysis and productization process. Different industry labels alone do not justify Core reuse. Customer sees searchable Solutions catalog first and only active independent Apps in its Business, internal DRVO Control Center is separate. Salon V1, Clinic second. Growth beyond one SQL Server shared V1 database can later be explored but is not approved for V1.

**OPEN detailed design:** actual per-module Core/Extension/Domain boundary matrix, Industry Solution manifest/schema/versioning and existing Business migration across solution versions, exact V1 public App inventory, Control Center role permissions/support data privacy, cross-industry config ownership, commercial productization/upgrade rules, 100+ sector catalog IA, quantified resource sizing/concurrency targets, tenant placement/migration for future pooled/dedicated DB, per-country compliance, support/SLA and enterprise readiness. A large timber importer/manufacturer is a hypothetical future Industry Solution discovery, NOT an existing ready feature. References: [Industry Architecture](../02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [Onboarding Playbook](NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md), [Scale Strategy](../02-architecture/SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md). Implementation remains unauthorized.


## Core/Extension/Domain classification decision — 2026-10-29

**RESOLVED policy:** founder accepted Option B (ADR-019). Domain Module per industry is **conditional**, not mandatory. Shared invariants remain in Core, bounded industry variation in Extensions, and independently owned aggregates/privacy-sensitive or production workflows in new Domain Modules, each still Core+Extension per ADR-006. [Boundary Matrix](../02-architecture/CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md) proposes Salon/Clinic/Manufacturing examples. **OPEN technical detail:** final Salon Service Execution / Queue data ownership; exactly which Salon hooks and cross-module events are needed, financial transaction and replay acceptance; clinic privacy scope; manufacturing domain split; exact V1 app tiles and Registry manifests. No code authorized.


## Incremental Business growth / Salon service execution clarification — 2026-10-29

**APPROVED ADR-020:** each Business may start with its industry-appropriate minimum valid Module bundle and add compatible Modules later; no required automatic install of every SaaS Module, but compulsory financial/security/dependency behavior remains. **Salon V1 has NO standalone Service Execution Module.** Existing sale/booking/service executor attribution/HR commission/inventory recipe functionality is not cut; it remains with shared Module owners/Salon Extensions. Old 'should Salon V1 include a separate Service Execution Module?' question is resolved. [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md); [progressive business design](../02-architecture/INCREMENTAL-BUSINESS-MODULE-GROWTH.md).

**STILL OPEN:** exact mandatory starter bundle per industry and workflow, app-vs-internal dependency boundaries, salon queue ownership, future multi-step Service Execution trigger (if ever), entitlement/pricing, activation state machine and extension compatibility, event and financial transaction contract. No implementation permission.


## Industry Starter onboarding UX — founder decision 2026-10-29

**RESOLVED ADR-021:** option B, **recommended customizable** Industry Starter. User can choose/deselect suggested optional apps; Module Registry-enforced Required dependency closure, financial and RBAC invariants cannot be bypassed. Explicit one-bundle price/approval (ADR-016) and incremental additions (ADR-020) remain. Fixed immutable industry bundles and blank expert-only install are NOT the chosen default. [ADR-021](../05-decisions/ADR-021-CUSTOMIZABLE-RECOMMENDED-INDUSTRY-STARTER.md) · [Starter/Activation draft](../02-architecture/INDUSTRY-STARTER-AND-ACTIVATION-DESIGN.md).

**Still open:** precise Salon suggested apps and whether recommendation is pre-checked; Global Module financial dependency edges vs visible/purchasable app; Module approver role and paid add-ons, quote/proration failures, Business industry switching/upgrades, final activation state machine and contract schemas. Do not treat draft examples as approved implementation.


## Pricing and UI/UX Kit discovery — 2026-10-29

New DISCUSSION DRAFTS: [Pricing Strategy](../01-product/SAAS-PRICING-STRATEGY-DISCOVERY.md) and [DRVO UI Kit Blueprint](../02-architecture/DRVO-ERP-UI-KIT-BLUEPRINT.md). Candidate Hybrid: Business base tier + sensible included allowance + only premium differentiated Add-ons / metered outside costs (not accepted). Kit: Odoo-like interaction/view family with original DRVO-owned visual language, full RTL/LTR, role and finance/offline states (not approved final UI).

**OPEN to founder:** first billing metric (Business/Branch/active operator/users) and plan boundaries; included vs premium Modules and WhatsApp/AI consumption; trial/manual collection/grace and refund policy; if no-extra-cost recommended apps should be preselected (paid optional off by default); UX shell/navigation choice, brand/tokens, screen density, full Kit source format/design tool, and screen sign-off criteria. Do not treat benchmark Odoo public prices as DRVO prices. No code authorized.


## UX direction ADR-022 and Hybrid pricing study — 2026-10-29

**RESOLVED:** founder selected Odoo-familiar App Shell + reusable ERP view UX **with simpler original DRVO identity** (ADR-022), explicitly not copying Enterprise assets/code. Specs are drafts: [App Shell](../02-architecture/DRVO-APP-SHELL-UX-SPEC.md), [Tokens](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [Views](../02-architecture/DRVO-VIEW-AND-SCREEN-PATTERNS.md).

**Still OPEN for UX:** topbar/sidebar alternative, final brand palette/font/icons, compact/comfortable default, full page-by-page user journeys, Figma or alternative source kit, final screen approvals, MVP view engine breadth, phone feature set. The approved *direction* is not final UI details.

**Still OPEN for pricing:** Hybrid [model analysis](../01-product/HYBRID-PRICING-MODEL-ANALYSIS.md) is a recommendation; choose Business/Branch/active-operator primary meter, plan inclusions and limits, exact prices EGP/Gulf, included recommended preselection, trial/manual billing/renewals/proration/refunds and paid activation roles. Odoo prices are external benchmark, not DRVO policy. No code authorized.


## Hybrid Navigation pattern decision — ADR-023 (2026-10-29)

**RESOLVED:** founder selected **C — Hybrid per Module**. Single global DRVO App Shell with one original UI Kit; Sidebar for complex hierarchical Modules, Tabs for shallow Modules, Workspace for high-focus POS and optional Booking Calendar. Independent authorized App tiles and Business/Branch scopes remain. The prior topbar-only vs always-sidebar global choice is CLOSED. Details: [ADR-023](../05-decisions/ADR-023-HYBRID-NAVIGATION-BY-MODULE.md), [Hybrid Navigation & RTL](../02-architecture/DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md), [List/Form detail](../02-architecture/DRVO-LIST-FORM-UX-DETAILED.md).

**OPEN design approvals:** actual Module-to-pattern map and special Booking mode, exact responsive shell geometry/sidebar/tabs/table control sizes, brand color/fonts, App Launcher tile order/favorites, RTL mobile behavior, List/Form action layout/saved filters and first high-fidelity screen prototypes. Existing Pricing Hybrid model and real price points remain unapproved. Docs only, no code.


## DRVO palette decision — ADR-024 (2026-10-29)

**CLOSED:** founder accepted original Plum + Teal + Soft-Neutral DRVO color direction and six principal hex values: `#74536E`, `#553E53`, `#1A7B80`, `#F7F6F8`, `#FFFFFF`, `#27242B`; old green-first proposal superseded. Strongly prefer an Apps/action-first Home instead of oversized Hero, but removing vs shrinking banner remains a mockup-level choice. See [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md).

**STILL OPEN:** final logo/font/icon identity, accessible semantic color ramps (focus/hover/disabled/status), visual samples for 3 primary screens, final RTL layout/spacing sizes, Starter/Pricing overlays, and full Design Kit/Figma source. Hybrid subscription model not approved. No coding authorization.


## Founder-approved UX North Star — ADR-025 (2026-10-29)

**RESOLVED philosophy:** Odoo-grade ERP workflow power with Duolingo-inspired clarity, friendliness, progressive disclosure, high craft and restrained user feedback, retaining DRVO original brand (ADR-024) and Hybrid per Module shell (ADR-023). No copying proprietary assets, no infantilizing accounting, no fake financial/offline states. New docs: [ADR-025](../05-decisions/ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md), [Playbook](../02-architecture/DRVO-UX-NORTH-STAR-PLAYBOOK.md), [3-Screen Review](../02-architecture/DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md).

**OPEN detailed UX:** review new App Launcher/Accounting/POS visual directions, Home hero absent vs reduced, final navigation/map, typography/icon family, context coaching and motion variants, exact row density, save/post/offline states, keyboard and responsive sign-offs. Founder approved direction, not all screen pixels or a Figma/react implementation.


## Business Theme & Character/Scene Architecture — founder decisions 2026-10-29

**RESOLVED DIRECTION ADR-026:** Business palette customization plus licensed font selection/upload capability; one centralized typography/token resolver; DRVO default Plum/Teal is fallback, not mandatory tenant color. **RESOLVED DIRECTION ADR-027:** original industry/profession Character Family, house/industry scenes and optional meaningful flip/scene motion for guided surfaces, with reduced-motion fallback and no disruptive financial/POS use. **RESOLVED FEEDBACK:** all prior 3-screen mockup layouts rejected; character/house graphical ideas liked, not the page compositions.

**OPEN:** theme override boundaries, font upload supported format/size/quota and licensing/legal policy, exact implementation of threat scanning and asset hosting, Branding permission/RBAC and draft/publish audit, Theme Business/Tenant/User preference hierarchy, final default font choices, accessibility contrast computation/dark mode, whether full upload/editor ships V1 or later, per-Business character style selection/upload/premium scope, initial Salon Character Pack visual style, static/motion asset sizes, scene flip behavior/performance/RTL and final redesigned screen information architecture. [ADR-026](../05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md), [ADR-027](../05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md), [Theme Blueprint](../02-architecture/BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md), [Character Blueprint](../02-architecture/CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md). No coding authorized.


## DRVO Character Art Direction selection (ADR-028, 2026-10-29)

**CLOSED:** character art family style = **Soft Editorial 2.5D**, miniature building/environment style = **Miniature 3D / Isometric-inspired**, consistent unified DRVO visuals. Initial concept focus: Barber, Salon and Real Estate House; the House is art research, not a new launch priority. Previous screen layouts explicitly rejected. **OPEN:** actual original character face/wardrobe/pose, Salon/House scene camera/light/material, size/asset source format, design tool ownership, reduced-motion and flip prototype variants, approved V1 art volume, licensed/owned production graphic pack and final independently designed UI compositions. [ADR-028](../05-decisions/ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md), [Concept Pack](../02-architecture/DRVO-ART-DIRECTION-FIRST-CONCEPT-PACK.md). No code.


## Founder Three-Pillar Platform Architecture Mission — ADR-029, 2026-10-30

**RESOLVED FOUNDATIONAL DIRECTION:** Egypt-wide large-scale ERP product ambition; any industry via repeatable reuse/extension/conditional new Domain Modules + Industry Solutions; every Business size via progressive minimum valid Modules **and a separate evidence-driven operational/database capacity scale path**. Shared modular monolith/tenant-aware SQL Server is the V1 starting architecture, NOT verified unlimited throughput, all-sector readiness or Enterprise SLA. Every new platform/Module/industry design must document [3-Pillar Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) assessment and [Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md).

**STILL OPEN TECHNICAL PROOF:** target Tenant/Business/Branch/operator/user/transaction numbers and acceptable p95/p99 latency, load per client tier, isolation guarantees and physical Tenant placement path, RPO/RTO/DR and backup/restore evidence, data residency/legal requirements Egypt/Gulf/Clinic, cross-module contract tests, true per-Industry version compatibility, Enterprise SLA/support cost, per-market readiness. Architectural mission accepted, no code, SQL migrations or load testing authorized.


## Phase-0 Foundation Architecture Review 01 — 2026-10-30 (NEW P0 PRIORITY)

[Foundation Review](../02-architecture/FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) found 12 documented design gaps rather than runtime bugs. **P0 approval questions:** (1) exact scoped Tenant/Business/Branch access + DB/worker/cache/query enforcement and whether SQL Server RLS defense is required; (2) POS first GL Posting **A same SQL transaction vs B durable `ACCOUNTING_PENDING` + reconciliation barrier**, and authoritative presentation of sale/payment/stock/commission states; (3) concurrency-safe activation planner/quote/role/payment transition and disable policy; (4) domain-owned command/event schemas/order/privacy and exact idempotency; (5) Core/Extension/Industry Solution version compatibility/rollbacks and existing Business migration. **P1:** enterprise capacity workload matrix and tenant placement/backup/restore; Clinic data privacy and Egypt/Gulf compliance; future cross-Business/transfer policy. [Core Contract Options](../02-architecture/FOUNDATION-CORE-CONTRACTS-PROPOSAL.md) are proposals only, not adopted choices. No code or SQL testing authorized.


## Tenant Isolation Contract detailed review — 2026-10-30

P0 FND-01/FND-10: draft [trusted Tenant/Business/Branch Isolation Contract](../02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md) and [40 negative test matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md) exist; [ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) is PROPOSED only. **OPEN sign-off:** exact SQL scoped FK/index layout and optional RLS, per-resource Salon ownership matrix, Manager delegated creation/Owner bootstrap, permitted cross-Branch/Business consolidated reports, support break-glass, async job revocation, Tenant placement/export. These are architectural choices not decided by authoring a draft. Test execution count = ZERO; Founder implementation permission not given.


## Financial Source-of-Truth Contract — founder/finance signoff REQUIRED, 2026-10-30

[Financial Consistency Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md), [ADR-031 PROPOSED](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md), [46 Failure/Recovery Test Matrix](../02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) turn FND-02/04 into a precise review package. **OPEN P0:** first mandatory GL A atomic same SQL transaction vs B durable sale+ACCOUNTING_PENDING, required source effects/authoritative receipt/AR/tender state, customer-unverified electronic claim ledger account, partial refund vs pending GL, exact idempotency/outbox ordering and terminal sync/reconciliation policy. **P1:** cost matching for negative stock/unknown cost, closed-period VAT/tax/FX legal validation, SQL contention and p95 SLO, reconciliation alerts and period-close exceptions. Earlier approved product ADR-009–013 are unchanged. Conditional Option A engineering recommendation does NOT select implementation. No tests, code, SQL or deployment authorized.


## Next P0 financial sign-off: single Sale-to-Ledger vertical slice — 2026-10-30

[End-to-End Sale-to-Ledger Walkthrough](../02-architecture/SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md) now captures the full authorized POS → Accounting first GL → outbox → Stock/HR/Treasury path plus replay/refund/late-period cases; [Finance Account Mapping & Close Gates](../02-architecture/FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md) adds the accountant decision matrix. **P0 STILL OPEN:** choose ADR-031 A atomic sale+GL vs B durable sale+GL_PENDING, whether Treasury cash custody is atomic for a cash sale, exact legal accounting for screenshot-only electronic tender (E1 customer AR vs E2 permitted unverified clearing) and anonymous collection exception, customer receipt/paid language, posting/refund concurrency rules, status meanings and finance/period/CoA and VAT policy. **P1 OPEN:** performance p95/p99 and concurrency targets, physical SQL under load, legally safe month close and restore/migration. No founder implementation permission or financial tests run.


## P0 Module Activation and initial GL decision fitness — 2026-10-30

[ADR-032 PROPOSED](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md), [Activation Engine](../02-architecture/MODULE-ACTIVATION-DEPENDENCY-ENGINE-CONTRACT.md), [50 Planned Tests](../02-architecture/MODULE-ACTIVATION-FAILURE-TEST-MATRIX.md) document the open FND-03/05/09 scope. **Unresolved:** final Salon starter & actual Required edges, Business-wide purchasing authorization and Manager delegation, manual payment/verified entitlement/proration/refunds, bundle initializer/compensation, concurrent graph CAS, version/hook policy, disable/suspend while dependents and financial obligations exist, test workload and enterprise placement. **No tests executed.** [Financial A/B Decision Gate](../02-architecture/FINANCIAL-ATOMICITY-DECISION-GATE.md) keeps FND-02 unresolved until accounting GL/tender mapping, founder choice and measured p95/SQL failure evidence exist; do not infer adoption of Option A from the conditional recommendation. No code permission granted.

# Current state

> **FOUNDATION / NO EXCEPTION:** [Founder Three-Pillar Project Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md). The product must target Egypt-scale platform adoption, an extensible method to serve any *investigated* business industry, and Business sizes micro-to-enterprise. Domain/module composition enables feature growth; operational/capacity scaling is a separate measurable design axis. Mission is accepted, **not yet a verified capacity claim**.


**As of:** 2026-10-28  
**Phase:** Founder Discovery / Documentation (Phase 0)  
**Implementation:** NOT STARTED  
**Production database, staging and deployment:** NOT VERIFIED / NOT DONE

## Confirmed product direction

- Complete modular ERP as vision; staged releases.
- Medium-sized multi-branch target customers.
- Egypt and Gulf countries intended from first commercial launch, with country details pending.
- First vertical: barber salons; **second: medical clinics**.
- **Cut Salon** first real-world pilot.
- **Responsive Web / PWA** as initial mobile channel.
- **Core + Extension architecture required for each module**; technical contracts not yet finalized.
- Modular Monolith, multi-tenant architecture, standalone repository and docs source of truth.

## Next steps

1. Complete detailed MVP discovery for the barber salon pilot.
2. Resolve cross-market launch/compliance and medical clinic scope.
3. Specify extension contracts and tenant model before scaffolding.
4. Decide technology stack, environments and data strategy.
5. Define measurable acceptance criteria.

See [Open questions](../04-execution/OPEN-QUESTIONS.md) and [Roadmap](../04-execution/ROADMAP.md).

## Verification

An accepted decision is not implementation; no feature is considered tested or deployed without evidence.

## MVP discovery update (2026-10-28)

Founder submitted 20 scope preferences: target one-month first test, broad Cashier replacement ambition, Cut Salon pilot alongside legacy, online subscriptions, offline POS, booking, full HR, inventory and accounting. Scope and deadline are not yet approved as feasible. Resolve operational risks and acceptance criteria before committing to delivery. See [MVP Discovery](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Release decision update — 2026-10-28

Founder + Cursor/AI team; one-month test target flexible. **One comprehensive commercial V1** following internal QA and Cut Salon all-branch validation. DRVO is to own bookings while Cashier remains in parallel; cash-only offline sales sync later. Full journals/ledgers/balances mandatory, manual subscription collection initially (gateway deferred). These are requirements, **not implemented or feasibility-proven**. See [release strategy](../01-product/MVP-RELEASE-STRATEGY.md).


## MVP scope closure (2026-10-28)

Confirmed: existing Cut Salon booking site will call the DRVO API; offline cash sales are accepted with post-sync stock shortage review; internal testing is permitted before one commercial V1 launch. Manual accounting journal entry remains undecided until Accounting Module design. This is documentation only; no code, migration or deployment performed. [Release strategy](../01-product/MVP-RELEASE-STRATEGY.md).

## Tenancy discovery checkpoint — 2026-10-28

Forty founder answers captured and reconciled in [Tenancy Discovery](../01-product/TENANCY-DISCOVERY-ROUND-3.md). [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md) records accepted logical boundaries. Technical schema, module dependencies and several lifecycle/access rules remain open. No application code or database implemented.

## Tenancy follow-up (2026-10-28)

Approved: Manager always sees profits and service costs in authorized scope; currency/language/timezone only at Business level. Module Dependencies unresolved pending design discussion. [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md).

## Identity & Access discovery — 2026-10-28

Twelve founder responses recorded. Platform-global usernames and username/password login, tenant self-registration, explicit Business Membership, one Role per Branch, email OTP recovery and mandatory employee first-login change approved. Explicit Deny and temporary permissions remain unresolved; session revocation must be enforced server-side. [Identity & Access](../02-architecture/IDENTITY-ACCESS.md).

## RBAC matrix discovery — 2026-10-28

Founder approved scoped Owner full access, customizable Manager role, restricted manager delegation, dedicated paid-invoice void, refund thresholds, Role discount limits, self-shift vs manager shift access, closed-day reopen permission. Ten questions remain undecided. New user ID / QR-linked discount concept requires clarification and security design. [RBAC Matrix](../02-architecture/RBAC-MATRIX.md). No implementation.

## Permission and QR discovery (2026-10-28)

Allow-only + Default Deny approved; other resource/scope checks remain mandatory. QR card owner-only with extra verification approved, but intended QR function and Discount Engine behavior remain open. Continue with POS Core + Salon Extension requirements; no code implemented.

## POS discovery (2026-10-28)

First 12 POS requirements captured: mixed product/service invoice, one service executor but potentially multiple attribution recipients, optional customer except credit, immutable paid invoice, draft persistence, split tender, temporary catalog line, credit limit and open shifts. Attribution details and payment/refund specs remain open. [POS Discovery](../03-modules/POS-DISCOVERY-ROUND-1.md). No code implemented.

## POS discovery round 2 — 2026-10-28

Approved: built-in/custom payment methods, cash-plus-receivable splits, hard credit limits, partial debt collections, separate employee tips, line/custom partial refunds, refund to customer credit or payment method, executed-service refunds with reason, Manager over-limit approval, employee-specific commission plans and automatic reversal of target/commission effects. Attribution, payroll reversal period and financial day reopening remain open. [Round 2](../03-modules/POS-DISCOVERY-ROUND-2.md). No code implemented.

## POS Round 3 discovery — 2026-10-28

Confirmed shared branch treasury with separate cashier shifts, actual cash counts and manager-reviewed shortages/surpluses; manager can make audited post-payment service-attribution adjustment; offline cash sales attach to same shift; tips accrue to employee ledger; financial day can close with open shifts (warning). Founder requests cashier liability for shortages and recording surplus as sales; accounting classification, investigation and lawful recovery require design, do not treat unverified surplus as real sales. [POS Round 3](../03-modules/POS-DISCOVERY-ROUND-3.md). No code.

## POS Round 4 (2026-10-28)

Confirmed: business-configurable multiple shifts; offline sale retains occurred date with documented adjustment; distinct service opener commission and executor's target (Mohamed opens skin-care service, 10% opener commission; Youssef executes and earns target attribution). Requested shortage association with last cash recipient, separate approval before employee deduction, immediate cash-surplus-as-sales classification and edit of approved adjustment need financial/audit safeguards. Day closing workflow remains open. [Round 4](../03-modules/POS-DISCOVERY-ROUND-4.md). Not implemented.

## POS design draft checkpoint — 2026-10-28

Six founder clarifications approved: opener commission 10% of post-discount pre-tax service price; one opener distinct from executor; refund reversals; cash surplus classified as variance pending verified sales evidence; Manager corrections preserve original approved settlement via linked new entry. Initial POS state machine and shift lifecycle **draft specifications** now exist; API/database implementation and outstanding business-day/offline decisions still open. [POS State Machine](../03-modules/POS-STATE-MACHINE.md) · [Shift Lifecycle](../03-modules/SHIFT-LIFECYCLE.md).

## Offline shift reconciliation follow-up — 2026-10-28

Founder approved provisional close for shifts with unsynced sales, cash counting including actually received offline amounts, and automatic retry followed by Manager-visible errors. Offline electronic payment confirmation remains open. Design specification updated; no code implemented.

## Offline/closing design checkpoint — 2026-10-28

Founder approved provisional financial-day close with later final reconciliation; when a device is lost before sync, log incident and reconcile physical cash manually. Provider-dependent offline payments remain undecided pending discussion by method. Draft [Offline API Contracts](../03-modules/OFFLINE-API-CONTRACTS.md) and [Logical Data Model](../03-modules/OFFLINE-DATABASE-DESIGN.md) exist but remain proposed, not implementation. No deployed backend/database.

## Founder decision — 2026-10-29: payment selection availability

All payment methods configured for a Business must remain visible and selectable in POS both online and offline. Do not gate or hide a method merely because connectivity is lost. Founder explicitly skipped per-payment-method discovery for now.

Selecting a method is NOT equivalent to receiving or verifying funds. Cash may be recorded locally as received; provider-dependent payments must retain an unverified/pending reconciliation status until reliable confirmation or evidence exists. Never manufacture provider authorization, and never post pending electronic payment as settled cash. Payment selection UI availability is APPROVED; exact provider confirmation and settlement semantics are technical design work, not additional UI selection questions.


## POS design checkpoint (2026-10-29)

POS logical data model, accounting event contracts and Inventory/HR/Salon integration boundary docs added to docs/03-modules. All configured tender types remain selectable offline; confirmed settlement remains separate. Documents are engineering drafts, not code or approved SQL schema.


## Accounting Core discovery (2026-10-29)

Founder approved editable industry-based Chart of Accounts per Business, independent Business books with Tenant consolidated reporting, auto and manual immediately-posted balanced journals, reversal-based correction, branch/department/project cost centers, configurable reporting and fiscal start, monthly/annual closing and permissioned reopening. Account depth and minimum report set open; period comparisons deferred. [Accounting Core](../03-modules/ACCOUNTING-CORE-SPEC.md). Documentation only.


## Treasury Core founder decisions — 2026-10-29

One treasury per Branch, bank accounts Business/Branch, manager-approved recorded transfers, cash/bank expenses, permissioned cash movement and Manager balance visibility; bank reconciliation deferred. [Treasury Core](../03-modules/TREASURY-CORE-SPEC.md). No implementation.


## HR & Employee Ledger discovery — 2026-10-29

Twelve HR decisions documented. Per-employee salary/commission models, custom target periods, Branch-separated commissions, variable opening rates, daily accrual and monthly close, advances, auditable corrections and scoped payroll approval. Fixed 10% opening rate now an example, not universal rule; base remains after discount before tax. No HR implementation. [HR Commission](../03-modules/HR-COMMISSION-ENGINE.md) · [Employee Ledger](../03-modules/EMPLOYEE-LEDGER.md).


## Inventory/Purchasing founder decisions (2026-10-29)

Eleven approved requirements: per-Branch stock with inter-Branch transfers, automatic Recipe consumption for services, Business-set valuation, negative stock with alert/review, direct purchase/receipt, Business-scoped shared suppliers, supplier returns, full/partial counting, Manager-approved count adjustments, reorder alerts from V1; Batch/Expiry not needed in V1. Transfer between different Businesses remains undecided. [Inventory](../03-modules/INVENTORY-CORE-SPEC.md) and [Purchasing](../03-modules/PURCHASING-CORE-SPEC.md). No code implemented.


## Architecture readiness checkpoint — 2026-10-29

Cross-module review documented at [Architecture Readiness Review](../04-execution/ARCHITECTURE-READINESS-REVIEW.md). Ready for foundation planning only; production finance/offline schema awaits seven design decisions. No code or deployment.


## Technology baseline — 2026-10-29

Founder selected SQL Server. Engineering recommendation: Next.js + NestJS/TypeScript modular monolith, worker, offline device queue, dedicated SQL Server data layer. See [Technology Architecture](../02-architecture/TECHNOLOGY-ARCHITECTURE.md), [V1 Execution Plan](../04-execution/V1-IMPLEMENTATION-PLAN.md). Critical business and hosting/runtime design blockers remain. NO code implementation authorized.


## Final architecture decision update — 2026-10-29

New ADRs 007-009 approved at business direction level: Required/Optional dependencies with conflict prevention, Commission Plan-defined opener rate precedence, SQL Server VPS + PWA IndexedDB initial offline queue. Four financial policies unresolved (offline credit, payment verification, negative stock costing, late closed-month sales). Cursor pre-code plan exists; NO coding approved.


## Four financial ADRs and implementation readiness — 2026-10-29

Founder approved offline immediate credit with after-sync excess review, record customer evidence of offline electronic tender with later discrepancy review, provisional last-known cost for negative stock with subsequent adjustment, and posting late-arriving offline sale to an open GL period while retaining original sale date. See ADR-010..013 and [Implementation Readiness Gate](../04-execution/IMPLEMENTATION-READINESS-GATE.md). Readiness is **technical design signoff pending**, not permission to code. No app or DB changes.


## Technical Sign-off checkpoint — 2026-10-29

[Technical Design Sign-off](../04-execution/TECHNICAL-DESIGN-SIGNOFF.md) created with proposed financial edge-case contracts and acceptance tests. Status: draft awaiting founder approval. No coding authorized or executed.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**


## Pre-code infrastructure review — 2026-10-29

Created [Infrastructure + Offline Pre-Code Checklist](../04-execution/INFRASTRUCTURE-OFFLINE-PRECODE-CHECKLIST.md). Actual VPS, SQL Server version/capacity, backup restore, POS devices and IndexedDB durability NOT yet inspected or tested. Code remains unauthorized.


## Windows POS browser decision — 2026-10-29

Founder chose Windows Browser as initial POS target. Created [Windows Offline Test Plan](../04-execution/WINDOWS-POS-OFFLINE-TEST-PLAN.md) for IndexedDB queue and PWA cases (20 test scenarios); no testing conducted, no code authorized.


## VPS read-only audit access — 2026-10-29

Prepared [VPS Read-only Audit Runbook](../04-execution/VPS-READONLY-AUDIT-RUNBOOK.md). GitHub access exists, but direct SSH/VPS execution is unavailable here; no VPS/SQL Server inspection or Windows/IndexedDB tests have been performed. Founder code restriction remains active.


## SQL Server data access evaluation — 2026-10-29

Reviewed node-mssql, TypeORM and Prisma SQL Server options. Recommended node-mssql/tedious plus explicit financial repositories and versioned SQL migrations; recommendation NOT approved or tested. [Data Access Memo](../04-execution/SQLSERVER-DATA-ACCESS-SELECTION.md). No code or VPS access.


## Module and UX architecture expansion — 2026-10-29

Draft proposals (NOT approved decisions): [module ecosystem](../02-architecture/MODULE-ECOSYSTEM-DISCOVERY.md), [Odoo-inspired DRVO UI](../02-architecture/ODOO-INSPIRED-UI-DISCOVERY.md), and [Cashier reuse review](../04-execution/CASHER-REUSE-DISCOVERY.md). Founder rightly identified module interoperation, module catalog, optional WhatsApp, cross-industry Clinic evolution, Business activation and new-Business templates as outstanding architecture questions. No application code, test or production change.


## Module App identity — approved 2026-10-29

Founder picked independent visible Modules (Odoo-like App Launcher), ADR-015. This is compatible with existing Modular Monolith, Core+Extensions, Required/Optional Dependencies, Business-scoped activation and one SQL Server database for V1. [Module Registry/Dependencies/Contracts](../02-architecture/MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md) is a draft awaiting product and technical sign-off. No application development approved.


## Required dependency activation policy — founder-approved 2026-10-29

ADR-016 accepted: apps selected with missing Required dependencies show one bundle preview with all prerequisites and applicable charges, for one explicit user approval; no hidden extra paid modules. [ADR-016](../05-decisions/ADR-016-BUNDLED-REQUIRED-DEPENDENCIES.md). [Lifecycle and Contracts](../02-architecture/MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md) is a draft architecture proposal; coding remains explicitly unauthorized.


## Founder approval — multi-industry product platform and scale direction (2026-10-29)

**ADR-017 APPROVED DIRECTION:** Shared Platform Kernel + reusable Shared Business Modules + bounded Industry Extensions + independent Vertical Domain Modules where business invariants genuinely differ + versioned Industry Solution compositions + optional integrations. Still require Core+Extension architecture for *every* module (ADR-006); do not build an ERP fork per industry or over-generalize Booking/CRM. **ADR-018 APPROVED STRATEGIC DIRECTION:** a repeatable Discovery/Fit-Gap/Build/QA/Cutover/Productization process to bring later industries onboard (hypothetical example: large Egyptian importer/supplier/timber manufacturer), and UI for 100+ searchable solutions, while each customer Business sees only its active authorized Apps, with separate internal Platform Control Center. Distinguish number of industries from Tenants, and extensibility from load/enterprise scalability.

**Unchanged constraints:** first comprehensive commercial release Salon validated at Cut Salon; Clinic second; other sectors are examples only. V1 ONE shared SQL Server database. Multiple database pools / dedicated Enterprise deployment only future optional strategies subject to measured load and separate design. No claim any sector/size is ready now; no code, migrations, tests or production deployment. New canonical docs: [Industry Architecture](../02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [Industry Onboarding Playbook](../04-execution/NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md), [SaaS Scale/Control Center](../02-architecture/SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md); ADRs [017](../05-decisions/ADR-017-SHARED-CORE-INDUSTRY-SOLUTIONS.md), [018](../05-decisions/ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md).


## Founder-approved domain boundary choice — 2026-10-29

**ADR-019 accepted (Option B):** create separate Industry Domain Modules only where their independent aggregates/lifecycle/permissions/privacy/financial rules justify them; use bounded Industry Extensions where shared Core already owns the workflow. No compulsory giant Salon/Clinic/Manufacturing operations module for every Industry Solution. Salon V1 likely composes shared POS/Booking/HR/Inventory/etc. with Salon Extensions; independently owned service execution is a candidate only if analysis justifies it. Clinic Clinical Records and Manufacturing/MRP are future domain-boundary stress tests, not planned V1 commitments. See [ADR-019](../05-decisions/ADR-019-CONDITIONAL-DOMAIN-MODULE-BOUNDARY.md) and draft [Matrix](../02-architecture/CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md). No coding authorization.


## Founder-approved progressive Business composition — 2026-10-29

ADR-020: every Business may begin with its own minimum valid set of industry/workflow Modules and add compatible Modules/Extensions later with explicit Required dependency/cost approval, safe versioned contracts and preserved financial history. **No standalone Salon Service Execution Module in V1**. Existing Booking/POS/HR/Inventory Salon-related functionality remains; this is not an unintended reduction of approved comprehensive Salon commercial V1 coverage. [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md) and [growth design](../02-architecture/INCREMENTAL-BUSINESS-MODULE-GROWTH.md). No coding authorized.


## Founder approved recommended, customizable Industry Starters — 2026-10-29

**ADR-021 accepted:** a new Business chooses an Industry Solution and starts with a recommended but editable selection of compatible Modules and Extensions. Recommended/optional apps can be removed unless required by a selected capability. Global Module Registry Required dependency closure plus platform/security/finance integrity always apply; complete prerequisites and any charges get one explicit bundle approval (ADR-016). Industry Solution Registry supplies starter recommendations and config/role templates, **not** authority to override real Module dependencies. This is an onboarding choice, not a reduction to comprehensive Salon V1. [ADR-021](../05-decisions/ADR-021-CUSTOMIZABLE-RECOMMENDED-INDUSTRY-STARTER.md), [design draft](../02-architecture/INDUSTRY-STARTER-AND-ACTIVATION-DESIGN.md). No coding authorized.


## SaaS pricing and original DRVO ERP UI Kit — discovery 2026-10-29

Founder requested comprehensive pricing and an Odoo-like UX Kit. Added [Pricing Discovery](../01-product/SAAS-PRICING-STRATEGY-DISCOVERY.md) and [UI Kit Blueprint](../02-architecture/DRVO-ERP-UI-KIT-BLUEPRINT.md) as **DRAFTS**, not founder-approved price list or coded visual kit. Odoo official pricing and frontend/rights docs were researched; benchmark figures are not DRVO prices. Recommended discussion: Hybrid base Business plan + included essential apps + opt-in value premium/metered add-ons; original DRVO component/view/theme library inspired by Odoo functional patterns. Prior ADR-021 recommended customizable industry starter remains accepted; the preselected-included-app behavior remains OPEN. No code, prototype assets, SQL schema, tests or production changes.


## Founder-approved DRVO UI Kit direction — ADR-022 (2026-10-29)

Selected **A — Odoo Familiarity + original DRVO brand and simpler ERP UI**. Common app launcher and List/Form/Kanban/Calendar/Graph/Pivot patterns, separate Windows POS focus shell, Arabic RTL/English LTR and explicit financial/offline UI statuses; no copyrighted Odoo Enterprise code/assets reused. Detailed [App Shell](../02-architecture/DRVO-APP-SHELL-UX-SPEC.md), [Tokens & Components](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md) and [Views](../02-architecture/DRVO-VIEW-AND-SCREEN-PATTERNS.md) are **unapproved visual/technical proposals**. [ADR-022](../05-decisions/ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md) is approved only at the design-direction level. Hybrid SaaS [pricing study](../01-product/HYBRID-PRICING-MODEL-ANALYSIS.md) remains unapproved; no numeric DRVO prices or packaging determined. No coded UI Kit, visual design file, DB changes, tests or production actions.


## Founder-approved Hybrid App Shell navigation — ADR-023 (2026-10-29)

**ACCEPTED Option C:** one Global DRVO Shell with controlled **Sidebar** (hierarchical business admin), **Tabs** (shallow apps) or **Workspace** (POS/Booking high-focus workflows) according to Module workload. App Launcher and Business/Branch/role scope remain consistent, apps independent (ADR-015), RTL/LTR first-class (ADR-022). The Sidebar is NOT mandated in every module. New [ADR-023](../05-decisions/ADR-023-HYBRID-NAVIGATION-BY-MODULE.md), detailed **draft** [Hybrid Navigation + RTL/App Launcher](../02-architecture/DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md) and [List/Form UX](../02-architecture/DRVO-LIST-FORM-UX-DETAILED.md). Candidate numeric tokens (Topbar 56px, Sidebar 240/64px, table row 36/44px) and final assignments still require visual testing/sign-off. No UI code, Figma, SQL migration or production work.


## Founder-approved DRVO palette — ADR-024 (2026-10-29)

**RESOLVED:** DRVO ERP uses original **Plum + Teal + Soft Neutrals** identity with approved baseline: Plum `#74536E`, Deep Plum `#553E53`, Action Teal `#1A7B80`, Canvas `#F7F6F8`, White `#FFFFFF`, Main Text `#27242B`. This supersedes prior *unapproved* green-first palette candidates. Place primary tasks/apps in first viewport; reduce/avoid huge promotional Home hero (exact reduced vs absent layout pending). Colors will apply consistently to App Launcher, Accounting List/Form and POS with ADR-023 Hybrid Navigation. Final typography, icon/logo assets, UI states/contrast, component layout and real designs are still pending. [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md), [Tokens](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md). Docs only: no code/migrations/deploy or produced Figma kit.


## Founder approved UX North Star — ADR-025 (2026-10-29)

Founder explicitly approved **ERP seriousness/professional power of Odoo + Duolingo-inspired simple, fluid, friendly experience**, with original DRVO Plum/Teal colors, no Odoo/Duolingo asset cloning and no childish finance gamification. **Guide / Work / Analyze** are UX density and task layers within one shared UI Kit, not separate products. Focus one clear action, role-sensitive density, progressive disclosure, calm verifiable states, attention-first Business Home and fast Windows POS. Three new design concept views requested for App Launcher, Accounting and POS; artwork in conversation is not a Figma or coded interface. [ADR-025](../05-decisions/ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md), [Playbook](../02-architecture/DRVO-UX-NORTH-STAR-PLAYBOOK.md), [Review Brief](../02-architecture/DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md). No application code/SQL/production authorization.


## Founder approvals — Business themes, custom fonts, original characters and scene motion (2026-10-29)

**ADR-026 ACCEPTED DIRECTION:** Theme Engine with validated, Business-scoped palette overrides; centrally managed Typography Tokens; supported font choice and **secure licensed custom font upload capability** in architecture. Global DRVO Plum/Teal (ADR-024) becomes default/fallback for Business branding, NOT a compulsory palette. Branding changes restricted by RBAC and a trusted, accessible token resolver; semantic statuses and financial correctness stay protected. Exact font formats, licensing checks, assets/CDN schema, pricing and complete self-service editor V1 timeline remain open.

**ADR-027 ACCEPTED DIRECTION:** original, profession-specific DRVO Character Family, illustrated Industry Scenes (including house/property graphics) and targeted optional scene/page flip motion; reduced-motion/static fallback and POS/finance speed. **ALL previous mockup LAYOUTS rejected**; do not implement their composition as approved UX. Original art/design pack and exact transitions not yet signed off. Technical design drafts: [Theme Engine](../02-architecture/BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md), [Character/Motion](../02-architecture/CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md). Registered [ADR-026](../05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md) and [ADR-027](../05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md). **Documentation only; no code, schema changes, graphics production or production deployment.**


## Founder-selected DRVO Character Art Direction — ADR-028 (2026-10-29)

**ACCEPTED:** unified **Soft 2.5D Editorial characters** + **Miniature/Isometric 3D-inspired industry buildings/scenes** with consistent shapes, lighting and material. First art exploration: DRVO Barber Character, Miniature Salon Storefront, Real Estate/House Miniature and optional scene.flip storyboard. Founder acceptance is of general style/direction, **not** the exact generated illustrations, prior rejected page layouts, any real 3D runtime, animation timing, V1 industry launch expansion or production assets. See [ADR-028](../05-decisions/ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md), [Concept Pack](../02-architecture/DRVO-ART-DIRECTION-FIRST-CONCEPT-PACK.md). No code, graphics asset production pipeline or deployment authorized.


## The project's overriding founder mission — ADR-029, 2026-10-30

Founder explicitly identified 3 non-negotiable foundations: **(1)** aspire to become one of the largest ERP platforms in Egypt, **(2)** architecture expandable into ANY target industry through stable reusable Shared Core, governed Extensions, conditional Domain Modules, Integrations and Industry Solutions without per-client forks, **(3)** capability to serve micro/small/SME/very large Enterprise with minimum valid installed Apps **AND** physically scalable, evidence-driven tenant isolation/SQL/processing/recovery. **Do not infer unlimited operations from Module composition.** This is the primary project definition and is linked at the top of START-HERE, docs README, Product Vision, Architecture and Cursor plan. [Charter](PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) · [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md) · [Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). Phase 0/no code/SQL/production changes. V1 Salon Cut Salon; Clinic second, future sectors require actual productization.


## Phase-0 Foundation Gap Review — 2026-10-30

Initial design review against founder Three-Pillar Charter ADR-029 found **a promising modular design with 12 identified documentation/contract gaps**: P0 trusted Tenant/Business/Branch isolation including background processing and reporting; POS Accounting first GL transaction boundary; concurrent priced module activation; domain ownership/events/compatibility. Hypothetical small Salon, multi-branch Salon and large Manufacturing assessments show the conceptual platform supports the intended direction **but do not prove actual implementation readiness or capacity**. [Architecture Review 01](../02-architecture/FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) and [Core Contract Options](../02-architecture/FOUNDATION-CORE-CONTRACTS-PROPOSAL.md) document blockers/options, neither approving a physical schema or new founder decisions. STATUS: NEEDS DESIGN; no code, DB, tests, VPS or production changes.


## Tenant Isolation Security Design Draft — 2026-10-30

Created [P0 Tenant/Business/Branch Isolation Contract](../02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md), [40-case Negative Security Test Matrix](../02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md), and [PROPOSED ADR-030](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md). Founder-approved Tenancy/Identity/Default-Deny requirements preserved; details on composite FK vs alternate relational design, optional SQL Server RLS, supported permissions and support access not yet ratified. **Status: P0 FND-01 OPEN; contract specification drafted, no executed test or code.** Next security decision must be explicit rather than interpreting documentation as proven isolation.


## P0 Financial Consistency Contract — documented 2026-10-30

Created [Financial Consistency Contract](../02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md), [46 Financial Failure/Recovery Test Cases](../02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) and [ADR-031 PROPOSED](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md). Prior founder approved offline credit customer hold (ADR-010), unverified screenshot != settlement (011), negative stock last cost/unknown `COST_PENDING` (012), late offline original date and open-period posting (013), SQL/PWA device queue (009) preserved. New proposed architecture separates status/source owners for POS, Accounting GL, Treasury tender, Inventory valuation, HR commission; compares first GL A same-transaction vs B durable accepted/pending. **A conditionally recommended for V1, NOT APPROVED. FND-02/FND-04 still OPEN. Zero test execution; no code/DB/production changes.**

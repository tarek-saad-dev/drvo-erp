# Cursor Implementation Plan — Pre-code Gate
Date: 2026-10-29. Status: planning only; **DO NOT WRITE APP CODE until critical blockers resolved and founder authorizes development**.

## Recorded latest decisions
Approved: Required/Optional module dependencies with conflict checks (ADR-007), Commission Plan controls opener rule precedence (ADR-008), SQL Server VPS + PWA IndexedDB per-device offline queue initial architecture (ADR-009). Existing: all tender methods selectable regardless of connectivity; shift/day provisional then reconciled final. Next.js + NestJS recommended application stack.
**UNDECIDED:** (1) offline customer credit / global cap, (2) pending electronic tender disposition and provider verification, (3) negative inventory costing, (4) offline sale posting against closed month. None should be silently defaulted by Cursor.

## Business-policy blocking questions / scenarios
B1 Offline credit: two independently disconnected tills sell to one customer with credit limit 1000, each trying 800 — whether provisional posting, reserved caps, or later review? UI may select Credit, but unconfirmed debt must not bypass approved hard limit.
B2 Electronic payment: POS selects wallet/transfer/card offline without verifiable authorization — invoice can be draft/pending/posted with what receivable status? Failure after sync? Never assert provider PAID without evidence.
B3 Stock cost: product on-hand zero, two offline sales at negative quantity, later purchase at higher price — what interim COGS and correction entries? Selecting method at Business level alone does not settle cost algorithm.
B4 Late month: sale occurred Oct 31 and syncs Nov 3 after October payroll, tax and GL closed — record original occurredAt and choose posting period/adjustment and audit approach.

## Technical pre-code checks (owner/developer review)
- SQL Server version/edition, VPS RAM/storage/backup recovery, separate DB access and migration policy.
- PWA browser/devices, IndexedDB persistence and secure offline auth time limit, data loss drill; no forced local backup promise.
- ORM/migration SQL Server support and schema constraint strategy.
- Multi-tenant scopes / compound FKs / optional RLS proof of concept, API authorization matrix.
- Data retention/privacy, target countries and configurable tax basics.
- Commission Plan conflict resolution/rounding; Module manifests and activation permission billing decisions.

## Cursor work packages AFTER gates and explicit go-ahead
0. Add repository structure and ADR-based acceptance test checklist, no feature implementation without approval.
1. Next.js UI shell, NestJS service, SQL Server schema migrations and test container/database; authenticated Tenant/Business/Branch context and RBAC isolation tests.
2. Core immutable financial entities, journals/receivables, tender select/verify, outbox/inbox idempotency.
3. POS catalog/cart/drafts, invoices/refunds and cashier shifts, cash counts and provisional day closing.
4. Inventory/Purchasing and salon service Recipe; refund stock handling, negative-stock review.
5. HR Commission Plan/employee ledger/payroll; targets and opener rewards.
6. PWA IndexedDB offline queue, local auth, sync failure/replay, loss incident and reconciliation.
7. End-to-end test, staged pilot, documented rollback and backups.

## Mandatory test acceptance
20 duplicate offline submissions => one posted invoice, stock movement, journal, commission; cross-Tenant requests denied; pending provider tenders never settled; credit limit safe across concurrent devices; negative stock flagged and valued consistently; late close reconciliation audited; salary deduction separate from approved cash shortage; accounting debits=credits.

## File status
All designs are proposals, not runtime code, not production migrations. Unresolved B1-B4 forbid work on their dependent monetary flows until policy approval. Founder explicitly asked not to begin coding while critical requirements remain.


## Financial founder decisions resolved — 2026-10-29

ADR-010 approved: offline credit is locally recorded immediately and exceeding limit is flagged/reviewed after sync. This is an explicit offline-only exception to online hard-limit enforcement; excess credit remediation still to design.
ADR-011 approved: electronic tender recorded using customer-provided evidence; mismatches later reviewed. Customer evidence does NOT equal independently verified settlement and cannot mark provider PAID.
ADR-012 approved: last known cost provisionally on negative inventory, then a linked adjustment after later purchase; missing cost / multi-receipt strategy TBD.
ADR-013 approved: preserve original sale date, post late offline sale journal to open period with documented adjustment; statutory tax period review TBD.

Prior B1-B4 questions are now answered at founder product-intent level, but the execution gate still needs exact payment, credit-remediation, tax, storage/security and infrastructure contracts. See [Readiness Gate](IMPLEMENTATION-READINESS-GATE.md). **Do not write code absent owner's explicit permission.**

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**


## Infrastructure/offline pre-code review — 2026-10-29

The environment and offline-security verification checklist is now documented at [INFRASTRUCTURE-OFFLINE-PRECODE-CHECKLIST.md](INFRASTRUCTURE-OFFLINE-PRECODE-CHECKLIST.md). SQL Server on VPS and IndexedDB PWA are architecture decisions, NOT proof of deployable configuration. Verify database edition, available capacity, off-host backup restore, target POS browsers, storage eviction, offline authentication and Tenant isolation before production. **Checklist created only: no server accessed and no code written.**


## POS Windows target verification — 2026-10-29

Approved initial device category: **Windows Browser**. [Windows PWA/IndexedDB Offline Test Plan](WINDOWS-POS-OFFLINE-TEST-PLAN.md) lists 20 evidence-driven tests. Chrome/Edge support versions, kiosk/shared Windows profiles, offline auth TTL and SQL Server deployment checks require selection. No coding or tests performed; explicit founder authorization still required.


## SQL Server driver recommendation — 2026-10-29

See [Data Access Selection](SQLSERVER-DATA-ACCESS-SELECTION.md): node-mssql + tedious recommended for explicit transactional financial writes; TypeORM/Prisma compared, not selected as final without proof. No dependencies installed or code written.


## New pre-code design gate: module ecosystem and user experience — 2026-10-29

Before code permission, obtain founder approval for V1 module taxonomy, Core/Extension boundaries, synchronous interface/event contracts, global module release vs Business activation flow, WhatsApp integration, clinic pack separation, and DRVO-branded Odoo-inspired UI. Review drafts: [Module Ecosystem](../02-architecture/MODULE-ECOSYSTEM-DISCOVERY.md), [UI](../02-architecture/ODOO-INSPIRED-UI-DISCOVERY.md), [Cashier reuse](CASHER-REUSE-DISCOVERY.md). Do NOT treat draft as final decisions.


## Module App Launcher decision — 2026-10-29

ADR-015 ACCEPTED: every user-facing Module is an independent App tile, not grouped into Finance/Sales/Operations super-apps. The backend is still a Modular Monolith and SQL Server remains one shared V1 database. [Registry, dependencies and contract design](../02-architecture/MODULE-REGISTRY-DEPENDENCIES-CONTRACTS.md) is an engineering draft: activation workflow, precise dependencies, paid prerequisite approval, extension visibility, event ownership and critical accounting consistency remain pre-code architecture gates. **No coding authorized.**


## Module activation UX accepted — 2026-10-29

ADR-016 founder-approved: selected Module plus **all Required prerequisite Modules and applicable costs** displayed in a single activation preview, approved once as a bundle. No silent paid activations or forced separate manual prerequisite installs. See [ADR-016](../05-decisions/ADR-016-BUNDLED-REQUIRED-DEPENDENCIES.md) and [Module Lifecycle/Communication Contracts](../02-architecture/MODULE-LIFECYCLE-AND-COMMUNICATION-CONTRACTS.md) for DRAFT implementation state machine, idempotency, event contracts, activation rollback tests and remaining design gates. No code authorized.


## Approved Industry Solutions / scalable SaaS product-line direction — 2026-10-29

Founder approved **ADR-017** Shared Platform Kernel + reusable Business Modules + bounded Industry Extensions + **independent Domain Modules** for fundamentally distinct processes + versioned Industry Solution compositions + optional Add-ons, and **ADR-018** repeatable industry intake/Fit-Gap/productization and growth-aware SaaS architecture. **Do NOT** implement one fork per industry, confuse common labels with identical domain invariants, force Manufacturing/Clinical/Education/Property domains into huge Booking or POS extensions, or build speculative unused extensions. Every Module still exposes a Core+Extension contract (ADR-006); visible activated apps independent (ADR-015); dependency/cost preview approved as bundle (ADR-016).

**Before developer authorization:** produce Core/Extension/Domain boundary matrix for Salon modules and at least conceptual Clinic/Education/Real Estate/Manufacturing fit-gaps; decide Industry Solution manifest/versioning, interfaces/event ownership, per-Business activation and pricing, original DRVO sector catalog and internal Platform Control Center permissions; define minimum financial consistency test boundary. First commercial V1 remains Salon and Cut Salon. V1 SQL Server single shared DB; no multi-database routing/sharding or isolated Enterprise deployment now. Preserve tenant-aware data boundaries and plan future growth only when evidenced by load tests/SLO needs. Developer to read [Industry Architecture](../02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md), [New Industry Playbook](NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md), [Scale & Control Center](../02-architecture/SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md). These are docs; **NO CODE PERMISSION**.


## Founder-approved conditional Domain boundaries — ADR-019 (2026-10-29)

**No mandatory Industry Domain Module per solution.** Classify by true domain invariants/aggregate ownership: stable shared lifecycle → Shared Core; bounded policy/resource variation → Industry Extension; independent entity/state/security/financial workflow → new Domain Module (with its own Core+Extension contract). Salon barber/chair, executor/opener and consumables are candidates for bounded Extensions; distinct Salon service execution **only if independently owned lifecycle justifies**. Clinic records and Manufacturing/MRP are candidate separate domain ownership stress tests, NOT V1 deliverables. See [ADR-019](../05-decisions/ADR-019-CONDITIONAL-DOMAIN-MODULE-BOUNDARY.md) and [Boundary Matrix](../02-architecture/CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md) for per-capability proposal. Next pre-code work: ratify Salon owner/boundary map and mandatory financial event consistency, then Module Registry and industry manifest details. **Do not write app code, SQL migrations or deploy without explicit permission.**


## Founder-approved startup-small and Salon V1 scope — ADR-020 (2026-10-29)

DRVO is to let each Business start with a minimum valid **industry/workflow-specific** app bundle and add independently released compatible Modules and Extensions later. Build a progressive installation architecture (registry, typed contracts, stable domain references, required dependency validation, Business entitlements, audit and idempotent activation) without speculative unsupported modules. **Salon V1 explicitly excludes a standalone Service Execution Module**: use Booking + POS + HR/Payroll + Inventory + bounded Salon Extensions for appointment/barber, invoice/service attribution, commission/targets and consumable recipes. **Do not silently remove founder-approved comprehensive Salon commercial V1 functions**; per-Business minimal activation is not a lower platform release scope. Future multi-step execution needs a distinct design and release if justified. See [ADR-020](../05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md) and [Incremental Module Growth](../02-architecture/INCREMENTAL-BUSINESS-MODULE-GROWTH.md). Module catalogs, hard prerequisites and cross-module financial consistency remain pre-code gates. No coding authorized.


## Pricing and DRVO UI Kit documentation — 2026-10-29 (DRAFT, no implementation)

Founder requested pricing architecture and a reusable Odoo-inspired visual/interaction kit. Review [SaaS Pricing Draft](../01-product/SAAS-PRICING-STRATEGY-DISCOVERY.md) and [DRVO UI Kit Blueprint](../02-architecture/DRVO-ERP-UI-KIT-BLUEPRINT.md). **Neither pricing tiers nor final design tokens are approved.** Preserve ADR-021 editable recommended starters, ADR-016 explicit cost preview, ADR-015 independent App tiles, ADR-020 progressive modules. Do not copy Odoo Enterprise code/assets, or start React/Storybook/Figma implementation from drafts. No code authorization.


## ADR-022 UX direction / detailed kit and Hybrid pricing — 2026-10-29

**APPROVED:** Odoo-familiar navigation and multi-view ERP UX using original simpler DRVO branding; preserve independent Apps, role/Biz/Branch scope, Arabic RTL/English LTR, finance/offline statuses. **DRAFT, not code-approved:** [App Shell](../02-architecture/DRVO-APP-SHELL-UX-SPEC.md), [Tokens/Components](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [View Patterns](../02-architecture/DRVO-VIEW-AND-SCREEN-PATTERNS.md). No Odoo proprietary code, assets or unauthorized pixel clone. Hybrid [Pricing Analysis](../01-product/HYBRID-PRICING-MODEL-ANALYSIS.md) remains commercial study; actual fees/billing meters, premium Module inclusions and trial remain unapproved. **Before UI implementation:** founder reviews original DRVO high-fidelity App Shell, List/Form, App Store/Starter, Booking, POS and Financial document screens, RTL/LTR, roles, density and failure states. No app code, Figma file, component library or deployment authorized yet.


## Founder-approved Hybrid Navigation choice (ADR-023) — 2026-10-29

**Approved:** one global Shell and independent user-facing App Launcher, with Module navigation chosen from a controlled family: Sidebar for hierarchical modules, horizontal tabs for shallow modules and focused Workspace for operational POS/Booking when warranted. Never force Sidebar on all apps or create unrelated branded shells. Shared List/Form UX, permissions, Business/Branch context and RTL/LTR must remain consistent across variants. **Detailed measurements and Module pattern assignments are still design proposals**, not approval to implement. Read [ADR-023](../05-decisions/ADR-023-HYBRID-NAVIGATION-BY-MODULE.md), [Hybrid Nav/RTL/App Launcher](../02-architecture/DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md) and [List/Form detailed](../02-architecture/DRVO-LIST-FORM-UX-DETAILED.md). Test with 390px RTL owner, 1366×768 POS, accounting journal and Customers list, plus full financial/error states. Hybrid subscription pricing still only a DRAFT. **No code, migration or deploy authorization.**


## ADR-024 accepted DRVO color palette — 2026-10-29

**APPROVED BRAND BASELINE:** Plum `#74536E`, Deep Plum `#553E53`, Action Teal `#1A7B80`, Neutral Canvas `#F7F6F8`, White Panels `#FFFFFF`, Main Text `#27242B`. Replaces earlier unapproved green-first proposal. Original DRVO design must be used consistently in App Launcher, Accounting List/Form and Salon Windows POS with ADR-023 Hybrid Navigation. Avoid huge decorative Home hero displacing current Apps/tasks, but final visual choice is still pending. Icons, typography, semantic status colors/hover/focus ramps and measured layout need accessibility/RTL testing and further visual sign-off. Read [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md), [Updated Tokens](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md). **No React/Figma kit coding, SQL migration or deployment authorized.**

# Project changelog

## 2026-10-28 — POS state machine / shift lifecycle design drafts

- Confirmed single distinct opener; 10% opening commission on after-discount before-tax service price; automatic refund reversal.
- Founder accepted cash surplus in variance account until proven sale and append-only manager corrections preserving original settlement.
- Created proposed POS State Machine and Shift Lifecycle specs, including guards, states, events, tests and unresolved design questions.
- **Specifications only; no implementation, schema, or deployment.**



## 2026-10-28 — POS discovery round 4

- Recorded seven cash/day/shift responses, including last cash custodian responsibility and separate approval for deductions.
- Captured explicit salon upsell scenario: Mohamed 10% opener commission; Youssef sole executor and target owner.
- Flagged cash surplus sales classification and editing approved journal adjustments for accounting/audit design.
- Day closing and offline fiscal reconciliation remain open; no code implemented.



## 2026-10-28 — POS discovery round 3

- Captured 12 founder responses on shared treasury, cashier shifts, cash differences, post-payment attribution corrections, offline sales and employee tips.
- Documented shortage-to-cashier and surplus-as-sales requested policy with accounting/workforce compliance concerns; no automatic journal classification or payroll deduction approved.
- Deferred attribution percentages, offline close and treasury transfer design.
- No implementation or deployment.



## 2026-10-28 — POS discovery round 2

- Captured 15 payment, refund, credit, tips and staff attribution answers.
- Approved separate tips, configurable payment methods, mixed-tender debt, refund controls and automated target/commission reversal outcome.
- Deferred attribution scenario, percentage rule, closed-day behavior and payroll posting details.
- No software implementation claimed.



## 2026-10-28 — POS Core discovery round 1

- Recorded 12 founder decisions covering invoices, staff attribution, drafts, split tender, credit, corrections and shifts.
- Tracked ambiguity between one service executor and multiple revenue/commission beneficiaries.
- Added payment/refund/offline follow-up questions; no code implemented.



## 2026-10-28 — Permission and QR follow-up

- Approved Allow-only + Default Deny RBAC evaluation.
- QR card must be used only by its owner with additional verification; actual purpose remains unspecified.
- Discount Engine rules and precedence are not yet approved.
- No feature implementation claimed.



## 2026-10-28 — RBAC matrix discovery

- Recorded founder's approved RBAC choices and ten unanswered operations.
- Captured ID/QR card discount concept; clarified that security and recipient semantics are unresolved.
- Added open questions for permission evaluation, delegation, discounts and accounting.
- No RBAC or discount feature implemented.



## 2026-10-28 — Identity & Access discovery

- Recorded 12 founder responses, approved global usernames and login model.
- Documented Owner/Manager account creation, explicit Business Membership, one role per Branch and recovery/session policies.
- Logged unresolved Deny, role hierarchy and privilege escalation controls. No code implemented.



## 2026-10-28 — Tenancy final follow-up

- Confirmed manager access to profit/cost within authorized management scope.
- Confirmed Business-only currency, language, timezone settings; no Branch overrides.
- Left Module Dependencies undecided for detailed architecture review.


## 2026-10-28 — Tenancy discovery (40 answers)

- Confirmed Tenant > Business > Branch, separate Business brands/accounting and Tenant-wide summaries.
- Confirmed Branch-specific stock/treasury/shifts, shared intra-Business customers, price overrides and multi-Branch staff.
- Confirmed Tenant-scoped accounts, hierarchical RBAC, customizable roles and sensitive-action audits.
- Confirmed Business-level module enablement, multiple extensions, preserved data on deactivation and admin approval for paid modules.
- Confirmed shared database with isolation, expected scale and deferred questions.
- Added discovery record and Tenancy Architecture blueprint; no code implemented.



## 2026-10-28 — Final MVP discovery clarification

- Retain Cut Salon booking site; connect to DRVO Booking API.
- Accept cash-only offline sales with reviewable shortages found after sync.
- Defer manual journal-entry design decision until Accounting Module discovery.
- Allow internal development tests before one comprehensive commercial V1 launch.
- Updated project state, roadmap and open risks; no implementation claimed.


## 2026-10-28 — MVP release strategy decisions

- Captured eight founder clarifications: founder + Cursor; flexible one-month goal; one comprehensive commercial V1.
- Cash-only offline sales with later synchronization; DRVO booking authority; all Cut Salon branches for validation.
- Full accounting required in V1; manual subscription collection precedes electronic gateway.
- Recorded outstanding architectural and rollout safety requirements. No code or deployment claimed.



## 2026-10-28 — MVP discovery round 2

- Captured all 20 founder responses as requested scope, without promising one-month feasibility.
- Documented scope/timing, offline, double booking, Cashier coexistence, printing and commercial-readiness risks.
- Added explicit open questions and linked the roadmap/current state. No code deployed.


## 2026-10-28 — Product discovery follow-up decisions

- Approved **medical clinics as the second vertical**, superseding Retail-second commercial rollout.
- Confirmed complete ERP as **long-term vision with staged release delivery**.
- Approved **Egypt and Gulf from initial commercial launch strategy** (specific countries/regulations still open).
- Approved **Responsive Web / PWA** for first mobile channel.
- Confirmed **Core + Extension for every module without exception**; exact architecture contracts still open.
- Confirmed **Cut Salon as first real-world pilot**.
- Updated vision, discovery answers, roadmap, architecture and open questions.
- **No application code, production DB or deployment claimed.**

## 2026-10-27 — Documentation foundation

- Created the DRVO ERP documentation baseline and navigation.
- Recorded agreed strategic architecture direction and open decisions.
- Status remains planning.


Offline POS 2026-10-28: independent per-device queues, local re-authentication for previously verified staff, and permissioned pre-sync correction confirmed. Founder requested broader tender support; provider-dependent confirmation, shift closing, and late sync remain unresolved. See docs/03-modules/OFFLINE-SYNC-SPEC.md and SHIFT-CLOSING-WORKFLOW.md. These are design drafts, not implemented.

## 2026-10-28 — Offline shift closure follow-up

- Confirmed provisional shift close and final reconciliation for pending local sales.
- Confirmed cash count includes all actually received offline cash.
- Confirmed automatic retries plus Manager-visible sync errors.
- Offline electronic payment confirmation remains undecided; updated engineering draft, no implementation.


## 2026-10-28 — Offline day close and API/data draft

- Approved provisional financial-day close and later final reconciliation.
- Approved device-loss incident with manual cash reconciliation, not guaranteed restoration.
- Electronic payments during outage deferred for per-method discussion.
- Added proposed offline API contracts and logical database model; technical names/schema are not approved. No code implementation or deployment.



## 2026-10-29 — POS technical design

Added draft POS logical data model, Accounting Events and module integration boundaries. Documents include tenant-scoped data integrity, invoice/payment/refund separation, idempotent outbox, one executor and optional distinct opener, and offline queue reconciliation. No app or database was implemented.


## 2026-10-29 — Accounting Core discovery round 1

- Created Accounting Core and Chart of Accounts documentation based on 16 founder answers, including unanswered/deferred points.
- Reconciled immediate posting, permissioned period reopening and limited audit scope against immutable posted journals and necessary provenance.
- No accounting schema or backend implementation.


## 2026-10-29 — Treasury discovery

- Recorded 8 founder answers and created Treasury Core specification.
- One branch treasury, separate shifts, manager-approved transfers and large expenses, permissioned balances and movements; bank reconciliation deferred.
- No treasury backend deployed.


## 2026-10-29 — HR & Commission discovery

- Recorded 12 founder decisions; created HR Commission Engine and Employee Ledger logical drafts.
- Reconciled service/employee-variable opener rate with previously fixed 10% example, advance offsets with separate shortage-deduction approval, and per-branch attribution.
- Documentation only, no code or database deployed.


## 2026-10-29 — Inventory and Purchasing discovery

- Documented 11 approved founder decisions; deferred cross-Business inventory transfer question.
- Added compact Inventory Core and Purchasing Core design specs with direct purchase, Recipe-based material consumption, stocktake and low-stock alerts.
- Reviewed POS offline negative stock and Accounting valuation implications; no code deployed.


## 2026-10-29 — Cross-module architecture review

Added ARCHITECTURE-READINESS-REVIEW.md: reconciled historical rule conflicts, listed seven design gates, proposed implementation sequencing, and scoped financial/tenant data integrity checks. Documentation only.


## 2026-10-29 — Technology architecture

- Recorded founder SQL Server selection and recommended Next.js + NestJS/TypeScript modular-monolith stack.
- Created Technology Architecture baseline and phased V1 plan, with tenancy, offline, financial safety and prerequisite decision gates.
- No source code, migrations, infrastructure changes or production deployment.


## 2026-10-29 — Final architecture decision round

- Approved ADR-007 Module Dependencies, ADR-008 Commission Plan precedence, ADR-009 SQL Server VPS / IndexedDB PWA as initial storage.
- Created Cursor preimplementation plan and listed four explicitly undecided financial policy blockers.
- No code, deployment or migration executed.


## 2026-10-29 — Four final financial founder decisions

- Added ADR-010 offline credit with post-sync over-limit review (offline exception to previously approved global hard stop).
- Added ADR-011 customer evidence of electronic payment with later reconciliation (not verified provider payment).
- Added ADR-012 temporary last known cost for negative stock and correction on later receipt.
- Added ADR-013 late offline sale dates retained and accounting adjustment in open period.
- Added implementation readiness gate and updated Cursor plan. No code/deployment; explicit owner authorization still required.


## 2026-10-29 — Technical sign-off draft

- Added technical sign-off checklist covering offline credit overruns, unverified electronic proof, missing historical stock cost, late-period taxes and infrastructure/device readiness.
- Retained unresolved operational policies and explicit no-code gate.

## Founder technical sign-off decisions — 2026-10-29 (approved)

1. **Offline credit over-limit:** retain all previously registered offline sales; once sync reveals exceeded credit limit, suspend further credit sales for that customer until authorized Manager review. Online strict cap remains. Do not silently erase transactions.
2. **Unverified customer electronic payment evidence:** open outstanding amount / collection-review case when claim fails verification. Customer screenshot or reference alone is not processor settlement; no fabricated confirmed payment. Identified customer receivable versus anonymous customer collection exception must be distinguished.
3. **Negative stock without last known cost:** record stock quantity movement, leave inventory cost explicitly PENDING until a reliable cost is determined. Never invent zero cost or fictional COGS; final financial accounting exception workflow remains required.
4. **Late offline sale after month close:** preserve original sale date and post linked adjustment into the current open accounting period, **without a separate additional manual tax review step** by default. This is a workflow preference, not a waiver of mandatory local tax laws, filing obligations, or jurisdiction-specific validations before production.

These four points supersede earlier open recommendations in this document. **Technical sign-off for these business behaviors is approved; overall production/implementation authorization is NOT given. No coding without explicit founder permission.**


## 2026-10-29 — Windows POS offline qualification planning

- Founder selected Windows Browser initial POS hardware category.
- Added 20-case Windows PWA/IndexedDB test plan covering restart, failure recovery, multi-device replay, site-data loss, payments and reconciliation.
- Linked into infrastructure checklist and Cursor plan; no tests or code executed.


## 2026-10-29 — VPS pre-code audit runbook

Created read-only audit instructions, with explicit unexecuted status: no direct SSH connection available, so no server facts verified. No code or server changes.


## 2026-10-29 — Founder selection: independent module Apps

- ADR-015 accepted: each user-facing module is independently visible like Odoo, no default navigation mega-app grouping.
- Created Module Registry/Dependencies/Contracts engineering specification, explicitly draft.
- Linked documents in architecture, current state, decision register, Cursor plan and open questions.
- No application code, SQL migration or deployment executed.


## 2026-10-29 — Bundled module dependencies approved

- ADR-016 accepted: preview Required transitive dependency bundle with prices and receive one explicit approval to activate it together.
- Added detailed proposed BusinessModule lifecycle, platform release vs tenant activation, versioned command/event contracts, outbox, idempotency and test matrix.
- Synced ADR register, module registry draft, Cursor plan, open questions, current state. No code or DB changes.


## 2026-10-29 — Founder approved multi-industry DRVO product-line and long-term SaaS scale direction

- ADR-017: platform Kernel + reusable business Core/Modules + narrow Extensions + independent Vertical Domain Modules + versioned Industry Solutions. Continue Core+Extension for every Module; do not clone each sector or stretch generic Booking/CRM across unrelated domains.
- ADR-018: reusable industry discovery/Fit-Gap/productization lifecycle and future search-based 100+ sector catalog, customer per-Business app launcher, separate DRVO Platform Control Center; distinguish sector count, Tenant count and enterprise workload.
- Documented hypothetical large Egypt timber importer/supplier/manufacturer: Import/Landed Cost, Manufacturing/MRP, quality, stock costing, migration/QA and reuse/productization.
- V1 remains Salon/Cut Salon, Clinic second, ONE SQL Server database. Future multi-pool or dedicated deployments are options, not current scope or performance guarantee.
- New canonical docs: Industry Solutions Architecture, New Industry Onboarding Playbook, SaaS Scale Catalog & Control Center; updates to docs index, ADR register, vision, architecture, module catalog/registry/lifecycle, UX, roadmap, Cursor pre-code plan and state/open questions.
- **Documentation changes only. No app code, DB migrations, tests, deployment, server changes or sign-off to start programming.**


## 2026-10-29 — Founder accepted conditional Core/Extension/Domain Module boundaries

- ADR-019 Option B accepted: separate Domain Modules only where lifecycle/ownership/privacy/financial invariants justify them; use bounded Extensions for variation of truly shared business logic; no compulsory industry mega-app.
- Added draft per-capability classification matrix for Salon V1 plus Clinic and Manufacturing stress tests, documenting Salon Service Execution as candidate, not mandatory; Clinic Clinical Records and Manufacturing/MRP separate-domain candidates only.
- Linked the decision into architecture, module registry/lifecycle, docs index, Cursor plan, current state, open questions and ADR register. **Documentation only; no app code, DB migration, tests or production actions.**


## 2026-10-29 — Approved essentials-first Business activation and Salon V1 module scope

- ADR-020: Business starts with minimum dependency-valid starter and may add compatible Modules/Extensions later without customer-specific system forks.
- Founder explicitly ruled out a standalone Salon Service Execution Module in V1; Booking/POS/HR/Inventory + Salon Extensions still own existing service functions, commissions, attribution and recipe consumption.
- Added Incremental Business Module Growth architecture spec; updated boundaries, registry/lifecycle, Cursor pre-code plan, catalog, ADR register and documentation index.
- Documentation only; no application code, SQL migration, server testing or deployment.


## 2026-10-29 — Founder approved Odoo-familiar DRVO visual/interaction direction (ADR-022)

- New ADR-022: Odoo-familiar App Launcher, standard ERP views and navigation with original DRVO visual identity, lower user complexity, RTL/LTR and financial/offline clarity.
- Detailed DRAFTS: App Shell UX Specification, Design Tokens & Components, ERP View/Screen Patterns. None are finished/approved visual designs or code assets.
- New Hybrid Pricing Analysis (still DRAFT): Business base + branch/seat allowance + optional premium modules and usage; compared with current public Odoo pricing for reference, not DRVO prices.
- Linked new drafts to ADR register, docs index, current state, preimplementation plan and open questions. No code, SQL migration, production change or generated Figma kit.


## 2026-10-29 — Founder accepted Hybrid Navigation per Module (ADR-023)

- ADR-023: global DRVO Shell with controlled Sidebar/Tabs/Workspace variants according to workflow; consistent independent App Launcher, authorizations and RTL/LTR. Supersedes proposal for compulsory sidebar on every app.
- New draft specs: Hybrid Navigation / measurement candidates / App Launcher / RTL-LTR, plus detailed List/Form UX with financial/error/saved-filter and record transition semantics.
- Synced decision register, App Shell, tokens, View Patterns, UI Kit Blueprint, docs index, Current State, Open Questions and Cursor pre-code plan.
- All numerical UI measurements/colors/Module assignments remain **proposals** pending founder visual review. No product code, SQL migrations, visual Figma kit or production changes.


## 2026-10-29 — Founder approved DRVO Plum + Teal + Soft Neutral color baseline (ADR-024)

- Official palette (replacing green-first DRAFT): Plum `#74536E`, Deep Plum `#553E53`, Action Teal `#1A7B80`, Canvas `#F7F6F8`, white surfaces and Main Text `#27242B`.
- Defined broad use across App Launcher, Accounting List/Form and Windows POS; no unlicensed Odoo source/assets. Customer Home should favor actionable Apps/KPIs over oversized decorative Hero (exact absence/reduced size still open).
- Recorded ADR-024, replaced old palette candidate in Tokens, synchronized UI Kit/Hybrid navigation/App Shell, ADR register, docs index, Current State, Open Questions and Cursor preimplementation plan.
- Contrast ratios for five proposed text-background pairs checked numerically; full design usability/WCAG sign-off not complete.
- Documentation only; no code, Figma project, migration or Production deployment.


## 2026-10-29 — Founder approved ERP Professionalism × Duolingo-inspired Clarity (ADR-025)

- ADR-025: original DRVO UX North Star — serious system, friendly surface; standard Odoo-grade ERP Views/Apps with Duolingo-inspired clarity, restrained feedback and user-task fit. No source/assets copied and no finance gamification.
- New UX North Star Playbook: Guide/Work/Analyze experience calibration, 12 screen laws, roles, feedback, accessibility and handoff checks.
- New three-screen visual review brief: separate App Launcher/Home, Accounting List/Form and Salon Windows POS concepts in approved Plum/Teal palette; image mockups are conversational design exploration, not deployed screens or GitHub binary files.
- Cross-linked UI Kit, App Shell, List/Form, Tokens, index, Current State, Open Questions and Cursor pre-code plan.
- Documentation only: no app code, SQL changes, Figma source file, tests or deployment.


## 2026-10-29 — Founder approved Business Theme Architecture and profession-specific Character/Motion UX

- ADR-026 accepted: each Business can customize validated color palettes and centrally selected/uploaded **licensed fonts**, with single-point Typography/Theme tokens across Apps, tenant-aware safe resolution, auditing, rollback, accessibility and protected financial statuses. ADR-024 DRVO Plum/Teal remains default/fallback.
- ADR-027 accepted: original profession Character Family, industry scene registry (house/storefront, salon, clinic, manufacturing etc.) and meaningful optional flip/other motion for guided pages, with reduced-motion/static fallbacks and no checkout/finance disruption.
- Founder explicitly rejected earlier screen **layouts**; preserve liked graphical character/house elements only, not distribution of Home/Accounting/POS UI elements.
- Created deep Theme Engine & Custom Font Asset Blueprint plus Character/Illustration/Motion Blueprint, covering ownership/role governance, safe font uploads, original art licensing, scene map, motion fallback and V1 architecture seams vs optional rollout.
- Linked ADR-026/027 with Design Tokens, UX North Star, UI Kit, visual review, decision index and Cursor Pre-Code Plan. Documentation only; no app code, SQL migration, new design assets, font files or production deployments.


## 2026-10-29 — Founder accepted Soft 2.5D × Miniature 3D art pairing (ADR-028)

- New ADR-028: Soft Editorial 2.5D original profession Character Family combined with coherent miniature/isometric 3D-looking buildings/scenes, visual style only.
- New Art Direction Concept Pack 01 documents Barber Character, Salon Storefront, Real Estate House and optional scene.flip storyboard with reduced motion/static fallbacks and identity/theme independence.
- Visual explorations shared in conversation are concept art boards, **not** approved final illustration assets or editable Figma/GitHub product files. All previously rejected ERP screen element layouts remain rejected.
- ADR index, ADR-027 character guidelines, Character & Motion Blueprint, UX review, docs index, Current State, Open Questions and Cursor plan synced. No code/SQL or deployment.


## 2026-10-30 — Founder sets the non-negotiable DRVO ERP Three-Pillar Architecture Mission (ADR-029)

- Founder intent made the **highest project-level architecture rule**, not an optional vision footnote: build an Egypt-scale ERP platform, extensible into any target industry without separate code forks and operable across micro-to-very large customers by functional Module composition PLUS separately verified infrastructure/capacity scalability.
- Added top-level [Founder Architecture Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), accepted [ADR-029](../05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md), and detailed design [Universal ERP Fitness Gates](../02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md).
- Linked as **mandatory first reading** in START-HERE and README; embedded into Product Vision, Architecture, Industry Solutions, SaaS Scale Catalog, Modules, Industry Onboarding, Incremental Growth, Cursor Pre-code Gate, Change Protocol, Current State and Open Questions.
- Explicitly reject equivalence of extra Modules with higher SQL/operational throughput and unsupported claims about universal/enterprise readiness. Existing V1 Modular Monolith and shared SQL Server unchanged; future placement and capacity changes only on evidence. No coding, SQL migration, test, server or production changes.

# DRVO ERP documentation index

> **FOUNDATIONAL FOUNDER MISSION — READ BEFORE ALL OTHER DOCS:** [DRVO ERP Architecture Charter: Egypt-scale platform × Any Industry × Micro-to-Enterprise](00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md). Enforced by [ADR-029](05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md) and [Universal ERP Architecture Fitness Gates](02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md). All architecture/module decisions must assess all three pillars. This is a strategic mission, not current verified enterprise capacity.


## Required reading for a new developer or AI agent

1. **[Founder Architecture Charter — mandatory first](00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md)**
2. [Start here](00-start-here/START-HERE.md)
3. [Current state](00-start-here/CURRENT-STATE.md)
4. [Product vision](01-product/VISION.md)
5. [Architecture](02-architecture/ARCHITECTURE.md)
6. [Module catalog](03-modules/MODULES.md)
7. [Roadmap](04-execution/ROADMAP.md)
8. [Decision register](05-decisions/DECISIONS.md)
9. [Open questions](04-execution/OPEN-QUESTIONS.md)
10. [Change protocol](04-execution/CHANGE-PROTOCOL.md)
11. [Changelog](04-execution/CHANGELOG.md)

## Multi-industry architecture (approved direction)

- [ADR-017: Shared Core + Industry Solutions](05-decisions/ADR-017-SHARED-CORE-INDUSTRY-SOLUTIONS.md)
- [ADR-018: Industry expansion and SaaS scaling direction](05-decisions/ADR-018-INDUSTRY-EXPANSION-AND-SCALE-STRATEGY.md)
- [Industry architecture and Core/Extension boundary](02-architecture/INDUSTRY-SOLUTIONS-ARCHITECTURE.md)
- [ADR-019: Conditional Domain Module boundaries](05-decisions/ADR-019-CONDITIONAL-DOMAIN-MODULE-BOUNDARY.md)
- [Core / Extension / Domain boundary matrix — Salon, Clinic, Manufacturing](02-architecture/CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md)
- [New Industry Onboarding Playbook — timber manufacturing example](04-execution/NEW-INDUSTRY-ONBOARDING-PLAYBOOK.md)
- [100+ industry catalog, scale, and Platform Control Center](02-architecture/SAAS-SCALE-CATALOG-AND-CONTROL-CENTER.md)

## Working agreements

- Never confuse **approved/planned** with **implemented/tested/deployed**.
- A decision change requires an ADR and updates to affected specifications.
- An implementation change requires relevant tests, status update, and verification evidence.
- Avoid credentials, secrets, customer data, and production dumps in docs.
- Use relative links. Prefer one canonical document per topic.
- Document uncertainty instead of inventing a decision.


## Progressive per-Business module strategy (founder-approved)

- [ADR-020 — Start each Business with essentials; no Salon Service Execution Module in V1](05-decisions/ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md)
- [Incremental Business Module Growth — architecture design](02-architecture/INCREMENTAL-BUSINESS-MODULE-GROWTH.md)


## Industry Starter selection

- [ADR-021 — Recommended and customizable industry starter](05-decisions/ADR-021-CUSTOMIZABLE-RECOMMENDED-INDUSTRY-STARTER.md)
- [Industry Starter and Activation — design draft](02-architecture/INDUSTRY-STARTER-AND-ACTIVATION-DESIGN.md)


## Pricing and UI/UX discovery drafts — 2026-10-29

- [SaaS Pricing Strategy Discovery](01-product/SAAS-PRICING-STRATEGY-DISCOVERY.md) — candidate commercial models, no DRVO prices approved.
- [DRVO ERP UI Kit Blueprint](02-architecture/DRVO-ERP-UI-KIT-BLUEPRINT.md) — Odoo-inspired component/view/template system, not an implemented kit.


## Accepted DRVO UX direction and detailed design reviews — 2026-10-29

- [ADR-022 — Odoo-familiar ERP UX, original DRVO identity](05-decisions/ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md) — founder-approved direction.
- [ERP App Shell UX Specification](02-architecture/DRVO-APP-SHELL-UX-SPEC.md) — **draft** navigation/role/responsive rules.
- [Design Tokens & Components](02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md) — **draft** colors, dimensions, controls and states; not approved brand colors.
- [Reusable ERP Views & Screen Patterns](02-architecture/DRVO-VIEW-AND-SCREEN-PATTERNS.md) — **draft** List/Form/Kanban/Calendar/Graph/Pivot/POS designs.
- [Hybrid Pricing Model Analysis](01-product/HYBRID-PRICING-MODEL-ANALYSIS.md) — **commercial study only**, no approved prices.


## Hybrid Navigation approved; detailed UI handoff drafts — 2026-10-29

- [ADR-023 — Unified DRVO Shell, Hybrid Navigation by Module](05-decisions/ADR-023-HYBRID-NAVIGATION-BY-MODULE.md) — accepted principle; exact navigation layout not visually signed off.
- [Hybrid Navigation, App Launcher, RTL/LTR and Measurement Candidates](02-architecture/DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md) — detailed UX **DRAFT**.
- [List/Form Detailed UX](02-architecture/DRVO-LIST-FORM-UX-DETAILED.md) — shared record/search/finance/permission behavior **DRAFT**.


## Founder-approved DRVO visual palette — 2026-10-29

- [ADR-024 — Plum + Teal + Soft Neutral DRVO palette](05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md) — accepted six principal colors; accessible component states, typography and page-level designs still require review.
- [Updated Design Tokens](02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md) — replaces the superseded unapproved green-first candidate.


## Founder-approved ERP × everyday-simplicity UX North Star — 2026-10-29

- [ADR-025 — ERP Professionalism × Everyday Simplicity](05-decisions/ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md) — accepted product UX philosophy: Odoo structure, Duolingo clarity, DRVO identity.
- [DRVO UX North Star Playbook](02-architecture/DRVO-UX-NORTH-STAR-PLAYBOOK.md) — guidelines for guidance, density, feedback, financial truth and module reusability.
- [App Launcher + Accounting + POS Three-Screen Visual Review](02-architecture/DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md) — design exploration, **not** final screens or code.


## Founder-approved Business theming + industry illustration experience — 2026-10-29

- [ADR-026 — Per-Business Theme, safe palette and centralized selectable/uploadable fonts](05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md) — architectural direction accepted; implementation details pending.
- [Business Theme Engine & Font Assets Blueprint](02-architecture/BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md) — draft technical contract, license/security/preview and fallback policy.
- [ADR-027 — Original profession Character Family, Scene Registry and purposeful Motion](05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md) — design direction accepted; asset packs/motion not yet produced.
- [Character, Illustration & Motion Blueprint](02-architecture/CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md) — draft industry packs and optional flip/scene transition.
- [Visual Review](02-architecture/DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md) — previous screen **layouts explicitly rejected** by founder; do not implement them as-is.


## First DRVO Character art direction selected — 2026-10-29

- [ADR-028 — Soft 2.5D characters + Miniature 3D-inspired industry scenes](05-decisions/ADR-028-SOFT-2_5D-CHARACTERS-MINIATURE-3D-SCENES.md) — selected visual direction, no final art approved.
- [Art Direction Concept Pack 01 — Barber, Salon Storefront, Property House & Flip Storyboard](02-architecture/DRVO-ART-DIRECTION-FIRST-CONCEPT-PACK.md) — design handoff draft. Earlier UI layouts are still rejected.


## Strategic architecture guardrail — founder mandate 2026-10-30

[ADR-029](05-decisions/ADR-029-THREE-PILLAR-UNIVERSAL-ERP-ARCHITECTURE.md) makes the 3 pillars enforceable: Egypt-scale product foundation, expansion into **new industries through Core/Extensions/Domain Modules/Industry Solutions**, and progressive functional **plus independent operational/infrastructure scalability** from micro Business to enterprise. [Project Charter](00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md) and [Fitness Gates](02-architecture/UNIVERSAL-ERP-SCALE-AND-INDUSTRY-FITNESS-GATES.md) are mandatory for all new engineering choices; no unsupported “unlimited sectors / users” claims.


## Foundation engineering audit (documentation only) — 2026-10-30

- [Foundation Architecture Review — 12 prioritized gaps + 3 customer walkthroughs](02-architecture/FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) — strategic alignment is promising; financial consistency, Tenant scopes and activation/release contracts remain material design blockers.
- [Foundation Core Contracts Proposal](02-architecture/FOUNDATION-CORE-CONTRACTS-PROPOSAL.md) — trusted Tenant/Business/Branch context, module activation/extension/event contracts, first POS GL transaction A/B choice and future data-placement seam. Proposed **not** a selected technical stack/schema.

**Read before coding or adding new industry:** founder Charter → gap review → core-contract options → accepted ADRs → implementation readiness gates. No physical DB/code/benchmark validation has taken place.


## Phase-0 Tenant Isolation Contract and threat tests — 2026-10-30

- [Tenant/Business/Branch Isolation Contract](02-architecture/TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md) — proposed detailed security ownership/scope contract, with approved product requirements distinguished from pending SQL/role decisions.
- [40 Adversarial and Negative Authorization Tests](02-architecture/TENANT-ISOLATION-NEGATIVE-TEST-MATRIX.md) — test plan only; 0 executed.
- [ADR-030 Proposed Isolation Enforcement](05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) — **NOT APPROVED** as a physical DB/security design; founder/security sign-off needed before coding.


## P0 financial source-of-truth and recovery architecture — 2026-10-30

- [Financial Consistency Contract](02-architecture/FINANCIAL-CONSISTENCY-CONTRACT.md) — **PROPOSED** typed sale / Accounting GL / Treasury tender / stock cost / HR commission boundaries, honesty of statuses, source/effect dedupe, offline replay, refunds and period handling; preserves founder ADR-009–013.
- [46 Financial Negative/Recovery Tests](02-architecture/FINANCIAL-CONSISTENCY-FAILURE-TEST-MATRIX.md) — **design-only test specification**; zero executed.
- [ADR-031 — First Mandatory Accounting Journal Boundary](05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) — **PROPOSED, NOT APPROVED**: same-SQL atomic A recommended if measured performance permits; otherwise durable accepted/pending B with hard reconciliation barrier. No source-of-truth policy adopted or implementation authorized.


## Financial vertical slice: Sale → Ledger → Settlement — 2026-10-30

- [End-to-End Sale-to-Ledger Design Walkthrough](02-architecture/SALE-TO-LEDGER-END-TO-END-DESIGN-2026-10-30.md) — reusable transaction, source-of-truth status vector, recovery windows, optional downstream effects and micro/SME/Enterprise stress cases. **Design only, A vs B still open**.
- [Financial Account Mapping and Close Gates Design](02-architecture/FINANCIAL-ACCOUNT-MAPPING-AND-CLOSE-GATES-DESIGN.md) — cash custody, credit AR, unverified electronic claim, anonymous collection exception, closed period and cost-pending treatment; actual CoA/tax/receipt/close accounting sign-off **still OPEN**.
These documents elaborate [ADR-031 PROPOSED](05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) and preserve ADR-009–013, the founder [Three Pillar Charter](00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md), and the ban on code before separate authorization.

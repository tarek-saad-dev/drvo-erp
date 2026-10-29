# DRVO ERP documentation index

## Required reading for a new developer or AI agent

1. [Start here](00-start-here/START-HERE.md)
2. [Current state](00-start-here/CURRENT-STATE.md)
3. [Product vision](01-product/VISION.md)
4. [Architecture](02-architecture/ARCHITECTURE.md)
5. [Module catalog](03-modules/MODULES.md)
6. [Roadmap](04-execution/ROADMAP.md)
7. [Decision register](05-decisions/DECISIONS.md)
8. [Open questions](04-execution/OPEN-QUESTIONS.md)
9. [Change protocol](04-execution/CHANGE-PROTOCOL.md)
10. [Changelog](04-execution/CHANGELOG.md)

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

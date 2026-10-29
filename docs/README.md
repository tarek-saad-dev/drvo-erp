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

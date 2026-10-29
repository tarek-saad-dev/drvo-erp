# ADR-022 — Odoo Familiarity with a Simpler, Original DRVO ERP UI

**Date:** 2026-10-29
**Status:** ACCEPTED — founder explicitly selected Option A. Specific visual tokens, navigation layout, component variants and implemented toolkit remain DRAFT.
**Related:** ADR-015 independent user-facing App tiles; ADR-017/018 Industry Solutions; ADR-020 incremental Business capabilities; ADR-021 customizable recommended starter.

## Decision (founder-approved)

DRVO ERP will adopt **Odoo-familiar ERP interaction patterns** and high-functionality standard views while using its **own original visual identity** and simplifying daily workflows. The core goal is a single high-productivity UI Kit reusable across all Modules, Industries and role-specific experiences without copy/paste designs or custom UI for each vertical.

- Familiar **App Launcher** → independent authorized user-facing Module apps → contextual in-app navigation.
- Shared **List, Record Form, Search/Filters/Group By, Kanban, Calendar, Graph, Pivot and Dashboard** building blocks, chosen only where they improve the domain task.
- Original DRVO typography, brand palette, iconography, density, spacing, component shapes and interaction details; Arabic RTL/English LTR and accessibility designed into foundations.
- **Simpler than Odoo for the intended operator**: actionable first viewport, fewer navigation branches, minimal onboarding friction, progressive disclosure, fast frequent actions and quiet success states.
- The generic App Shell fits ordinary ERP operations. Windows POS gets a dedicated transaction-focused layout with offline/reconciliation status; it must still use shared design tokens and security patterns.
- UI is a product-level architectural contract: a new Module must integrate using the DRVO UI Kit and view-navigation/permission rules.
- The customer Industry Solution catalog and internal DRVO Platform Control Center are separate experiences; do not show 100 industries in the Business App Launcher.

## Intellectual property and code policy

This approval is **NOT** permission to fork/clone Odoo's proprietary Enterprise UI assets or source. Reuse generic interaction *ideas* and original implementations only; copying Community code would require a separate license-compliance review (Odoo Community 19 is LGPLv3; Enterprise 19 has a separate license). Do not copy Odoo logo, marks, icons, distinctive pixel-perfect compositions or proprietary templates. See Odoo official view and license docs below.

## Official external references (verified 2026-10-29)
- https://www.odoo.com/documentation/19.0/developer/reference/user_interface/view_records.html
- https://www.odoo.com/documentation/19.0/applications/studio/views.html
- https://www.odoo.com/documentation/19.0/th/legal/licenses.html
- https://www.odoo.com/pricing

## Implementation-neutral deliverables before coding

1. App Shell navigation and action hierarchy: [DRVO App Shell Specification](../02-architecture/DRVO-APP-SHELL-UX-SPEC.md).
2. Style tokens, component variants, interaction and state mapping: [DRVO Design Tokens & Components](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md).
3. Reusable view layouts and document workflows: [DRVO ERP View Contracts](../02-architecture/DRVO-VIEW-AND-SCREEN-PATTERNS.md).
4. Detailed visual mockups/prototypes and handoff tests still required; the above docs do not constitute a rendered/interactive Figma Kit.
5. Pricing is a separate **open commercial** question; Hybrid remains a study recommendation, not founder-approved amounts or packaging: [Hybrid Pricing Design](../01-product/HYBRID-PRICING-MODEL-ANALYSIS.md).

## Explicitly undecided
- Exact brand colors/fonts/logomark, theme and light/dark scope.
- Exact topbar/sidebar placement and collapsed behavior, density default, component sizes and responsive breakpoints.
- Which views/commands are in V1 vs later, saved filters and user personalization.
- First actual visual prototypes and approval, Figma/design ownership, accessibility/performance test criteria.
- Real price points, billing unit/plan and free/paid module inclusion.

**No UI code, framework/library build, SQL migration, Figma file, image asset creation or deployment authorized.**

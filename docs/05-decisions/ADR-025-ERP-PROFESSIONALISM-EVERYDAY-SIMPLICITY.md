# ADR-025 — DRVO UX North Star: ERP Professionalism × Everyday Simplicity

**Date:** 2026-10-29
**Status:** ACCEPTED PRODUCT/DESIGN DIRECTION — Founder explicitly endorsed combining Odoo-grade ERP sophistication with Duolingo-inspired clarity, friendliness, interaction polish and ease of use, and requested formal documentation plus three UI concept explorations.
**Scope:** Foundational design philosophy, not approved final screens, interaction timings, new pricing rules, app code or deployment.
**Related:** ADR-015 independent Apps; ADR-017 Industry Solutions; ADR-020 incremental business configuration; ADR-021 editable starter; ADR-022 original Odoo-familiar DRVO UI; ADR-023 hybrid navigation; ADR-024 Plum/Teal colors.

## North Star

> **Professional enough for accounting. Simple enough for a cashier. Friendly enough for everyday use.**
>
> **Odoo structure, Duolingo clarity — DRVO originality.**

DRVO ERP must be deep, accurate and extensible beneath the surface while feeling straightforward, fast and welcoming to someone using it every day. Build a **serious system with a friendly surface** — not Odoo UI copied literally, not a gamified/childish ERP, and not an intentionally feature-poor system.

## Approved principles

1. **Clarity before decoration.** Prioritize comprehensible hierarchy and immediate useful actions. Avoid a hero banner or decorative noise pushing actual tasks below first viewport.
2. **Progressive disclosure, not feature deletion.** Reveal simple tasks first; expose advanced filters, complex fields, audits and configuration when appropriate to the role/task. Expert capabilities remain available without unnecessary friction.
3. **One clear primary next action.** Use coherent task priority, but keep critical secondary professional actions accessible; do not artificially force complex accounting tables into a one-button-only view.
4. **Stable professional grammar.** A single DRVO UI Kit and Odoo-familiar List/Form/Kanban/Calendar/Document family, consistent across shared and industry-specific Modules. Hybrid Sidebar/Tabs/Workspace navigation remains governed by ADR-023.
5. **Fast, responsive, trustworthy feedback.** Every interaction indicates pending/completed/failed state. Use small tasteful transitions, lightweight visual acknowledgement, and clear recovery. Never show a fake successful payment, invoice posting, offline sync, or ledger settlement.
6. **Helpful, calm, human copy.** Explain what happened and the smallest useful next step; avoid cryptic error codes and unnecessarily alarming banners. Avoid condescension, game-like celebrations for financial transactions and aggressive behavioral nudges.
7. **Right density for the role.** Onboarding/owner Home can be spacious and intuitive; accounting, inventory and reporting retain compact professional data density; cashier POS maximizes flow speed. A single mandatory density for all screens is not the goal.
8. **Teach through real tasks.** First-use guidance is contextual and dismissible: help a new Business reach a first real outcome without a maze of forms/steppers; experts can skip coaching. No forced mascot.
9. **A delightful but restrained motion language.** Consider hover/tap tactile affordance, transition continuity, useful empty states and optimistic nonfinancial transitions. Honor reduced-motion. Financial finality always depends on backend truth and audit.
10. **One system, many industries.** New Modules consume a reusable UI Kit; industry-specific workflows can use trusted specialized widgets without breaking global typography, color semantics, RBAC or interaction patterns.
11. **Arabic-first precision.** RTL/LTR, number/ID/currency isolation, keyboard ergonomics, readable Arabic table data, accessibility and branch/business context are first-class.
12. **Scale through measured usability.** Test actual Owner, Manager, Cashier and Accountant flows, not just beautiful static mockups; verify errors, loading, disabled, interrupted, offline and permission states.

## What to borrow / what NOT to copy

| Source | Learn from | Do not transplant |
|---|---|---|
| Odoo | Robust ERP models, standard views, extensible navigation conventions, search/filter/group, dense business workflows | Enterprise source/assets, marks/icons, pixel-perfect proprietary theme, overly deep menus where simpler pattern works |
| Duolingo | Reduce complexity, explain next step, intentional visual hierarchy, consistency, friendly feedback, detail-level craft and measured user testing | Green/owl brand/mascot, streak pressure, XP, childish typography, confetti on money, deceptive success and distraction-heavy animation |
| DRVO | Original Plum + Teal + Soft Neutrals, modular Business/Industry Solutions, role/task focus, unique language, trustworthy cash/offline states | A different visual system per Module or copied third-party branding |

## Experience strategy: three calibrated modes (design model, not separate products)

- **Guide / First win:** Onboarding, first Business, choosing Starter, optional capability introduction. Plain language, one next step, clear data and price previews (ADRs 016/021).
- **Work / Daily rhythm:** Business Home, Booking, POS, Customer records and HR. Short action path, contextual shortcuts, meaningful notifications and useful recent/favorite tasks without noise.
- **Analyze / Pro control:** Accounting, Treasury, Inventory, Finance and enterprise workflows. High density, powerful filters/Views, bulk action safeguards, immutable history, auditability and explicit statuses.

Users are not locked to a mode; the same platform can surface different density and guidance per role and task, with transparent preferences and equivalent correctness controls.

## Concrete screen guidance (DESIGN PROPOSALS, pending founder visual review)

### Business Home / App Launcher
- Above fold: Business/Branch context, 3–4 meaningful real KPIs, one actionable attention queue, independent authorized Module tiles, a compact Quick Action cluster.
- Apps take precedence over lifestyle imagery/marketing hero. Starter can have a friendly unobtrusive guidance prompt for first invoice/booking rather than tutorial wizard.
- No fabricated KPI, “green” health, unread count, fake account balance or unsupported progress meter.

### Accounting List + Record Form
- Search/filter, familiar accessible table, compact density, strong row scanning, clear invoice/GL state and one obvious primary action.
- Inline quick detail/drawer only for safe preview or draft edit; full document for financial posting, reconciliation, reversal and complete audit.
- Advanced controls available in one well-labeled place; no hidden accounting facts, optimistic posted badges or confetti.

### Salon POS — full-screen Workspace
- Single dominant workspace: searchable services/products and readable cart. Assign barber/executor with minimal actions, easy modifier/discount only when allowed.
- Payment selection and final confirmation show actual amount, method, branch, cashier and verification/sync state.
- Tiny tactile response on safe add/remove; offline queued ≠ posted/reconciled. Windows keyboard and performance take priority over decorative effects.

## Delight and ethics boundaries
- Small success animation for completing non-financial setup or adding a permitted optional module **after verified activation**.
- No reward mechanics for posting more invoices, spending more, or closing accounting tasks without review.
- Users can disable tips and motion; contextual help does not block experienced workflow.
- Accessibility is part of component behavior, not decoration.
- Avoid false optimism: if backend posting, reconciliation, payment, entitlement or sync is pending, reflect that truth explicitly.

## Technical implications (design proposal, not code authorization)
- UI Kit consumes trusted, versioned Module-defined navigation/view contracts but source-of-truth business data/permissions remains server-owned.
- Reuse declarative view configs for stable List/Form/Calendar without cloning Odoo XML blindly or allowing arbitrary executable customer UI.
- Progressive disclosure is a presentation policy, not removal of required fields, approvals, taxes, accounting controls or security protections.
- Visual regression, RTL/LTR checks, keyboard workflows and realistic task tests are necessary before implementation.
- Any future experiments should be reviewed, safe and measured; Duolingo's Server-Driven UI is research inspiration, not a decision to implement an SDUI runtime.

## Success measurement proposals (NOT approved thresholds)
- First meaningful Business outcome reached (first usable configuration/invoice/booking), with no hidden finance dependencies or surprise charges.
- Task time / clicks / mis-taps for sale, booking, correction, customer lookup and report.
- Accounting/finance user task success and error-recovery rate, not only superficial happiness.
- Time to find an installed Module or a needed action across 4, 10 and 20+ Apps.
- Cashier POS keyboard time-to-sale, offline failure clarity, no duplicate financial submit.
- Accessibility/RTL usability tests and error-state comprehension.

## References from official public sources (research, not third-party source code)
- Odoo 19 web framework: https://www.odoo.com/documentation/19.0/developer/reference/frontend/framework_overview.html
- Odoo 19 view records: https://www.odoo.com/documentation/19.0/developer/reference/user_interface/view_records.html
- Duolingo principles, including Reduce complexity and Test it first: https://blog.duolingo.com/operating-principles/
- Duolingo visual clarity and minimal illustrations: https://blog.duolingo.com/shape-language-duolingos-art-style/
- Duolingo design consistency and core tabs refinements: https://blog.duolingo.com/core-tabs-redesign/
- Duolingo technical SDUI description (inspiration only): https://blog.duolingo.com/server-driven-ui/

## Deliverables and remaining approvals
- [UX North Star Playbook](../02-architecture/DRVO-UX-NORTH-STAR-PLAYBOOK.md) — actionable experience guidelines and handoff.
- [Three-screen Visual Review Brief](../02-architecture/DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md) — App Launcher, Accounting, Salon POS.
- Initial illustrative screen images may be shared in conversation; **not** a committed GitHub binary/Figma file or final designs.
- Next design signoffs: screen-by-screen layout, typography, density, interaction variants, component states, offline/financial badges, responsive RTL/LTR.

**No app code, SQL migrations, deployed UI library, Figma or production changes authorized.**


## Founder extension — Character Art + Business Theme, ADR-026 / ADR-027 (2026-10-29)

The founder expressly approved a custom **DRVO profession-specific Character Family, industry illustrations and carefully targeted motion** (with interest in house/building illustration and an optional flip page/scene transition), while expressly **rejecting all previous mockup layouts** as final compositions. This **does not** contradict the no-third-party-mascot/no-gamified-accounting boundary above: use original licensed professional character art for onboarding, selected empty states, industry discovery and optional home hints, not over financial journals, POS checkout, HR payroll or other sensitive workflow. Each Business may have its own validated brand palette and licensed custom-selected/uploaded fonts through one centralized Typography/Theme Engine, while system statuses remain protected. ADR-024 is the default/fallback palette, not a forced tenant palette. [ADR-026](ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md), [ADR-027](ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md). No code/visual asset implementation authorized.

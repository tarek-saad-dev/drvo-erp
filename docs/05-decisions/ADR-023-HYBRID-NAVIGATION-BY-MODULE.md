# ADR-023 — Hybrid Navigation by Module, One Consistent DRVO ERP Shell

**Date:** 2026-10-29
**Status:** ACCEPTED — founder explicitly chose Option C. Exact measurements, final mapping, RTL placements, screenshots and component interactions are DRAFTS pending visual/UX review.
**Related:** ADR-015 Independent App tiles; ADR-017 Industry Solutions; ADR-020 progressive Modules; ADR-021 editable Starter; ADR-022 Odoo-familiar patterns with original simpler DRVO identity.

## Context
DRVO ERP must support many independently activated modules and industry-specific workspaces. An enforced persistent Sidebar for every Module wastes space in simple apps and high-throughput cashier operations; topbar-only navigation becomes unwieldy for complex accounting/inventory and enterprise departments. An uncontrolled mixture would undermine UI familiarity and usability.

## Founder-approved decision: Option C
**Use a unified DRVO ERP Shell with Hybrid in-module Navigation chosen according to the Module's actual task and information architecture.**

- **Global persistent context remains consistent**: DRVO/Apps entry, current Business, Branch when scoped, authorized user, notifications/tasks, search entry, account/help and system statuses.
- **Navigation pattern varies by workload**, from a limited approved family:
  1. **Context Sidebar** for multi-section, hierarchical admin apps (e.g., Accounting, HR/Payroll, Inventory).
  2. **Horizontal/Contextual Tabs** for small shallow apps or settings sections (e.g., small Customers app, selected Settings pages).
  3. **Focused Workspace** for operational workflows demanding full canvas and speed (e.g., Windows POS, Booking calendar where appropriate).
- Every Module is independently opened in the Business App Launcher (ADR-015), regardless of navigation variant; Industry Solution is a composition and never itself a forced mega-app.
- Navigation differences do **not** mean different brands, component libraries, search semantics, RBAC, business/branch scope or screen-status vocabulary. Module must declare one primary supported navigation pattern and clear justified exceptions; avoid changing pattern unexpectedly between records.
- **RTL/LTR** is foundational: logical start/end mirroring, accessible directional controls, stable numbers/IDs/currency meaning, correct keyboard order.
- All patterns support accessible keyboard navigation, clear back/breadcrumb behavior, responsive fallback and correct permission/entitlement enforcement.
- Financial workflows are never considered “Posted/Settled” merely because a UI button completed; offline, reconciliation, approval and error states remain honest.

## What the decision does not approve
- Exact Sidebar/topbar widths, breakpoints, font/palette, menu animation, specific per-App nav pattern list, List/Form dimensions, or a particular left/right placement; these are documented as testable design proposals.
- A full Odoo UI clone, Odoo proprietary assets or source reuse; ADR-022 originality and license boundaries stand.
- A Figma kit, React component code, view-engine runtime or product implementation.
- Any pricing policy; Hybrid SaaS pricing remains under separate commercial analysis.

## Implementation-neutral rules for future design sign-off
1. Create one `NavigationPattern` concept (draft: `sidebar | tabs | workspace`) in the trusted Module UI contract; enforce a documented mapping, not a per-user/per-page ad-hoc choice.
2. Global Shell and App Launcher own cross-module switching; Module owns own authorized navigation graph; shared kit renders consistent patterns.
3. If an App genuinely needs two modes (Booking admin list vs full-screen resource calendar), switching mode must be a declared explicit workspace action with predictable back/navigation and preserved context.
4. If a user's viewport changes, navigation may collapse/drawer, without changing authorized page hierarchy or dropping unsaved data.
5. Verify with POS, Accounting, Customers, Booking and industry-specific future stress tests before freezing UI tokens.

## Design references
- [Hybrid Navigation, RTL and App Launcher Detailed Specification](../02-architecture/DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md)
- [List and Form UX Detailed Specification](../02-architecture/DRVO-LIST-FORM-UX-DETAILED.md)
- [App Shell UX specification](../02-architecture/DRVO-APP-SHELL-UX-SPEC.md)
- [Design Tokens & Components](../02-architecture/DRVO-DESIGN-TOKENS-AND-COMPONENTS.md)

**Documentation only. No code, design implementation, migrations, tests or production deployment authorized.**

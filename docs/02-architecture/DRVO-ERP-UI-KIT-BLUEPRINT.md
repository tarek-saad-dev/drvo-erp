# DRVO ERP UI Kit Blueprint — Odoo-Inspired, DRVO-Owned Design System

**Date:** 2026-10-29
**Status:** DESIGN/DISCUSSION DRAFT, not final visual approval, Figma kit, code library or implemented UI.
**Goal:** deliver a coherent, high-productivity ERP interface across every Module, Industry Solution, language, role and device without redesigning shared primitives.

## 1. Reference research and rights boundary
- Odoo 19 web-client organization: https://www.odoo.com/documentation/19.0/developer/reference/frontend/framework_overview.html
- Common views (list, form, kanban, graph, pivot, calendar): https://www.odoo.com/documentation/19.0/developer/reference/user_interface/view_records.html
- Odoo Studio view patterns: https://www.odoo.com/documentation/19.0/applications/productivity/studio/views.html
- Odoo licenses: https://www.odoo.com/documentation/19.0/th/legal/licenses.html
- DRVO can learn **generic UX patterns** (consistent app launcher, CRUD views, action bar, search, keyboard-first work, density, responsive ERP lists) and independently build comparable behavior. Do **not** transplant Odoo Enterprise code/assets, trademarks, proprietary icons, themes, screenshots or pixel-for-pixel proprietary UI as DRVO product assets. Odoo 19 Community uses LGPLv3; any actual reuse of Community source requires license review and compliance. Build **original DRVO identity** and own assets.
- “Clone” here means a **feature-pattern parity / reusable UX Kit**, not a source-code fork or a claim DRVO is Odoo.

## 2. User environments / personas
- Owner: Tenant → Business switcher, high-level profit/cash/reporting, subscription, Apps.
- Manager: Branch selection, exception queue, team management, treasury/financial permissions.
- Cashier: dedicated fast full-screen POS on Windows browser, visible offline/sync state.
- Operational users: barbers, stock operators, accountants and future industry employees with role-specific menu/actions.
- DRVO Platform operator: separate **Platform Control Center**, never ordinary customer app privileges.
- First languages Arabic RTL and English LTR (correct mirrored directional layout, numerical/date behavior); Egypt/Gulf locale, tax/currency independent of label language.

## 3. Visual foundation: proposed tokens, NOT founder-approved brand palette
- **Design philosophy:** minimal cognitive load, ERP density where necessary, generous whitespace on landing/onboarding, familiar consistent affordances, no distracting motion in transactional workflows.
- **Surfaces:** neutral canvas, subtly distinct sidebar, white/light cards, optional high contrast and dark theme later.
- **Accent:** DRVO proprietary brand color(s) to be selected after comparison; do not borrow Odoo proprietary iconography or purple style indiscriminately.
- **Semantics:** error, warning, success, info never depend only on color; written statuses and accessible icons required.
- **Spacing:** 4px grid, suggested scale 4/8/12/16/24/32/40/48; numerical tokens rather than hardcoded screen-by-screen.
- **Sizing:** comfortable vs compact data-density mode; document row heights, form field heights and hit targets consistently.
- **Type:** Arabic screen/system font with excellent numerals, Latin font with compatible metrics; explicit number alignment and tabular figures, font scale for huge data tables.
- **Borders/elevation:** restrained surfaces, thin dividers, consistent focus rings, menu/dropdown/dialog shadows.
- **Responsive:** Windows desktop POS priority; 1440/1280px admin patterns, tablet, 390px phone for owner review and limited operations; avoid assuming complex inventory/financial tables are usable as-is at 390px.
- **Motion:** short meaningful transitions, disabled animation where reduced motion, no cinematic motion in cash/journal flows.
- **Accessibility:** target WCAG 2.2 AA; keyboard-only paths, visible focus, RTL reading order, labels, semantic errors, screen-reader roles, status text, contrast and zoom.

## 4. ERP App Shell
- Primary shell: DRVO logo + App Launcher, active Business selector, optional Branch selector, breadcrumbs/context, scoped global search, notifications/needs attention, help, user menu.
- Module navigation: per-App page groups and remembered view state; menus are filtered by **activation + permission**, and API server checks remain authoritative.
- Separate **Apps Store** from active App Launcher. 100+ industry catalog belongs to marketing/solution onboarding, not the employee's app grid.
- Search and command palette: searchable Apps, recent records, business-scoped actions (future); no accidental cross-Tenant results.
- Tab/route persistence: URL reflects filters/record where safe; back/forward works; no unnecessary full reload on app switching.
- Branch context is always visible where money or inventory is branch-scoped, avoiding cross-branch edits.

## 5. Atomic UI components inventory
**Base:** AppIcon, Button, IconButton, Link, Tooltip, Badge/StatusPill, Chip, Avatar, Skeleton, Spinner, EmptyState, Alert/InlineError, Toast, Modal/AlertDialog, Drawer, Popover, Menu, Tabs, Accordion, Step/Progress, Separator, ProgressIndicator, KeyHint.
**Forms:** Text/Number/Currency/Percent/Date/Time/Datetime input, Select, ComboBox, Autocomplete, RelationPicker, LookupDrawer, Checkbox, Radio, Switch, FileUpload, DocumentPreview, FormSection, FieldError, DirtyState, SaveDiscardBar, ValidationSummary, PermissionGuard.
**Data:** DataTable with column sizing/reordering/visibility, selection, bulk actions, sortable headers, saved filters, group-by, pagination/virtualization where needed, sticky columns, aggregated totals, row action menu, keyboard shortcuts and empty-loading-error variants.
**Visualization:** StatCard, Trend/Graph, Pivot, KanbanBoard/Card/Column, Calendar/AvailabilityGrid, Timeline, ActivityFeed, DocumentJournal, Comments and Attachments.
**Finance/status:** Money, AmountDue, Posted/Draft/Reversed indicator, CurrencyCode, LedgerRow, AuditTrail, Confirmation requiring reason, ReconciliationStatus, SyncState/OfflineQueue, Warning for unverified payment.
**Commerce/workflows:** AppTile, AppStoreCard, DependencyList, EntitlementTag, ActivationQuoteSummary, WorkflowStepper, ApprovalStamp, ConflictResolutionPanel.

## 6. Generic view engine contract (UI-level proposal)
- `ListView`: table, search, saved filters/grouping, columns, bulk select, export/print if authorized; keyboard navigation.
- `FormView`: stable header/title/state/action bar, sections, tabs, audit/history; editable Draft vs immutable Posted, reasoned reversal/correction flows.
- `KanbanView`: defined statuses, card actions and drag/drop only when allowed; undo/audit semantics.
- `CalendarView`: day/week/month, time zone, resources, conflicts, drag/reschedule with server validation and permissions.
- `Graph/Pivot`: analytics over role-scoped data with filters and protected totals; export only with permission.
- `DashboardView`: actionable KPI, overdue/exception list, drilldowns with traceable query/source.
- `DocumentView`: invoice, PO, journal, payroll close, stock count; header, line items, monetary totals, attachments, workflow history and immutable post state.
Module owns domain schema/API and permitted actions; generic view merely renders a declarative view configuration. **Do not recreate Odoo's XML engine blindly:** choose a minimal typed view definition suitable for DRVO/Next+React and real V1 demand. No runtime arbitrary user code.

## 7. Reusable screen templates
1. Public solution discovery/search + Industry Solution detail.
2. Login/invite/recovery (not copying Odoo identity).
3. Business setup: activity → recommended editable Starter → Required/cost preview → approval → setup done.
4. Business selector, branch selector and Business App Home.
5. Apps Store (Active/Available/Recommended/Unavailable); App details; subscription impact preview.
6. Generic list, generic record form, Kanban, calendar, pivot/chart and reporting dashboard.
7. Settings/roles/users, audit/notification and plan/billing screens.
8. Salon Booking calendar/resources, POS full-screen Windows, inventory & purchase documents, cash reconciliation, HR staff/commission, GL journals.
9. Multi-business Owner portfolio and future internal DRVO Control Center.
10. Offline/unsynced POS, permission denied, expired entitlement, saving, conflict, activation failure and finance pending review screens.

## 8. Interaction requirements (must be specified per template)
- Save vs Post vs Approve vs Refund vs Reverse are visibly different actions.
- Don't show a financial success state if a mandatory journal/stock posting is still pending. Clear error/retry/review states.
- Post/close/refund requires appropriate confirmation, reason and permission; user can inspect audit trail.
- Tables support filter, search, pagination, no-results, stale/error/loading, saved user preference and clear focus.
- Draft forms handle unsaved changes and refresh/navigation; do not silently discard.
- If optional Module unavailable, gracefully omit integrations; if Required missing, block prohibited operation with actionable explanation.
- RTL mirrors layout, not currency/ID/phone direction or signed amount semantics.
- Offline POS must distinguish local queued, server accepted, payment evidence awaiting verification and reconciled; prevent double submit via UI and backend idempotency.
- Business-specific theming can adjust brand logo and safe accent palette without breaking accessibility, semantic statuses or common layout.

## 9. UI Kit deliverables before application coding
**Design source** (future Figma or Canva editable design file): Tokens / Foundations → Components with variants and all states → Patterns → Page templates → Salon V1 reference screens → RTL/LTR examples.
**Design documentation**: named component matrix, props/states/behavior/accessibility, density rules, anti-patterns, action and security mapping.
**Interaction prototypes**: main flows with keyboard, mobile/Windows, partial network/failure/reconciliation and permission cases.
**Future code implementation** (only after explicit approval): matching React component package, Storybook or equivalent component documentation, visual regression tests, accessibility and localization tests. No code library exists yet.
**Design QA**: owner/manager/cashier tasks across all modules must use the same UI kit and not invent a new variant for every domain.

## 10. V1 acceptance / governance
- Validate at least: App Home, Apps Store+activation quote, new Business onboarding, List/Form with invoices, Booking calendar, POS Windows, financial reconciliation/error.
- UX metrics to set: time to first configured Business, steps to book customer, invoice submit latency and keyboard task completion, staff learnability, error recovery and supported density.
- Design reviews require Owner/Manager/Cashier role variants, RTL+LTR, desktop/mobile, normal/empty/loading/error/permission/offline/failure states.
- Source designs/tokens versioned; changing shared components must trigger impact review on all Apps/industries.
- Future sector adds domain-specific widgets only where generic views are insufficient; it must consume shared tokens/primitives/navigation and permission contracts.

## 11. Unresolved decisions
- **Color direction resolved ADR-024:** Plum/Teal/Soft-Neutral palette and six core hex values. Still open: final icons, typography, layout density, light/dark and full screen treatments.
- **RESOLVED ADR-023:** one Global Shell with controlled Hybrid Navigation per Module (Sidebar/Tabs/Workspace). **Still open:** exact per-Module pattern, physical RTL placements, responsive behavior and visual prototypes.
- The first launch V1 app tiles, permissions and screen hierarchy.
- Design tool (Figma vs Canva or another), component delivery method and source ownership.
- Saved views/filter/user customization depth in V1; the View Engine implementation scope.
- Mobile operation vs management-only pages; POS shortcuts/offline indicators.
- Pricing-plan presentation and whether included Recommended apps are preselected.

**This document is a detailed design blueprint, not an implemented UI Kit and not authorization to code.**


## Founder choice — 2026-10-29 (ADR-022)

**APPROVED DIRECTION:** Odoo-familiar app launcher, reusable ERP views and keyboard/workflow interaction patterns; **original DRVO** brand, simpler default surfaces and Arabic-first usability. It is not a copyright or source-code cloning decision. [ADR-022](../05-decisions/ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md) is authoritative for intent. Detailed DRAFTS: [App Shell](DRVO-APP-SHELL-UX-SPEC.md), [Design Tokens & Components](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [View & Screen Patterns](DRVO-VIEW-AND-SCREEN-PATTERNS.md). Exact colors/measurements and layouts remain awaiting founder visual sign-off; none are coded or available as editable Figma kit.


## Founder-selected Hybrid App Navigation — ADR-023 (2026-10-29)

The direction is accepted: unified DRVO global context and original design system, with Module-specific Sidebar, shallow Tabs or full-canvas Workspace based on workload. The Sidebar is NOT forced for every App. Detailed **draft** candidate measurements, App Launcher scope, RTL/LTR, List/Form interactions and accessibility are at [Hybrid Navigation](DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md) and [List/Form Detailed](DRVO-LIST-FORM-UX-DETAILED.md). Exact dimensions, colors, per-App mapping and Figma/React implementation are still not approved. [ADR-023](../05-decisions/ADR-023-HYBRID-NAVIGATION-BY-MODULE.md).


## Approved DRVO palette — ADR-024 (2026-10-29)

Founder approved **Plum + Teal + Soft Neutrals** as original DRVO identity influenced by Odoo ERP usability, without copied brand/assets. Primary Plum `#74536E`, Deep Plum `#553E53`, Action Teal `#1A7B80`, Page Canvas `#F7F6F8`, white panels `#FFFFFF`, Main Text `#27242B`. Replace earlier unapproved green-first swatches. In customer ERP, Plum communicates app/navigation context, Teal highlights primary actions, neutrals dominate List/Form/POS, and semantic financial/sync statuses remain distinct. Avoid oversized decorative Home Hero that pushes Apps/KPIs below first viewport; exact reduced/no-Hero treatment still open. This overrides historical references above saying 'exact colors unapproved' **only for the six accepted primary hex values**; exact font, semantic/interaction ramps, contrast of all components and page-level layout still require design review. [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md), [Tokens](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md).


## Founder-approved UX North Star — ADR-025 (2026-10-29)

DRVO is a **serious ERP system with a friendly surface**, blending Odoo-grade modularity/Views with Duolingo-inspired clarity, progressive disclosure, intentional craft, restrained delights and actual usability tests. It is NOT an Odoo clone, Duolingo-branded game, mandatory gamification or a proposal to hide accounting audit/financial truth. Experience calibrates into Guide/First Win, Work/Daily Rhythm and Analyze/Pro Control depending on task/role; all share ADR-023 Hybrid Navigation, ADR-024 Plum/Teal, trust-first financial/offline statuses and RTL/LTR. First visual concept work focuses App Launcher/Home, Accounting List/Form and Salon Windows POS. [Official ADR-025](../05-decisions/ADR-025-ERP-PROFESSIONALISM-EVERYDAY-SIMPLICITY.md), [UX Playbook](DRVO-UX-NORTH-STAR-PLAYBOOK.md), [Three-Screen Review](DRVO-UX-THREE-SCREEN-VISUAL-REVIEW.md). No coded components or final visual approval.


## Founder-approved Visual Experience Layer — ADR-026/027 (2026-10-29)

The three previously shown screenshot **layout compositions are rejected** by founder; do NOT extract layout specs/pixel designs from them. Founder wants a professional Odoo-depth ERP with friendly Duolingo-inspired **original** profession-specific Character Family, contextual Illustration Scenes (including property/house art) and controlled scene/page-flip motion where useful. Add an original Character/Scene Registry and Motion Grammar to the Design Kit; no mandatory character in Accounting, active POS or Payroll. In parallel, architecture **must support per-Business custom color palettes and licensed selected/uploaded fonts**. Typography and semantic theme roles resolve from ONE central Theme Engine; ADR-024 Plum/Teal is the default/fallback, not a compulsory customer theme. Maintain protected semantic status/contrast, RTL/LTR, license validation and static/reduced-motion fallback. See [ADR-026](../05-decisions/ADR-026-BUSINESS-THEMES-AND-CENTRAL-TYPOGRAPHY.md), [ADR-027](../05-decisions/ADR-027-INDUSTRY-CHARACTERS-SCENES-AND-MOTION.md), [Theme Blueprint](BUSINESS-THEME-ENGINE-AND-FONT-ASSETS-BLUEPRINT.md), [Character Blueprint](CHARACTER-ILLUSTRATION-MOTION-BLUEPRINT.md). Exact visual style, font selection, timings and launch surface remain pending. No code.

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
- Exact DRVO brand palette/icon direction, dense Odoo-like layout vs more relaxed landing; light/dark and theme scope.
- Universal topbar + per-app navigation shape; persistent left sidebar vs contextual menus in Arabic RTL.
- The first launch V1 app tiles, permissions and screen hierarchy.
- Design tool (Figma vs Canva or another), component delivery method and source ownership.
- Saved views/filter/user customization depth in V1; the View Engine implementation scope.
- Mobile operation vs management-only pages; POS shortcuts/offline indicators.
- Pricing-plan presentation and whether included Recommended apps are preselected.

**This document is a detailed design blueprint, not an implemented UI Kit and not authorization to code.**


## Founder choice — 2026-10-29 (ADR-022)

**APPROVED DIRECTION:** Odoo-familiar app launcher, reusable ERP views and keyboard/workflow interaction patterns; **original DRVO** brand, simpler default surfaces and Arabic-first usability. It is not a copyright or source-code cloning decision. [ADR-022](../05-decisions/ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md) is authoritative for intent. Detailed DRAFTS: [App Shell](DRVO-APP-SHELL-UX-SPEC.md), [Design Tokens & Components](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [View & Screen Patterns](DRVO-VIEW-AND-SCREEN-PATTERNS.md). Exact colors/measurements and layouts remain awaiting founder visual sign-off; none are coded or available as editable Figma kit.

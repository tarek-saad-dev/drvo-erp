# DRVO ERP — App Shell, Navigation and Responsive UX Contract

**Date:** 2026-10-29
**Status:** DESIGN DRAFT. ADR-022 approves Odoo-familiar original DRVO identity; ADR-023 approves **Hybrid Navigation depending on Module workload**. Exact sizes/layout/mapping below remain proposed.
**References:** [ADR-022](../05-decisions/ADR-022-ODOO-FAMILIARITY-ORIGINAL-DRVO-UI.md) · [UI Kit Blueprint](DRVO-ERP-UI-KIT-BLUEPRINT.md).

## 1. Product surfaces and routing responsibility

| Surface | Primary audience | Shell | Navigation boundary |
|---|---|---|---|
| DRVO public site / Industry catalog | New customer | Marketing shell | Industry → Solution page → signup |
| Setup / Starter wizard | New Business Owner | Quiet setup shell | Industry → editable modules → Required+price preview → approve → ready |
| Business Home / App Launcher | Owner/Manager/employee | ERP App Shell | Only ACTIVE and role-authorized apps; do not show every industry |
| Inside a Module | Authorized Business users | Shared ERP App Shell + Module context | Module owns menu/actions; UI Kit owns navigation/search layout |
| Windows POS | Cashier | Focused full-screen POS shell | Sale workspace, shift, local/offline status; fast keys, minimal distractions |
| Platform Control Center | DRVO internal operators only | Distinct admin shell | Tenants, releases, plans, health; tightly scoped access |

## 2. Stable Shell hierarchy

**Proposed desktop scaffold:**
1. **Global topbar:** DRVO home/app launcher, selected Business (always visible), selected Branch if context-dependent, page-scoped or global search entry, action/notification inbox, quick user/settings/help.
2. **Context Module navigation (ADR-023):** choose approved Sidebar, shallow Horizontal Tabs or Focused Workspace per Module; Sidebar is NOT universal. Module pattern is controlled by trusted UI manifest and justified task structure; do not duplicate generic app picker.
3. **Work area:** page breadcrumb or parent, page title/object identity, primary action + contextual secondary actions, search/filter/group toolbar, selected View tabs, content, pagination/bulk footer when relevant.
4. **Transient overlays:** confirmations, financial impact/approval, relation picker, large edit drawer, conflict resolution; overlays trap focus appropriately.
5. **System status:** only actionable sync, payment, permission, pending reconciliation or errors; no permanent noisy banners when healthy.

**Rule:** global navigation is common, Module content is domain-owned, and financial/auth state is authoritative from services. Hiding a menu entry is NEVER a substitute for API RBAC checks.

## 3. Example navigation IA (illustrative, not final V1 App list)

```text
DRVO     [Apps]    [Business: Cut Salon ▼]    [Branch ▼]    [Search]    [Alerts] [User]
┌──────────────────── Sidebar ──────────────┐ ┌─────────────────────────────────────┐
│ POS & Sales                               │ │ POS / Sales › Invoices              │
│ Overview                                  │ │ [Invoices]        [+ New Invoice]  │
│ Invoices                                  │ │ [Search] [Filters] [Group] [Views]  │
│ Customers (if permission/module)          │ │ Invoice list or other selected view │
│ Reports (if permission/module)            │ │                                     │
└───────────────────────────────────────────┘ └─────────────────────────────────────┘
```

RTL: logical start/end are mirrored, **not** the numerical meaning, record identifiers, phone numbers or currency signs. The example is a content model, not a final pixel design.

## 4. Work area and primary action rules
- One strong primary action per screen (New, Save, Post, Confirm, Start shift), secondary actions grouped without losing discoverability.
- List pages: title and aggregate count; search/filter/group + view selector; table; persisted filters and pagination state by route where safe.
- Form/document page: record title/ID + state, primary safe action for lifecycle, other commands in contextual action group, tabs/sections, audit/chatter/activity where permitted.
- Draft vs Posted actions must remain visually/semantically distinct; destructive actions require reason, permissions and audit.
- For long workflows allow drawers for quick edit, full route for complex form; preserve unsaved draft with explicit guard.
- Bulk selection and exporting protected by RBAC and potentially privacy policy; a selected Branch/Business must remain obvious.
- Notifications click through to the exact authorized object and scope, no cross-Business leakage.

## 5. Module app integration contract (proposed)
Module manifest supplies (conceptually): `moduleKey, label/i18n, original icon token, homeRoute, navGroups, requiredPermissions, viewDefinitions, supportedActions, errorStates, featureFlags`. UI Kit owns rendering, route transitions and reused view interaction. Server owns permission, real data and money.
Navigation and module availability are derived from BusinessModule state, subscription/entitlement, and user grants; active and entitled apps may still be hidden for users without permission.
- Missing optional module: omit optional toolbar and integrations safely.
- Suspended module: show reason, authorized remediation path and read-only historical access if legally/contractually permitted; no new financial writes.
- Required dependency missing: prevent invalid operation and explain dependency, rather than broken menu links.

## 6. Breakpoints / density proposals (must be tested)
- Large desktop: >= 1440px two-pane context navigation and full data tables.
- Laptop: 1024–1439px collapsible nav, responsive table with essential columns and optional horizontal scroll.
- Tablet: 768–1023px nav drawer and adjusted action menu.
- Phone: <768px simplified owner review dashboard/alerts and mobile-appropriate list/card workflows. Do not promise full detailed GL spreadsheets on 390px.
- Density modes: **Comfortable** (ordinary users) and **Compact** (financial tables/high-volume inventory) while maintaining keyboard focus and hit targets. Defaults not approved.
- Windows POS: target desktop browser layout for 1366x768 and 1920x1080 plus tested browser zoom and keyboard navigation. Offline queue and tender evidence must remain visible.

## 7. RTL / LTR internationalization
- Use logical start/end and direction-aware icons; no hardcoded horizontal assumptions.
- Phone, IBAN, SKU, invoice IDs, timestamps, signed amounts and emails need controlled bidi spans and number alignment; no reversed minus signs.
- Formatting comes from selected Business currency/timezone/locale policy, not language only; preserve canonical UTC instants where relevant.
- Arabic typography and numbers must remain readable at compact table density; keyboard arrow navigation and sorting match layout direction without changing data order.
- Right/left side placement is a **prototype decision**, not assumed by mere translation.

## 8. Status and interaction state matrix (required design handoff)

| State | Shell/content behavior | Must not do |
|---|---|---|
| Loading | skeleton contextual to table/form; no phantom totals | Show fake zero balances |
| Empty | clear explanation, first action if permission | Hide whether filtered vs truly empty |
| Error | actionable retry/details, preserve user draft | Clear unsaved work or claim success |
| Permission denied | explain missing permission/contact admin | Leak record fields through previews |
| Entitlement inactive | explain plan/pending approval/route to authorized owner | Auto-charge or access protected data |
| Offline POS | local queued indicator, last sync details | Label unsynced operation as server-posted |
| Payment evidence pending | explicit pending verification | Show final collected/settled funds |
| Posting/reconciliation pending | visible pending state and traceable reference | Display final reconciled badge |
| Financial posted | lock posted records and guide reversal/correction | Edit history in place |
| Activation failed | no active tile until verified; retry/audit option | Duplicate charge on retry |

## 9. Role-first test journeys
- Owner: select multi-Business > verify Branch scope > financial dashboard > app store > priced add-on approval.
- Manager: open shift discrepancy > approved correction > employee/treasury report without unrelated Business data.
- Cashier: open Windows POS > add service and executor > choose tender > confirm sale > offline sync feedback.
- Accountant: open Accounting list > filter posted journal > document view > export only if authorized.
- New user: choose Industry Solution > remove a Recommended module > see dependency/price update > approve coherent starter.

## 10. UX quality and acceptance checklist
- Keyboard and screen-reader operation of topbar/sidebar/menus, search, tables, modals, view switch, action confirmation.
- One logical focus ring and consistency between dialogs, drawers and full-page forms.
- Accessible labels/status not conveyed by icon/color alone; WCAG 2.2 AA target with tested contrast/focus.
- RTL + English snapshots for each base template; 390/768/1280/1440 desktop responsive checks.
- No accidental full reload and no loss of draft on navigation/refresh; prevent double submit; date/currency clarity.
- Main first screen should answer: **where am I (Business/Branch/Module), what matters now, what can I do?**
- Set measurable targets and perform user studies with real Salon cashier, manager and accountant before visual sign-off.

## 11. Open design review
1. **RESOLVED by ADR-023: Hybrid per Module.** Remaining: choose concrete Sidebar/Tabs/Workspace assignments and alternates, plus final global topbar design.
2. Home tile layout: compact app grid and owner summary density.
3. Search placement, action menu, saved filter and breadcrumbs behavior.
4. Exact logo, palette, font and icon system, compact table density and dark mode.
5. Functional mobile screen coverage and Windows POS ergonomics.

No code, mockup file, SQL migration or deployment authorized.


## Founder-approved Hybrid navigation — ADR-023 (2026-10-29)

**Option C accepted:** one global DRVO App Shell, with Module-specific navigation from controlled `sidebar | tabs | workspace` patterns. This *supersedes* earlier implication that all modules must always have a Sidebar. Desktop/Laptop/Tablet/Mobile dimensions remain **draft candidates**, not founder-approved token values. Read [Hybrid Navigation, RTL & App Launcher](DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md) for criteria, candidate 56px global bar/240px Sidebar/64px collapsed/44px tabs, RTL, active-only app launcher, permission/error states, and [List/Form Detailed UX](DRVO-LIST-FORM-UX-DETAILED.md) for behavior independent of navigation pattern. Modules never use arbitrary one-off shells. No code.


## Approved branded palette — ADR-024 (2026-10-29)

Founder accepted original DRVO **Plum + Teal + Soft Neutrals**: `#74536E` Primary Plum, `#553E53` Deep Plum, `#1A7B80` Action Teal, `#F7F6F8` Page, `#FFFFFF` Panel, `#27242B` Main Text. Use Plum for shell/app-selection context, Teal for primary actions and neutral content surfaces. Avoid a dominating decorative Business Home Hero that hides actionable modules/KPIs below viewport; exact small-versus-none still open. App Shell hybrid navigation (ADR-023), RTL/LTR roles and first viewport priorities remain unchanged. Color direction approved; exact nav geometry, fonts, app-tile treatments and finalized mockups await visual review. See [ADR-024](../05-decisions/ADR-024-DRVO-PLUM-TEAL-NEUTRAL-PALETTE.md).

# DRVO ERP — Hybrid Navigation, Measurements, RTL and App Launcher UX Specification

**Date:** 2026-10-29
**Status:** Detailed UX design PROPOSAL constrained by accepted ADR-023 (Hybrid per Module), ADR-022 (Odoo familiar + unique DRVO identity) and ADR-015 (independent App tiles). These exact geometry, default locations and module-to-pattern assignments are **NOT yet founder-signed-off**. No code.

## 0. Navigation philosophy / non-negotiables
- One global shell and one DRVO UI language; each Module chooses the smallest *effective* navigation from a controlled family.
- Every screen answers: **Which Business/Branch? Which Module/record? What can I do now? What needs attention?**
- Navigation is not a way to bypass module entitlements or server-side RBAC.
- No navigation elements just to look busy: menus reflect legitimate tasks and current role. Don't show positive health banners when everything is normal.
- Avoid a second top-level menu inside every Module. App selection is global; within-App navigation is contextual.
- Chosen industry affects available Modules and optional extensions, not a cloned layout or inconsistent Brand Kit.

## 1. Approved pattern family; proposed assignment

| Pattern | Use when | Examples (design proposals) | UI anatomy |
|---|---|---|---|
| `sidebar` | >3 main sections, nested operations, repeated switching, complex settings | Accounting, HR, Inventory, Purchasing | Global topbar + context sidebar + view work area |
| `tabs` | few shallow sections, high focus on records, minimal nesting | Customers, selected Settings and personal pages | Global topbar + tab/section nav + work area |
| `workspace` | full-canvas, keyboard/device-speed, schedule or transaction tasks | POS Windows, selected Booking schedule | Slim global context/status, workspace-local tools + full work area |

**Decision rubric:** start with navigation task map and first-screen density, not industry label; if depth >=2 with frequent cross-section switching, `sidebar` candidate. If <4 shallow destinations, `tabs` candidate. If transaction/canvas dominates, `workspace` candidate. These numeric heuristics are **not rigid automatic rules** and require usability evidence.
**Module rule:** declare primary navigation once in approved UI manifest; justified alternate mode only with explicit navigation action (e.g., Booking list → Calendar Workspace). Never randomly switch pattern between adjacent records.

## 2. Global shell / display hierarchy (draft)
1. Global bar: DRVO app launcher; Business name/switch; Branch selector when meaningful; scoped search/command entry; actionable notification count; help/user.
2. Module zone: selected App identity and appropriate `sidebar`, `tabs` or `workspace` navigation.
3. Content: breadcrumb/back context (when helpful), record/list title, ONE primary action, permitted secondary actions, contextual search/filter and views.
4. System zone: errors/alerts, offline, unsaved draft, pending approval or reconciliation, never false success.
5. Overlays: dialogs/drawers with keyboard focus and explicit return point.

**Proposed Desktop layout (RTL)**:
```text
┌────────────────────────────────────────────────────────────────────────────┐
│ [DRVO Apps] [Business ▼] [Branch ▼] [Search] [Alerts] [User/Help]       │
├────────────────────────────────────────────────────────────────────────────┤
│ [Sidebar at logical START ↔ right in RTL] │ [Page header/action + Views]  │
│ [App-specific authorized groups]          │ [Search / Filters / Records]  │
│ [Collapse control]                        │ [Body + Pagination]           │
└────────────────────────────────────────────────────────────────────────────┘
```
The arrangement above is a **reading-order description**, not an exact final drawing. LTR mirrors the logical-start area to physical left; don't mirror IDs, numbers, money or physical device indicators.

## 3. Measurements and breakpoints (ALL proposed candidates)

| Token | Candidate | Why |
|---|---|---|
| Global topbar height | 56px | Stable context with usable hit area |
| Sidebar expanded width | 240px | Space for Arabic labels / nested groups |
| Sidebar collapsed width | 64px | Safe icon + tooltip affordance |
| Content desktop horizontal padding | 24px | Dense-but-readable ERP |
| Content laptop padding | 16px | Protect table width |
| Main header height (target) | 56–64px | Title/status/primary action within first viewport |
| Horizontal tabs row height | 44px | Scannable quick section switching |
| Search/filter toolbar height | 48px | Unified focus/search treatment |
| Toolbar control default height | 40px | Shared across views |
| Compact table row height | 36px | Financial dense data |
| Comfortable table row height | 44px | Default candidate for normal non-finance tasks |
| Page content minimum side gutter | 16px | Avoid clipped input/form content |
| Width 1440+ | Sidebar expanded candidate | Full table + dashboard |
| Width 1024–1439 | Sidebar collapsible, user preference | Laptop/Windows POS |
| Width 768–1023 | Sidebar becomes temporary drawer | Tablet |
| Width below 768 | Mobile navigation sheet + task-specific cards/views | Owner/quick operations, not full desktop finance parity |
| Windows POS primary test | 1366×768, 1920×1080 | Cashier operation and browser zoom |

Height, hit targets, keyboard focus, contrast and label wrapping must be tested at actual Arabic/English content and WCAG zoom conditions; no numeric layout here is final approval. The existing candidate brand colors from [Tokens doc](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md) are likewise NOT approved.

## 4. Arabic RTL / English LTR rules
- Logical `inline-start/end` governs placement: in RTL context nav starts at right, content extends to left; in LTR sidebar starts at left. Topbar order follows language without changing priority or functional grouping.
- Back arrow, chevrons, breadcrumbs, popovers, menus, submenus, drawers and page-direction transitions are locale-aware.
- Money/negative signs, percent, phone numbers, IBANs, invoice IDs, email, URLs and SKUs maintain meaningful ordering via bidi isolation, not global reverse transforms.
- Numbers inside financial tables use consistent alignment and tabular numerals. Distinguish user locale from Business currency and fiscal timezone. Decimal separators/tax formatting per locale.
- The same list's **semantic** sort and totals remain identical in Arabic and English; only presentation/mirroring varies.
- Keyboard Tab order follows visible reading order; arrows in menus/calendar/data table are documented and tested in RTL/LTR. Screen reader announces full actionable labels.
- Direction-aware icons may mirror; neutral objects (brand marks, money symbols, validation/identity/security icons) do not automatically flip.

## 5. App Launcher information architecture
- Clicking DRVO App icon or globally accessible Apps entry opens an **App Launcher** listing **only active, entitled, user-authorized user-facing Modules for the selected Business** (ADR-015), irrespective of the Module's `sidebar/tabs/workspace` navigation type.
- Tile uses original DRVO `AppIcon`, localized name, one-line optional description or pending actionable count when actually supported. No fabricated new-count/rating.
- Ordering: Favorites (if later implemented), frequent/recent and stable domain grouping as an option; predictable keyboard reorder and search without application-specific hardcoding. Exact default order and pinning policy not decided.
- Users can search App labels and allowed shortcuts. Empty state: “No enabled Apps / ask owner” vs “No search results.” Denied/paid/unavailable Apps belong in Apps Store if authorized, not as broken launcher tiles.
- For small Business avoid clutter with 100 industries: launcher shows only installed apps, while industry solution catalog lives on public/onboarding and Marketplace in Business settings.
- Switching Business: update all scopes, clear unauthorized previews/selection, re-fetch apps and permitted Branch; do not leak previous Business records in recent searches.
- Branch switch: update eligible branches only; disabled Branch access error must be explicit and never silently aggregate financial data across branches.

## 6. Pattern-specific navigation behavior

### Sidebar
- Hierarchical groups with consistent title/indent, active path, short menu labels, icons on top-level groups only when useful. Collapsed state still permits keyboard and readable accessible tooltips/popup nav.
- Per-user remembered collapsed mode as a preference, not an authorization rule. Mobile becomes drawer; closes after navigation, returns focus to opener.
- Module's sections are not repeated as horizontal global tabs just because they exist. Breadcrumbs show nested record ancestry.

### Tabs
- Limited shallow sections. URL represents selected tab/section; accessible roving keyboard focus and clearly visible active state.
- If section count/depth grows, promote to sidebar through a reviewed Module nav redesign; no silent overflow that hides critical operations.
- Internal record tabs (Details/History/Attachments) are **different** from Module-wide section tabs; avoid nested tabs-over-tabs. Use section headers or in-page nav if necessary.

### Workspace
- Full-canvas task flow with minimal distraction but retains current Business/Branch, app exit route and system statuses. No loss of unsaved transaction on accidental close/navigation.
- For POS, prioritize responsive sale flow, tenders, barcode/search, shift and offline queue; no heavy generic Record Form framework.
- Booking schedule can use Workspace mode with resource/day/week controls, but its other admin pages may use sidebar or tabs as an explicitly configured alternate; back returns context/filter state.
- Switching workspace → ordinary page must guard unsaved data and pending offline actions.

## 7. First real screens / design checkpoints
1. Business App Home with 4/10/20 authorized apps, Arabic and English.
2. Accounting (Sidebar) List + posted journal Form, role actions and fast search.
3. Customers (Tabs) List + customer Form, 1–3 shallow sections.
4. Booking Calendar (Workspace) with resource/day and conflict warning, plus back to booking list.
5. Salon POS full-screen Windows with shift, executor, tender and offline sync status.
6. App Store with optional app, Required dependency explanation and priced activation review.
7. Business switcher and Branch context, including unauthorized/empty states.
8. Owner phone width 390px, mobile navigation without failing dense finance screens.

## 8. Pending founder visual/design approvals
- Exact physical topbar positions and icon style; candidate heights/spacing; the final color, typography and density presets.
- Which Module uses which nav pattern and whether Booking calendar is full Workspace in V1.
- Launcher tile size, favorites/pinned/recent rules, active app state and badge semantics.
- Responsive phone feature coverage and app switch behavior while POS shift open.
- Final interaction prototypes; no Figma/React source artifact exists.

**Status summary:** Hybrid pattern **approved**, all numerical tokens/per-module assignments and visual defaults are **proposals**, no code authorization.

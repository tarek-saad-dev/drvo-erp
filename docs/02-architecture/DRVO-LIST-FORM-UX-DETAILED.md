# DRVO ERP — Detailed List and Form UX Specification (Hybrid Navigation-Compatible)

**Date:** 2026-10-29
**Status:** DESIGN DRAFT. ADR-023 approves hybrid navigation choice, not final List/Form pixel layout or framework implementation.
**Related:** [Hybrid Navigation & RTL](DRVO-HYBRID-NAVIGATION-RTL-APP-LAUNCHER.md), [View Patterns](DRVO-VIEW-AND-SCREEN-PATTERNS.md), [Design Tokens](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md).

## 1. Shared contract irrespective of Module navigation
ListView and FormView render inside the same work area whether the Module uses Sidebar or Tabs. If the Module is a focused Workspace (POS/Calendar), use a specific operational layout instead; do not force standard FormView inside sales checkout. **Domain Module owns data, query, validation, transitions, permissions; UI Kit owns common presentation/state/interaction.**

## 2. ListView anatomy — proposed
```text
[Business/Branch scope] [Module] › [Records]
[Title] [count if verified]                       [+ Create] [More]
[Search query + filter chips] [Filter] [Group by] [Saved] [View selector]
[Row-select] [primary name] [related fields] [amount/date/status] [action]
[Authorized bulk actions only]      [Pagination/loaded count/totals as permitted]
```

### Search / filter / group
- Query only allowed records and fields within selected Tenant/Business/Branch; debounced if appropriate but no false instant matching across unreturned results.
- Filter chips show field/operator/value; clear one/all, preserve terms on back from a record. Distinguish `No records exist`, `No results match filters`, `No access`, `Failed to load`.
- Grouping, summary counts and money totals are server-backed and scope-correct; never sum only current page and label it an all-records total.
- Saved filters/preferences scoped to user and Business where appropriate; shared/public saved views require explicit RBAC; exact saved-views V1 scope remains open.

### Columns and rows
- Columns: resize/reorder/visibility candidates (not all must ship in V1), stable sort state, number/date/currency formatting and keyboard-usable row actions.
- Compact/comfortable candidate heights **36/44 px**; keep readable Arabic and visible focus. Financial columns use tabular figures/right-decimal logical alignment consistent across RTL/LTR.
- Row opens record permalink on deliberate activation. `Enter` and click should not unexpectedly cause two writes.
- Selection: clear distinction between selected visible rows and `select all filtered`, including quantity and destructive/bulk confirmation. Delete/export only with explicit permission.
- Large data: server pagination/filter/sort and optional virtualization; avoid fetching all Tenant records as a frontend array. Query keys include Business/Branch and view/filter.
- Sticky action/header as useful only if verified on target laptop/RTL; avoid taking half the 768px-tall screen with toolbars.

### Loading/error/cross-module states
- Skeleton preserving column geometry; don't display fabricated 0 balances during loading.
- Retry network request without clearing filters; stale data labeled when critical.
- Missing Optional Module hides relevant optional actions gracefully, missing Required functionality blocks invalid action with explanation.

## 3. FormView anatomy — proposed
```text
[App] › [List] › [Record ID]
[Human-readable title]  [Draft/Posted/Pending/Cancelled]      [Save/Confirm/Post]
[Record context: Business, Branch, owner, timestamps]
[Field groups / sections, with relation pickers]
[Details] [Lines] [History] [Attachments]    (where available & authorized)
[Audit trail / notes / document origin and correction links]
```
Form vs Document: use **FormView** for ordinary entities; use **DocumentView** variant for invoices, stock counts, journals or purchase orders with line grids, immutable posting status, audit and totals. Domain actions are explicit, not generic CRUD buttons on money.

### Edit and lifecycle
- `DRAFT`: editable fields with field-level + summary validation, dirty indicator, explicit Save/Discard/Cancel; navigation guard when changes unsaved.
- `PENDING_APPROVAL`: show required approver and reason, retain audit/record, block unauthorized next transitions.
- `POSTED`: read-only authoritative record; corrections by linked reversal/refund/credit document, not in-place editing.
- `PENDING_RECONCILIATION`: visible pending ledger or tender state and status reason; do not mark reconciled merely because command was acknowledged.
- `FAILED`: explain allowed retry or review, never lose the draft or mislead about financial result.
- `REVERSED`: show original and counterentry links, timestamps and actor/permissions.

### Validation and relation fields
- Labels/Hints/Required/Error are accessible; summary links to invalid fields. Show role-gated relation search and authorized `Create new`.
- Separate Save Draft, Confirm, Post, Approve, Refund, Reverse and Delete semantics with specific wording and confirmation as appropriate.
- Confirmation surfaces financial delta, Business/Branch, posted period, customer/employee, affected downstream workflows when relevant; irreversible actions require permission and audit reason.
- Server authorization and transaction validation are always final regardless of UI disabled state.
- Preserve canonical IDs and foreign keys across locale; show stable document number and traceable creation source.

## 4. Navigation, state and responsive behavior
- Contextual Sidebar Module: opening a Form retains Sidebar and Module active section. Back restores List filter/page/selection where safe.
- Tabs Module: module-wide top tabs remain stable, Form’s internal sections use headings or a separate subordinate pattern to avoid nested-tab confusion.
- Workspace: use explicit "Open full record" route with safe return to the session/calendar; avoid accidental loss of a cash shift or unsynced sale.
- RTL logical start/end, chevron mirroring, table number bidi isolation, scroll position, lookup overlay alignment and keyboard focus. Do NOT reverse digits or monetary signs.
- Desktop wide record: document with main content and optional audit/activity side panel; laptop collapses panel; phone uses single-column read/quick-action with advanced financial edits intentionally limited until validated.
- Detail actions must not disappear unexpectedly under dense table sort or tiny screen; move secondary actions into accessible menu.

## 5. Sample Salon Invoice List (design data only, not live)
- Columns: Invoice No, Customer (or Walk-in), Branch, Sale Date, Employee Executor, Amount, Payment Evidence, Posting State, Action.
- Filter suggestions: Today/Month/Period, Branch, Posted/Pending, Refund status; show verified summary and permission-gated export.
- Standard primary action `New Sale` opens POS operational workspace; opening an existing invoice goes to DocumentView. No separate Salon Service Execution app in V1.
- Example error: locally queued cash sale is not shown as server POSTED; if accounting still pending, status explicitly reflects that.

## 6. List/Form Component contract (descriptive, not code)
- `ListDefinition`: resource key, title, columns, allowed filters/group, primary action, row/open behavior, bulk actions and required permissions.
- `FormDefinition`: record identity, sections, field types/relations, validation, draft rules, permitted actions, status vocabulary and audit/history slots.
- `DocumentDefinition`: Form + line grid/totals/correction links, tax/currency, posting/settlement status.
- Shared actions and view registry ensure future Clinic, Manufacturing or Real Estate Modules reuse same List/Form primitives while keeping domain widgets isolated.
- All configuration is **trusted release metadata**, not arbitrary client-side scripts. Tenant scope, authorization and validation stay on backend.

## 7. High-priority UX acceptance cases
1. Accounting sidebar List → Posted Journal → Back restores filter, correct Business and Branch; unauthorized change prevented.
2. Customers tabs List → Form → edit draft → unsaved exit warns and preserves user data.
3. Duplicate Post clicks or network retries => one state change, no duplicate ledger side effects.
4. 100k-row invoice collection uses server paging and correct scoped totals without fetching all records.
5. Arabic List of mixed Latin SKUs and EGP decimals stays readable; copy/paste exact identifiers.
6. Owner phone sees appropriate summary and drilldown without pretending all desktop journal actions fit.
7. Payment pending ≠ Accounting Posted ≠ settled; each has traceable provenance.

## 8. Decisions still pending
Exact row heights/tokens, column pinning, saved-view/pivot scope in V1, action bar position, Record Form page vs drawer criteria, density defaults, actual screen mockups and acceptance metrics. These must be approved separately.

**This is a documentation proposal only. No code, Figma kit or production changes.**

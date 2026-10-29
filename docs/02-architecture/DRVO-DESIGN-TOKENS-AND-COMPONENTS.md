# DRVO ERP — Design Tokens, Component Inventory & Behavior Contract

**Date:** 2026-10-29
**Status:** Detailed design PROPOSAL; ADR-022 approved pattern/brand independence, NOT these exact numeric tokens/colors.
**Sources:** [UI Kit Blueprint](DRVO-ERP-UI-KIT-BLUEPRINT.md), [App Shell](DRVO-APP-SHELL-UX-SPEC.md).

## 1. Token governance
A single independent DRVO design system spans marketing/onboarding, customer ERP Modules, POS, owner mobile and internal admin. Tokens are semantic rather than arbitrary copied color/spacing values. Proposed naming levels: `primitive.*`, `semantic.*`, `component.*`; light default, future dark/high-contrast only after tested. All Modules use shared tokens, never hardcode a new style for each sector. Brand overrides cannot override financial states or readability.

## 2. Proposed visual foundation — candidates, NOT founder sign-off
| Token | Candidate value | Role |
|---|---|---|
| `color.brand.primary` | #126F63 | Original DRVO brand accent candidate (must pass contrast checks) |
| `color.text.primary` | #192A34 | Main text |
| `color.text.secondary` | #5D6A74 | Supporting labels |
| `color.surface.page` | #F6F8FA | App background |
| `color.surface.panel` | #FFFFFF | Forms, lists, modal body |
| `color.border.subtle` | #E1E7EC | Section/table dividers |
| `color.status.success` | #167B53 | Verified success; never alone |
| `color.status.warning` | #9B6214 | Pending/exception and approval |
| `color.status.danger` | #B53B46 | Error/destructive |
| `spacing.1/2/3/4/6/8` | 4/8/12/16/24/32 px | 4px rhythm |
| `radius.sm/md/lg` | 6/10/14 px | Fields/cards/dialogs |
| `control.height.sm/default/large` | 32/40/48 px | Toolbar/general/touch emphasis |
| `table.row.compact/comfortable` | 36/44 px | High-density ERP |
| `typography.body/base` | 14 px | Desktop ERP default; test Arabic readability |
| `typography.heading.sm/md/lg` | 16/20/28 px | View/page/section hierarchy |
| `layout.sidebar.expanded` | 240 px | Collapsible contextual nav |
| `layout.sidebar.collapsed` | 64 px | Icons with accessible labels |
| `layout.topbar.height` | 56 px | Stable top global context |
| `animation.fast/normal` | 100/180 ms | Meaningful state change only |

These are a **starting set for critique, not brand or accessibility-certified values**; validate per WCAG 2.2 AA, forced colors, 200% zoom and real Arabic/English screen captures before adoption. Never guarantee semantic contrast without checking actual foreground/background combinations.

## 3. Typography, numbers and localization
- Arabic: select a licensed, legible UI typeface with clear diacritics and tabular numerals; compare Alexandria, IBM Plex Sans Arabic and Cairo as design candidates; commercial embedding rights/license must be verified. Latin: matching high-legibility family such as Inter/IBM Plex Sans; do not distribute unlicensed font files.
- User-entered text, labels and paragraph rhythm scale; preserve Arabic glyph shaping and reasonable line height (draft 1.4–1.6).
- Money, percentages, IDs, product SKUs, phones and dates use strong LTR/RTL bidi isolation; align financial numeric columns in decimal-compatible fashion; never change value/symbol meaning when mirroring.
- Business accounting timezone/currency come from Business settings; UI display language must not silently reassign fiscal jurisdiction.

## 4. Reusable primitives — required states and contract

| Component family | Variants | Key behavior and required accessibility |
|---|---|---|
| Button | primary, secondary, outline, ghost, danger, icon-only | loading, disabled with explanation, focus ring, prevention of duplicate high-value submissions |
| Input | text, number, money, percent, date/time, lookup | label, hint, error, required, prefix/suffix, bidi-sane copy/paste, visible validation |
| Select / ComboBox | single, multi, searchable relation | keyboard, async results, role-scoped data, empty/error, focus restore |
| Toggle / Checkbox / Radio | select, disabled-required, indeterminate | explicit reason for locked Required prerequisite; not purely color-coded |
| Menu / Popover / Tooltip | role/permission-safe | escape/keyboard, anchored placement in RTL, no important info only on hover |
| Dialog / Drawer | confirmation, form, quick view, danger | focus trap/restoration, dirty state, close confirmation, reason field for irreversible actions |
| Toast / Inline alert | success, info, pending, warning, error | actionable rather than noise; status live region, timestamp and source where needed |
| Badge / Status | draft, posted, reversed, sync pending, verified/unverified | **text + icon**, mapped to server state; never label locally pending as reconciled |
| Breadcrumb / Tabs / Stepper | app path, record tabs, onboarding steps | correct URLs/back, selected state, dynamic RTL order, do not add unnecessary forms |
| Upload / Document viewer | file, receipt, evidence, exported report | authorization/privacy, errors and retry, file size/type disclosure |
| Skeleton / EmptyState | list/form/card/graph | distinguish zero records from failed fetch and filtered-out results |

Base primitives must be **composable**; do not create `SalonButton` or `ClinicTable` as separate base components.

## 5. Data-rich components

### DataTable contract
- Columns: sort, filter, resize, hide/show, pin/sticky when meaningful, monetary totals and role-guarded export.
- Rows: selection, batch actions, keyboard focus, pagination or virtualization based on size, detail route, grouped summary and status indicator.
- State variants: loading, partial result, empty/no matches, error, selection, pending mutation, permissions.
- Performance: server filtering/sorting for large sets, never fetch all invoices merely to render virtualized table.
- Money and times use locale-aware formatting; maintain exact decimal values from server, not binary float formatting for GL truth.
- Action controls must remain reachable via keyboard and on compact laptop widths.

### Relation picker / Lookup drawer
- Select customer, employee, product, account, provider or resource with search, permission-filtered recent/favorites and explicit create action if granted.
- Cross-Business reference is invalid even when IDs collide; source of truth verifies scope.

### Financial document components
- DocumentHeader with status, action guard and owner reference; DocumentLineGrid with unit/discount/tax; totals and reconciliation; immutable Posted view; draft edit; reasoned reversal/correction.
- Payment verification status is separate from tender choice; pending provider evidence never appears as paid cash.
- Immutable journal audit/history is not re-rendered as ordinary editable text.

### Offline/SaaS components
- ConnectivityIndicator: online/offline is separate from queue/sync status and verified posting.
- OfflineQueueSummary: locally recorded count, retry/review, device context, last acknowledgement.
- ModuleTile / Add-onCard: installed vs available vs required vs optional; availability and role; dependency explanation and pricing.
- ActivationQuote: Business, plan/currency/period, already included, new charges, recurring and one-off amount, tax, approval and expiry.
- Usage meter: show entitlement and quota context, not unexplained consumption warnings.

## 6. Module-owned UI slots
Modules describe page title, icons, nav groups, searchable fields, columns, form sections, routes, record lifecycle actions, accessible labels and guards; their components may extend standardized views via contracted slots. Specialized Clinic clinical UI or Manufacturing routing editor can be custom domain widgets while still using base tokens and auth/state contracts. No arbitrary runtime markup execution; extensions registered through trusted platform release.

## 7. Input action and status semantics
- Form actions: Save Draft, Submit/Confirm, Post (financial finality), Approve, Reverse/Refund, Cancel each have independent permission/confirmation/result behavior.
- Only one high-priority primary action; use secondary grouping for less frequent operations.
- Pending reconciliation, rejected sync, failed collection, incomplete inventory costing and duplicate retries each have explicit states and recovery route.
- All events that modify financial records use server permissions and idempotency, never rely on button disabling alone.

## 8. Test inventory for Kit sign-off
- Normal/hover/focus/disabled/loading/success/error and keyboard controls in RTL and LTR.
- Light theme and compact/comfortable density; responsive 390/768/1280/1440.
- Windows POS using keyboard without mouse; 200% zoom and visible sync/failure statuses.
- Screen reader labels for amount, invoice status, required dependency and pending payment.
- DataTable with 10k+ filtered rows, Arabic strings, negative amounts, different currencies and large page counts (target depends on backend proof).
- Dialog cancel preserves draft; confirm button rapid double-click does not double-post.
- Version all tokens and component docs before product modules adopt the Kit.

## 9. Still open
Actual brand palette and typeface, visual source format/design tool, light/dark, component sizes after usability, topbar/sidebar options, per-country currency and tax display. Do not treat this draft as a finished or accessible-certified Kit.

**No code/library/Figma artifacts produced.**

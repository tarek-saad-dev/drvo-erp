# DRVO ERP — Reusable View Contracts and Domain Screen Patterns

**Date:** 2026-10-29
**Status:** DESIGN DRAFT; ADR-022 accepts Odoo-familiar usability, not copied Odoo implementation, exact React view-engine architecture or final V1 view scope.
**Related:** [App Shell](DRVO-APP-SHELL-UX-SPEC.md), [Tokens/Components](DRVO-DESIGN-TOKENS-AND-COMPONENTS.md), [UI Kit Blueprint](DRVO-ERP-UI-KIT-BLUEPRINT.md).

## 1. High-level separation
- **Core UI Kit** owns common controls, view container/action bar, search/filter state, layout, loading/error/empty, accessibility and responsive patterns.
- **Module** owns resource model, available views, domain validation, data queries, record workflow, permission checks and business contracts.
- **UI view description** is a trusted, typed declarative configuration describing fields, columns, actions and slots; do not copy Odoo XML/runtime engine wholesale. Never assume frontend view config is authorization.
- **Business/User preferences** store saved safe filters/column density only under legitimate role permissions; global saved view is not automatically allowed.
- **Source records** remain in their authoritative domain Module; cross-module display via versioned read contracts/projections.

## 2. Standard view anatomy (all records)
```text
[Business / Branch / Module context]
[Record group title]                         [Primary action] [Other actions]
[Search] [Filters] [Group By] [Saved Views]   [List | Kanban | Calendar | ...]
[View body: content + loading/empty/error/restricted states]
[Pagination / aggregates / selection controls]
```

## 3. V1 view families and view-specific contracts

| View | Recommended fit | Core features | Boundary |
|---|---|---|---|
| **List** | Invoices, customers, employees, stock, journal | column presets, server-sort/filter, quick view, bulk permission action, saved filter proposal, totals | no unauthorized export / branch leak |
| **Record Form** | Customer, invoice, purchase, user profile | header/status, sections, tabs, relations, audit, draft save, permission-aware form | Posted immutable; corrections/reversal |
| **Kanban** | leads, service/booking states, approval workflow | grouped columns, status counts, card actions, permitted drag, accessible keyboard alternative | drag mutation server-validates lifecycle |
| **Calendar** | barber/doctor schedule, bookings, resource availability | day/week/month, per-resource rows, conflict checks, route to record, reschedule guarded | race prevention, time-zone, no cross-booking |
| **Graph** | revenue trends, staff KPIs, branch comparison | aggregation level, permitted scope, drill down, empty/no-data, no fabricated values | approved financial source |
| **Pivot** | financial/operational analysis | group, totals/subtotals, period, export if allowed | aggregation server-side, row-level permissions |
| **Dashboard** | owner and manager home | actionable KPIs, attention queue, timeframe tabs, safe drilldowns | no false green/active status |
| **Document** | posted invoice, GL journal, payroll, stock count, PO | immutable posted status, line rows, approvals, origin/attachments, audit and reversal | never direct edit of final posting |

Not all module pages need every view. The minimal full-featured framework is reusable, but V1 parity requirements must be prioritized by actual Salon use case, not speculative Studio replacement.

## 4. ListView detailed behavior
- Search matches permitted fields, scope. Filter tokens show the applied field/condition, not opaque query text; group-by and saved filters are distinguishable.
- Table header supports sort and maybe column customization; numeric monetary columns align consistently, totals indicate scope and whether loaded/current.
- Bulk selection distinguishes visible page vs all filtered results with explicit count/confirmation.
- If user selects row: open full FormView with permalink; browser back returns filters/sort/page (subject to secure state).
- Skeleton on loading, two distinct empty messages: no records vs filters returned no matches. Errors preserve existing filter and display retry.
- Avoid all-record client fetch and optimistic finalization of irreversible finance operations.

## 5. Form / Document lifecycle
- `Draft`: editable fields with dirty indicator, save/discard, field-level and cross-field errors, unsaved changes guard.
- `Ready for approval` or `Waiting`: header shows reason, who must act and next steps, not just a color.
- `Posted`: read-only financial truth with post timestamp and source, audited correction/reversal paths; distinguish status from payment settlement.
- `Reversed/Refunded`: link to original and correction chain; never reuse original as mutable record.
- Tabs for Details, Lines, History, Attachments only where permitted. Comments/activity must respect privacy and independent retention.

## 6. Kanban / workflow behavior
- Card contains title, owner/branch, stage, due, primary status, no overloaded full invoice detail.
- Move from stage A to B checks `canTransition`, RBAC, dependency and version; if rejected roll back visual placeholder with actionable message. Do not trust drag-and-drop as final commit.
- Keyboard move controls and screen-reader announcements, predictable column counts; update all views consistently.

## 7. Calendar behavior
- Resource picker (barber/chair/doctor) backed by Module extension; optional conflict grid.
- Slots follow Business timezone; daylight saving and locale formatting must be tested.
- Drag to new time may create a *provisional visual suggestion*, but server must confirm availability before final booking; offline policy requires separate approval.
- Group by resource, day/week/month and record details; don't allow a user to see an unavailable doctor's/private resource data.
- Keep Booking generic; Salon-specific selection/commissions in bounded extensions; no Salon Service Execution Module in V1.

## 8. Graph and Pivot behavior
- Quantitative filters and dimensions explicitly labeled; no combining unlike currencies without conversion policy.
- Role and branch permissions applied BEFORE server aggregation; hidden records must not influence unauthorized totals.
- Zero, no data, delayed financial reconciliation and missing cost are distinct.
- Pivot export respects the same filters and scope as on-screen totals.

## 9. Windows POS specialized full-screen template
This is **not** an ordinary Odoo-style generic FormView.
- Stable catalog/search, basket/line editor and tender/checkout panels; fast keyboard access and barcode if later required.
- Clear cashier/Branch/shift context; executor/opener fields and their salon-specific attribution; customer optional for normal cash per approved rules.
- All Business-configured tender options remain selectable online/offline as already founder-approved; provider payment evidence may remain pending verification, NOT settled.
- Offline queue/device sync status always accessible and non-obscured; pending vs posted/reconciled states never conflated.
- Draft/posted/refund/shift close workflows use distinct permissions, audit and idempotent server transactions.
- Do not sacrifice POS responsiveness to unnecessary heavy graph/table framework loading.

## 10. Industry solution onboarding / App Store
- Industry picker: sectors searchable, unsupported industry offers transparent request path.
- Starter: Recommended editable modules, Required lock explanations, incompatible reasons, optional add-ons unselected by default; avoid prechecking optional paid additions.
- Price review: per-app included/additional charges + subscription total, taxes, any proration and next renewal, explicit approval (ADR-016/021); no hidden paid apps.
- Active Apps home: only active + role-authorized apps; App Store separates available, active, unavailable, needs approval. A selected Module is independent tile.
- Activation failure/quote changed: clear actionable recovery and no duplicate purchase confirmation.

## 11. Example screen inventory / reuse matrix
| Screen | Shared template | Domain adaptation |
|---|---|---|
| Salon invoice list | List | POS searchable fields/posted states |
| Invoice detail | Document/Form | line discounts, tender evidence, refund trail |
| Salon appointments | Calendar | resource/barber selection and salon scheduling policies |
| Employees / commissions | List/Form/Pivot | HR ledger/commission calculations |
| Inventory stocktake | Document/List | warehouse, quantities, adjustments |
| Accounting journals | List/Document | journal line balance, fiscal period/reversal |
| Clinic encounters (future) | Form/Document with protected domain widget | sensitive clinical access, consent, retention |
| Manufacturing production (future) | Document/Kanban + specialized routing editor | BOM, WIP, work centers, QC |

## 12. Interaction and regression test matrix
Validate: 1) 1440px desktop and Windows POS 1366x768; 2) 390px owner phone; 3) Arabic RTL and English LTR; 4) slow/failed/offline operation; 5) unauthorized access; 6) duplicate action/network replay; 7) massive invoice pagination; 8) post/reverse audit; 9) missing optional Module gracefully degrades; 10) different Business contexts never leak.

## 13. Design-to-implementation gates (not authorized yet)
1. Visually approve core tokens and 8 screen templates with owner/manager/cashier walkthroughs.
2. Review Module UI manifest contract/permission source, finance state semantics and offline states.
3. Only after explicit development approval, map into shared React components and Storybook-like documentation/visual regression/a11y test suite.
4. No auto-generation of 100 full industry screens from incomplete templates; verify each domain-specific workflow.

**No application code, final kit, design file or deployment.**

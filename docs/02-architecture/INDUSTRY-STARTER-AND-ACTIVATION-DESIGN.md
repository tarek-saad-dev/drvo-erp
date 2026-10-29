# DRVO ERP — Industry Starter Bundle + Module Activation Design

**Date:** 2026-10-29
**Status:** DESIGN DRAFT implementing approved founder product rule ADR-021. No technical schema, pricing, exact launch bundles or code signed off.

## Approved UX goal
Business creation starts with the selected **Industry Solution** and a sensible **recommended, editable** set of released Modules/Extensions. The user can deselect recommended/optional Modules, include others, and review Required dependencies with their prices once for explicit approval (ADR-016). No full platform module installation or permanently fixed industry package. After activation, independently visible Apps per ADR-015, filtered by the user’s scopes and authorization. Later expansion uses identical activation rules (ADR-020).

## 1. Responsibility boundaries

| Component | Owns | Must not own |
|---|---|---|
| Platform Kernel | Identity, Tenant/Business/Branch, RBAC, subscription/entitlement checks, audits | Industry-specific transaction processing |
| Global Module Registry | Released Module key, semver, required/optional edges, conflicts, contracts, extensions, permissions, compatibility | Business recommendations and prices as unverifiable hardcoded logic |
| Industry Solution Registry | Versioned industry/region recommendation profile, default configuration/roles, compatible Module/Extension choices, onboarding help | Overriding a Module's true Required dependency or introducing executable customer code |
| Activation Planner | Resolve user selection, transitive dependencies, conflicts, policy/entitlements and priced plan | Financial posted invoices / arbitrary cross-module direct DB edits |
| Business Activation / State Machine | Approval evidence, activation idempotency, Business-specific settings/grants and rollback/retry states | Platform-wide module code installation at runtime |
| Business App Launcher / Apps Store | Active and authorized module tiles, available compatible apps, selection and reasons | Treating hidden icons as disabled mandatory finance engine logic |

## 2. Module categorization in the UI

**Platform Foundation:** always present for all Businesses; not a purchasable choice in starter.
**Required for selection:** selected Module’s Required transitive dependency closure; cannot be unchecked independently while dependent remains selected; show "Required by X" and costs.
**Recommended optional:** suggested based on the Industry Solution; removable unless another selected app requires it.
**Optional:** not selected by default unless user intentionally chooses; available where compatible.
**Unavailable/incompatible:** disabled with concrete reason (not released, wrong country/industry, conflicts, insufficient entitlement, platform version).

A Module's UI category is **derived from selected workflows and dependency graph**, not a universal fixed flag: Booking may be recommended on Salon template but Required when another selected workflow explicitly depends on it. Distinguish visible app, background system capability and paid license.

## 3. Conceptual solution manifest (not database schema)

- `solutionKey`, `solutionVersion`, industry/category, locale/country eligibility and availability.
- `recommendedModuleRefs` with reason and an unresolved default preselection policy; `suggestedExtensions` with compatibility.
- `starterConfigTemplate` (Business defaults, not financial history), `roleTemplateRefs`, onboarding help, supported feature/workflow descriptions.
- `optionalModuleSuggestions`, compatibility rules, manifest release/migration policy.
- REQUIRED edges, conflicts, entitlement contract and supported Module versions are owned by Global Module Registry, not copied into the Industry manifest as mutable authority.
- A Business stores `sourceSolutionVersion`, explicit selected Modules/Extensions, approval evidence and Business override revision. Subsequent Solution updates must not silently enable apps or alter billed selection.

## 4. Proposed Business onboarding activation sequence

1. Owner creates Business identity and chooses an available Industry Solution (Salon V1 first).
2. Platform supplies default/recommended Modules, supported industry Extensions, and describes why each is suggested.
3. User adds/deselects allowed Modules; planner recomputes **entire required transitive closure** and compatibility; displays any locked-by-dependency app with origin.
4. Planner requests fresh entitlement and pricing service quote: current vs new apps, recurring/one-time charges, currency, renewal implications; **no invented prices**.
5. User explicitly approves the full bundle once (ADR-016), subject to whatever final authorized approver role is chosen.
6. Server checks permission, quote expiry, graph/manifest version, Business membership, conflicts, entitlement and activation idempotency key again.
7. State transitions via proposed `PREVIEW → APPROVAL_PENDING → ACTIVATING → ACTIVE`. Failure is recorded, reconciled and safely retried/rolled back without deleting already existing active apps, posted books or duplicating charges.
8. Only after successful activation does Business App Launcher show the newly active authorized user-facing Apps; employee not entitled to a Module sees no functional access even by direct URL/API.
9. Business can later revisit Apps Store and use the same procedure to add compatible Modules without recreating Business or reconfiguring existing financial history.

## 5. Example scenarios (NOT approved dependency graph or pricing)

### Salon small service operation
- Select Salon Starter. POS/Catalog and mandatory security and correct financial posting are needed if it chooses to record sales.
- Booking can be highlighted as Recommended but removable if no enabled workflow requires it.
- WhatsApp can be Optional when released; not required by POS, accounting or booking.
- Salon Service Execution is explicitly **not part of V1** as standalone app; ordinary service attribution/commission/recipes stay in POS/HR/Inventory extensions (ADR-020).
- Comprehensive commercial Salon V1 can still ship all approved modules; different customer Businesses activate tailored starter subsets.

### Clinic future solution (design stress test, not released)
- Clinic Starter might suggest Booking and nonclinical invoicing.
- Clinical Records must be its own protected domain with stronger patient-data permission/retention. Deselecting Booking cannot silently delete clinical data; dependency ownership requires domain design.
- Region compliance, medical privacy and invoice policy still need discovery before launch.

### Wood manufacturer future solution (design stress test, not released)
- Reuse Purchasing/Inventory/Accounting when operations genuinely fit.
- If selected Manufacturing/MRP requires Inventory and Accounting capabilities, planner includes full closure. Production/WIP cannot exist as only a minor generic Booking Extension.
- A staged launch may begin with purchasing and stock and add MRP later, but historical work-in-progress/stock values require opening reconciliation, not fabricated data.

## 6. Error-state and policy acceptance cases
- Deselect a Recommended module not required by anything else → allowed and prices recalculated.
- Deselect a Recommended app now Required by a chosen app → show dependency explanation and offer removal of dependent capability.
- User selects POS and lacks Catalog Required → POS + Catalog in one priced approval.
- Optional WhatsApp not installed → booking/sale completes, no message send; activation later does not replay all historical messages unrequested.
- Business A config differs from B; another Tenant cannot see/modify either's activation/quotes.
- Old quote, pricing update, missing RBAC, incompatible extension, cycle, conflicting module → no activation/charge without a refreshed valid plan.
- Concurrent confirmation or network retry → idempotent single activation and no duplicate charges.
- Later module install requires approved global release/schema migration first; no tenant runtime arbitrary plugin execution.
- Installed Module disables later → preserve posted historic transactions/audit, do not disable depended-on prerequisites without safe approved resolution.
- No standalone Salon Service Execution V1 and no implicit V1 scope removal by calling customer bundle 'minimum'.

## 7. Technical decisions **NOT** approved in this design
- Exactly which Modules ship preselected for Salon, dependencies of POS ↔ Accounting/Treasury, and which capabilities count as internal non-purchasable system services.
- Whether recommended apps start pre-checked or unchecked; how to present costs while toggling and what a user can edit before account setup is complete.
- Module approver role and ability to authorize paid add-ons, proration, plan limits and billing failure policy.
- Compatibility upgrading/reconfiguring an already-active Business, changing primary industry or multi-solution Business.
- State transition implementation, quote expiry interval, service contracts, backend tables and event names.
- Performance and financial consistency validation under concurrency/offline conditions.

**Documentation only. No application code or SQL migrations or deploy.**

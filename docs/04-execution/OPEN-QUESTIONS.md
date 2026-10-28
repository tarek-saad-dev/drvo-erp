# Open questions — unresolved only

| ID | Open decision | Priority |
|---|---|---|
| OQ-001 | Backend/frontend framework and TypeScript structure | High |
| OQ-002 | SQL engine, ORM/query tooling and migrations | High |
| OQ-003 | Tenant isolation strategy and cross-tenant integrity guarantees | High |
| OQ-004 | Ownership of subscriptions and entitlements | High |
| OQ-005 | Hosting, staging, environments and secrets | High |
| OQ-006 | Salon MVP and legacy Cashier migration/coexistence/rollback | High |
| OQ-007 | Identity and invitations | Medium |
| OQ-008 | Offline PWA POS, device/printing support and sync | High |
| OQ-009 | Final ERP module capability map vs integrations / MVP cut | High |
| OQ-011 | Which Gulf countries first, and required regulatory, tax, language and payment support for concurrent Egypt + Gulf launch? | High |
| OQ-012 | PWA offline capability, stakeholder portal timing and later native-app requirements | High |
| OQ-013 | Mandatory Core + Extension contracts for **every** module: interface, packaging, lifecycle and dependency rules | High |
| OQ-014 | Measurable 3-month/12-month customer benefit targets | Medium |
| OQ-015 | Target branches/users/transaction volume | High |
| OQ-016 | Must-have Odoo capabilities vs DRVO additions | Medium |
| OQ-017 | After barber salons then medical clinics, when do beauty/aesthetic and supermarket editions launch? | Medium |
| OQ-018 | Clinic clinical data scope, privacy, compliance and safe release criteria | High |
| OQ-019 | Cut Salon pilot date, scope, transition and operational rollback | High |

## MVP Round 2 unresolved scope / delivery

| ID | Open decision | Priority |
|---|---|---|
| OQ-020 | One-month target feasibility: team, resources, delivery scope, acceptance gates | Critical |
| OQ-021 | Distinguish limited pilot, replacement parity, and first external commercial sale | Critical |
| OQ-022 | Offline POS writes, sync conflicts, payment processing, stock and journal posting | Critical |
| OQ-023 | Parallel operation: per-entity system of record and duplicate prevention | Critical |
| OQ-024 | Full general ledger design/requirements vs operational cash summaries | Critical |
| OQ-025 | Full existing HR parity checklist and dependencies | High |
| OQ-026 | Subscription payment provider(s), invoicing and operational billing | High |
| OQ-027 | Receipt printing postponed: pilot process and replacement acceptance | High |
| OQ-028 | Pilot date/branch, data migration strategy, booking concurrency test | Critical |
| OQ-029 | Arabic-first vs Gulf-market localization and compliance at simultaneous launch | High |

See [MVP Discovery Round 2](../01-product/MVP-DISCOVERY-ROUND-2.md).

## Resolved from founder follow-ups (2026-10-28)

- Former OQ-010 second industry: **medical clinics**, after barber salons.
- Comprehensive ERP ambition, delivered in stages.
- Egypt and Gulf both in initial commercial launch strategy.
- Responsive Web / PWA for first release.
- Core + Extension mandatory for every module.
- Cut Salon is first pilot.

[Source answers](../01-product/DISCOVERY-01-FOLLOWUPS.md). Record detailed architecture choices in ADRs before implementation.

## MVP clarification resolutions (2026-10-28)

- OQ-020 partly resolved: team = founder + Cursor; one-month target flexible. Detailed estimate remains open.
- OQ-021 partly resolved: **one comprehensive commercial V1**, with testing and all-branch validation gates (not separate commercial releases). Exact acceptance criteria open.
- OQ-022 partly resolved: offline POS cash sales only, sync later. Conflict/idempotency/accounting specifications still open.
- OQ-023 partly resolved: DRVO authoritative for bookings. Legacy Cashier integration and write lockout still open.
- OQ-024: **full GL accounting required in V1**; detailed accounting model remains open.
- OQ-026 partly resolved: subscription collections manual initially; gateway deferred. Entitlements/reconciliation unresolved.
- OQ-028 partly resolved: all Cut Salon branches included in initial validation; phased activation and rollback remain open.

[Release strategy decision](../01-product/MVP-RELEASE-STRATEGY.md).


## Final MVP clarification resolutions — 2026-10-28

- Existing Cut Salon public booking website stays; integrate it with DRVO's new Booking API. Migration, cutover and fallback remain OQ-023.
- Offline cash sales are accepted despite post-sync stock shortages; create a reviewable stock discrepancy. Negative-stock rules, valuation and reconciliation remain OQ-022.
- Accounting manual vs automatic journal-entry workflow is **unresolved**, to be decided during detailed Accounting Module discovery (OQ-024). Full accounting remains in commercial V1.
- Internal tests during development are allowed; **one comprehensive commercial launch** after acceptance, not separate public MVP stages (OQ-021).

## Tenancy discovery — unresolved details (2026-10-28)

| ID | Unresolved issue | Priority |
|---|---|---|
| OQ-030 | Business transfer between Tenants: prohibited or controlled migration? | Medium |
| OQ-031 | Business partner shares and ownership model | Medium |
| OQ-032 | Module dependency policy (recommended DAG/explicit required and optional dependencies, awaiting approval) | High |
| OQ-033 | SaaS branch/user/module limits and expired subscription workflow | High |
| OQ-034 | Tenant/Business export and portability policy | Medium |
| OQ-035 | Per-entity deletion, retention, audit and legal rules | High |
| OQ-036 | Business-level currency/timezone/language vs multi-country Branch needs | High |
| OQ-037 | Tenant-qualified username uniqueness, identity and recovery | High |
| OQ-038 | Manager-only finance visibility: Owner/Super Admin exceptions | High |
| OQ-039 | Cross-Business consolidated financial reports, accounting periods and currency conversion | High |
| OQ-040 | Branch-to-Branch transfer approval/posting and inter-branch finance rules | High |

Founder decisions: [Tenancy Discovery](../01-product/TENANCY-DISCOVERY-ROUND-3.md). Architecture blueprint: [Tenancy Architecture](../02-architecture/TENANCY-ARCHITECTURE.md).

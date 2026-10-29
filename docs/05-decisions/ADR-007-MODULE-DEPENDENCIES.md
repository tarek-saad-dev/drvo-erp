# ADR-007 — Required and Optional Module Dependencies
Date: 2026-10-29
Status: Accepted business decision; implementation details proposed.

## Decision (founder approved)
Modules declare **Required** and **Optional** dependencies, and the platform must prevent incompatible module states/conflicts. This supersedes earlier undecided dependency policy.

## Recommended implementation (not separately founder-approved)
- Business-scoped module registry with versioned manifest; required dependency cannot be enabled without a compatible prerequisite, optional dependency unlocks integration when available.
- Validate dependency graph for missing requirements, cycles, incompatible versions, and deactivation of a module still needed by dependents.
- Show actionable error and change preview; do not silently activate billable add-ons or dependencies without authorized approval.
- Disabling preserves historical invoices/ledger/stock. RBAC and entitlements checked server-side.
- Core + multiple Extensions architecture remains intact. No required dependency is assumed just because two modules exchange events.

## Testing
Activate, suspend, upgrade, deactivate, cyclic/conflicting graphs, invalid paid entitlement, data retention and cross-Business isolation.


## Approved activation UX — ADR-016 (2026-10-29)

When required prerequisites are missing, present selected app and full Required-dependency bundle with any prices and obtain one explicit approval to activate together. This is now a founder-approved addition, not a suggestion. Exact concrete dependency edges, approver roles, billing and suspension semantics remain to design. [ADR-016](ADR-016-BUNDLED-REQUIRED-DEPENDENCIES.md).

# ADR-019 — Conditional Industry Domain Module Boundaries

**Date:** 2026-10-29
**Status:** ACCEPTED — founder explicitly selected Option B.
**Owner:** Founder
**Related:** ADR-006 (Core + Extension for EVERY Module), ADR-015 (independent visible Apps), ADR-017 (Shared Core + Industry Solutions), ADR-018 (repeatable industry expansion).

## Decision

**Do not create one mandatory, dedicated Domain Module per industry. Do not force every industry requirement into a Shared Core Extension either.**

For each capability, choose the smallest correct architectural owner based on actual domain invariants and life cycle:

1. **Shared Core Module** when the underlying domain invariant, operation ownership and primary lifecycle are genuinely reusable across industries.
2. **Bounded Industry Extension** when an industry adapts a stable Core process by policy, validation, allocation logic, presentation or a compatible domain hook without taking ownership of a fundamentally different aggregate.
3. **Independent Domain Module** when the industry introduces its own entities/aggregates, state transitions, privacy/security, operational rules or financial consistency controls that merit independent ownership.
4. **Integration adapter** when behavior primarily connects an external provider, hardware, channel or system.
5. **Industry Solution** composes whichever of the above are needed as a versioned customer-facing offering; selecting an industry does not imply manufacturing a dedicated giant module.

## Founder-approved outcome and consistency

The founder selected: **"B — حسب الحاجة الحقيقية؛ Extensions للسلوك المشترك وDomain Modules للعمليات المستقلة."**

- There is **no universal rule** requiring every industry to ship a single “Salon Operations”, “Clinic Operations” or “Manufacturing Operations” aggregate/module.
- Equally, there is no policy to minimize Domain Modules at any cost.
- All independently defined Modules (shared or industry-specific) retain a designed Core with extension points under ADR-006. This does **not** mean generating empty no-op Extension artifacts for every Module.
- Every activated user-facing Module retains its own App tile (ADR-015); a Solution is a composition, not the only visible app.
- Dependencies/entitlements are governed by ADR-007 and ADR-016: full Required bundle and applicable prices shown before one explicit approval.
- One SQL Server shared tenant-aware database remains the V1 plan; distinct logical Module ownership does not mean separate DBs or services.
- Salon comprehensive commercial V1 / Cut Salon validation first; Clinic second. Manufacturing is a future hypothetical domain example, **not an approved V1 feature or rollout commitment**.

## Decision checklist for every prospective feature (engineering guidance, NOT additional founder approval)

- What data and source-of-truth does the feature own? Who may mutate it?
- Is the invariant and lifecycle already implemented by an existing Module without industry conditionals?
- Can a typed configuration, policy hook or resource adapter express the difference while keeping Core domain rules stable?
- Does it require a different aggregate, workflow, ACL/consent, retention, clinical or financial accounting model?
- Can it be released, enabled, tested and supported independently without coupling all industries?
- What synchronous contracts and versioned domain events cross this boundary? What idempotency and Tenant/Business/Branch scope is required?
- If data is highly sensitive (e.g., clinical records), keep it in a suitable access boundary even if it references generic Customers or Booking.

## Illustrative interpretation, NOT final per-capability sign-off

### Salon
- Shared POS/Booking/HR/Inventory/Accounting remain appropriate for ordinary cart/invoice, appointments, payroll and stock.
- Salon-specific barber/chair allocation, executor and optional opener attribution, commission policy and service recipe are likely bounded Extensions.
- A dedicated Salon Service Execution Domain Module is created **only if** execution steps, service lifecycle or workflow coordination need their own owned aggregate and independent evolution. A “Salon Operations” monolith is **not** automatically required.

### Clinic
- Reuse generic Booking resource/time-slot and common billing/treasury only within safe jurisdiction/consistency contracts.
- Doctor/room allocation and non-clinical appointment policies can be bounded Extensions.
- Clinical Records, encounters/visits, prescriptions and sensitive patient data require a separate owned domain/access boundary rather than a giant generic Booking/Customers extension. Exact clinical modules/compliance need discovery before Clinic release.

### Manufacturing
- Reuse invoice, purchasing, treasury, stock and general ledger primitives when their business semantics genuinely fit.
- Timber species, grades, measures and configurable stock/product policy may use Catalog/Inventory Extensions.
- BOM, production orders, work centers, raw-material consumption, WIP, yield/scrap and manufacturing costing typically form one or more independent Manufacturing/MRP Domain Modules with explicit Inventory/Accounting contracts. Scope needs client discovery.

## Disallowed failure modes
- A growing generic Core with dozens of `industry` switches and unused speculative hooks.
- Copying entire per-industry ERP forks or mutating another Module's tables directly.
- Exposing clinical sensitive data on generic unrestricted Booking or Customer events.
- Inventing required Domain Modules for industries whose needs fit existing bounded Extensions.
- Claiming all industries, compliance regimes or enterprise workloads are already supported.

## Follow-up design
Fill the [Core/Extension/Domain Boundary Matrix](../02-architecture/CORE-EXTENSION-DOMAIN-BOUNDARY-MATRIX.md) and ratify final Salon ownership + extension interfaces; evaluate Clinic and Manufacturing as *design stress tests* only. Then specify actual Module Registry/Industry Solution manifests and commands/events.

**No application code, database migration, server access, testing or deployment authorized.**


## Salon V1 explicit decision — ADR-020 (2026-10-29)

Founder has now explicitly decided **no standalone Service Execution Module in Salon V1**. Do not treat earlier conditional examples as V1 launch commitments. Existing salon service invoicing and attribution, booking, commissions, targets and consumable recipes belong in approved Shared Modules/Salon Extensions. Advanced step-by-step execution may be considered as a future separately owned Domain Module when needs justify it. Businesses generally start with minimum valid Modules and expand by activating more later. [ADR-020](ADR-020-INCREMENTAL-BUSINESS-MODULES-AND-SALON-V1.md).

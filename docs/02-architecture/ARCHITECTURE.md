# Architecture baseline

**Updated:** 2026-10-28  
**Status:** Direction accepted; implementation architecture pending technical discovery.

## Design

Single repository, Modular Monolith. Explicit module boundaries and contracts, with shared platform services and strongly enforced tenant isolation.

### Platform

Authentication, tenants, businesses, branches, scoped memberships, permissions, entitlements and auditing.

### Module architecture — founder decision

**Every module must have a Core and Extension architecture, without exception.** The Core defines reusable capability; extensions implement industry or other specialized behavior. This is a strict design requirement, but **it does not yet prescribe one plugin per industry per module, particular package boundaries or mandatory no-op extension artifacts**. Those details require design approval and tests.

Examples:
- POS core: sale/cart/payment; salon extension: barber/service workflows; medical clinic extension: permitted billing workflows.
- Booking core: appointments/resource allocation; industry extensions: specialized resource/scheduling policies.
- Other modules: define core contract and valid extension surfaces in their individual specifications.

Avoid duplicating core logic and ad-hoc business-type conditions. Establish dependency direction, registries, extension lifecycle, tenant-specific activation and compatibility before implementation.

### Data

Initial shared tenant-aware SQL database direction, tenant/business/branch scopes and authorization applied server-side. Enforce relational tenant isolation and test cross-tenant access. Final SQL vendor and database-level RLS decisions are open.

### Module communication

Explicit synchronous APIs/contracts; domain events for cross-module reactions; transactions for critical invariants; outbox/idempotent consumers when needed.

### Mobile and locality

First release uses **responsive Web/PWA**. Offline capabilities, printing and synchronization remain open.

### Markets and industries

First barber salon edition (pilot: Cut Salon); medical clinic second, with sensitive data/compliance design before implementation. Both Egypt and Gulf are first-launch intended markets; jurisdiction-specific requirements remain open.

### Engineering safety

Migrations, least privilege, audit, backups, encrypted transport, tested auth and tenant isolation, CI/CD. No production implementation exists yet.

[Decisions](../05-decisions/DECISIONS.md) · [Open questions](../04-execution/OPEN-QUESTIONS.md).

## Founder-approved tenancy requirements (2026-10-28)

Tenant represents owner account, with multiple independently branded/accounted Businesses of possibly different industries. Each Branch belongs to one Business. Business customer directory and core pricing can be shared among Branches, while pricing overrides, stock, treasuries, shifts and scoped employee permissions exist at Branch level. Each Business chooses active modules and extensions; one module may have multiple compatible extensions. Shared database with strong tenant isolation. Tenant-scoped accounts (no account shared across Tenants), with separate per-Branch roles and sensitive audit history. See [Tenancy Architecture](TENANCY-ARCHITECTURE.md). Dependencies and detailed schema are still open.

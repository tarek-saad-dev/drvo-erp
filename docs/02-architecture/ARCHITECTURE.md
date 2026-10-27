# Architecture baseline

**Status:** Direction accepted; design details pending review.  
**Companion records:** [ADR register](../05-decisions/DECISIONS.md) | [Open questions](../04-execution/OPEN-QUESTIONS.md).

## System structure

Single repository; modular monolith application with an API, web UI and optional job worker. Keep module boundaries and contracts explicit.

### Platform core

Identity, authentication, tenants, businesses, branches, memberships, RBAC, module entitlements, audit/security.

### Business modules

Catalog, customers, POS/sales, payments, POS sessions, inventory, employees/payroll, booking, finance/reporting.

### Industry extensions

Salon, Retail, future Clinic. Share sale/cart/payment primitives; attach distinct policy/workflow integrations, not duplicated POS implementations.

## Tenant model

Tenant is the subscription and isolation boundary; Business belongs to Tenant; Branch belongs to Business; users get scoped memberships/roles. The canonical authenticated context identifies tenant/business; never trust client-supplied tenant IDs as authorization.

Initial database approach: shared database with tenant-aware rows, composite tenant-scoped constraints where necessary, server-enforced isolation, integration tests for cross-tenant access. Dedicated tenant databases may be considered later but are **not** implemented.

## Module communication

- Explicit module APIs for synchronous decisions/queries.
- Domain events for cross-module reactions.
- Atomic transactions for critical financial/inventory invariants.
- Transactional outbox and idempotent consumers where reliable asynchronous delivery is necessary.

## Data evolution

Use versioned migrations and environments (dev/staging/prod). Historical Cashier tables are references for mapping, **not** a schema to copy. Design appropriate sale/payment, catalog/inventory, cash and accounting boundaries.

## Safety and engineering

Password hashing, secrets management, least privilege, RBAC, tenant isolation, logs/auditing, backups/restoration, tests and CI/CD.

## Not yet decided

Runtime/framework, ORM, SQL engine final selection, tenant isolation implementation, hosting and subscription provider. Record final decisions in ADRs before implementation.

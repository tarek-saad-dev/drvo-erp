# Cashier repo reuse evaluation — desktop review
Date: 2026-10-29
Status: READ-ONLY code inspection only. No code moved or run.

Source repo: https://github.com/tarek-saad-dev/casher
- package.json: Next.js 16, React 19, mssql, decimal.js, scripts for DRVO tenant/migration/isolation smoke, messaging workers, booking and HR.
- src/lib/db.ts: SQL Server pools, local/cloud modes; must not import production-specific connection defaults or permissive certificate behavior into new SaaS.
- src/lib/permissions-server.ts: RBAC access with allow lists; port concepts and test cases, not direct route/page wiring.
- src/lib/session.ts: custom signed session cookie with branch/tenant identity; evaluate against hardened SaaS auth rather than blindly reuse secret/session model.
- scripts/drvo/runner.ts: checksummed versioned migrations and database target guard; good architectural reference, adapt independent DRVO database.
- scripts/drvo/drvo-013-tenant-isolation-smoke.ts: synthetic tenant isolation cases; valuable as cross-tenant regression test specification, not a claim all SaaS isolation is proven.
- scripts/messaging-outbox-worker.ts and src/modules/messaging/application/processOutboxTick.ts: independent outbox worker, retries, per-tenant dispatch and deduplication architecture.
- src/platform/outbox/processor.ts: booking-specific event dispatch to WhatsApp; coupled to legacy booking and hard-coded event list, must generalize.
- scripts/run-nightly-close.ts: job patterns for payroll/day close, but contains existing operational assumptions.
- src/modules/messaging/conversation/application/processInboxTick.ts: inbound pipeline and tenant scope for future optional WhatsApp module.

## Recommendation
Reuse domain understanding, state-machine tests, relevant pure calculation functions, and verified generic primitives after isolated code review. Avoid copying legacy database schema, hardcoded IDs, monolithic API routes or importing Cashier as ERP platform foundation. Build independent DRVO ERP repository and shared schema; migration of Cut Salon data is a separate carefully staged ETL with reconciliation.

## Priority audit before code
1. Business workflow/data flow map for Catalog/POS/HR/Booking/Inventory/Accounting.
2. Pure-function extraction opportunities and test parity.
3. Tenant scoping, credential storage, trust-certificate defaults, transaction semantics and isolation failure audit.
4. Integration boundary with existing Cut Salon booking website and WhatsApp/DRVO AutoResponse.
5. Staged data migration plan for pilot; never point new project migrations at production Cashier database.

This is based on sampled files only; full coverage review and live tests not completed.

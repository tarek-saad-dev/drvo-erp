# CU-2 — Cashier → DRVO synthetic identifier mapping, dry-run ONLY

**Date:** 2026-11-12. **Status:** PR #63 merged in main (K0/K1 CI PASS); test-only dry-run, not live ETL or production migration. Source-of-truth mapping concepts: [CASHIER-MIGRATION](../06-reference/CASHIER-MIGRATION.md), [pinned Cashier audit](CASHIER-REUSE-AUDIT-2026-11-12.md), [CU-1 source parity PR #62](https://github.com/tarek-saad-dev/drvo-erp/pull/62). ADR-030 accepted enforcement baseline; ADR-031/032 and K5F remain OPEN.

## Architectural change / security impact

This tool is **test-only** and installed under `tools/cashier-reuse/` with no API runtime import. It performs no DB writes, network requests, file reads, transformation of real contacts, Cashier updates or DRVO data insertion. It validates explicitly approved synthetic `TenantId → BusinessId → BranchId` ancestry before producing a deterministic **dry-run mapping manifest**. Domain-specific ownership remains Catalog/Customers; legacy numbers are never authorization or global identities. The Shared Kernel does not absorb industry-specific legacy logic.

- `TblClient` → Business-scoped Customers; `TblPro` → Business-scoped Catalog Offering as preliminary **concepts**, not final one-to-one production schema maps.
- Composite identity of a legacy source must include independently verified source dataset, table and legacy row key; legacy ID alone is ambiguous. The dry-run accepts a `SYN-...` dataset and synthetic per-Branch routing metadata, rejecting cross-Business scopes and duplicate target assignment.
- Real staging ETL requires *separate* approved mapping of every field, ownership, consent/privacy, dedup, audit, source-of-truth, backup/restore, change-data cutover and reconciliation. Numeric legacy Branch/Emp IDs have no implicit DRVO UUID authority.
- No passwords, names, phones, email, financial data, connection strings or raw source records may enter fixtures or any mapping output.
- Fingerprint is a nonsecret SHA-256 diagnostic of synthetic manifest, not a signature/authorization. Verified target branch IDs reflect supplied **test configuration**, not SQL permission grants.

## Executable acceptance

`tools/cashier-reuse/synthetic-map-plan.cjs` + `tests/cashier-synthetic-mapping.test.cjs` verify valid dual-branch synthetic manifest and digest independent of row order; unknown Branch, cross-Tenant/Business, duplicate mapping, bad IDs, table outside allowlist, PII/connection string and missing dataset all fail closed. Designed to run in root `npm test`.

## Open CU-3 gate

Choose the first business-domain owner for actual adapted pure logic. Before any real data copy, require approved read-only source extraction runbook, minimization and anonymization, secure credential isolation, target DB migration readiness, synthetic end-to-end rehearsal, reconciliation and rollback approval. **Do not connect to operational Cashier or VPS DRVO databases from this PR.**

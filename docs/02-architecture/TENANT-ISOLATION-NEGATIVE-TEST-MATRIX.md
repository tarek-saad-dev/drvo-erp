# DRVO ERP — Tenant Isolation Threat Model and Negative Acceptance-Test Matrix

**Date:** 2026-10-30
**Status:** **TEST SPECIFICATION ONLY**. No unit/integration/penetration/load tests executed. The planned contract is [Tenant/Business/Branch Isolation](TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md); accepted founder product decisions in [Identity/Access](IDENTITY-ACCESS.md), [Tenancy](TENANCY-ARCHITECTURE.md), [ADR-029 Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md).
**Goal:** verify **positive intended access AND negative access denial** for micro-Salon, chain and future highly sensitive Enterprise/Clinic across all Module boundaries.

## 1. Test fixture plan (hypothetical only)

- **Tenant T1:** Salon Business `B1` with Branch `L1` and `L2`; a second Trade Business `B2` with Branch `L3`. Owner `U1` explicitly joined B1 and B2. Manager `U2` authorized only B1/L1; Manager `U3` permitted B1/L1+L2 financial reports; cashier `U4` only B1/L2. `U5` disabled after login.
- **Tenant T2:** different owner/account `U6`, separate Clinic Business `B3`, Branch `L4`, protected Clinical domain. Tenant accounts are not shared; usernames are globally unique.
- **Platform support principal `SUP1`:** no ordinary Customer Business membership by default, only approved future break-glass access if explicitly designed.
- Test data per Business: customer, service, booking, invoice, journal, refund, stock, staff, shift, cash, attachment, Theme/font asset, stored search, pending export and queued outbox message.
- Same-named Business, Employee, Customer and similar identifiers across Tenants/Businesses; use **different and colliding-looking IDs** to ensure scoping is enforced independently of ID uniqueness.
- For every forbidden case, reject with safe error semantics and no sensitive counts, record details, field options or existence side channel. Keep internal audit and correlation ID without leaking protected payload.
- **All tests listed are hypothetical; fixture population/testing requires separate founder authorization.**

## 2. Threat matrix (P0 unless specified)

| ID | Surface / attack | Expected outcome / guard |
|---|---|---|
| ISO-001 | Login `U2` + client submits forged `tenantId=T2` | Server uses authenticated T1 identity; T2 access forbidden |
| ISO-002 | `U2` guesses invoice ID of T2/B3 via URL or API | Forbidden; no invoice body or private existence disclosure |
| ISO-003 | `U2` changes Business ID B1→B2 inside T1 | Forbidden without explicit B2 membership; Owner's access does not propagate to employees |
| ISO-004 | `U2` changes Branch L1→L2 | Deny Branch-local stock/Treasury/shift and unauthorized records |
| ISO-005 | `U1` switches B1→B2 | Both require explicit membership; correct B2 theme, app activations, records, cache, finance and permitted Branch list |
| ISO-006 | `U3` views B1 report covering L1+L2 | Authorized aggregate contains correct scoped Branches; no L3/B2 contribution |
| ISO-007 | `U2` asks for all Branch profit with crafted filter | Only authorized L1 scope; no L2/L3 totals or item count |
| ISO-008 | Cashier `U4` opens `/admin/accounting` despite hidden App tile | Direct API authorization denies action; UI visibility not security |
| ISO-009 | Business A custom font/logo ID points to B2/T2 asset | No cross-Business private asset leak, wrong Theme inheritance or unapproved change |
| ISO-010 | Cross-Business FK: B1 invoice links B2 Customer ID | DB/invariant rejects even if guessed UUID exists |
| ISO-011 | Branch-owned Treasury row references Branch from another Business | DB/domain rejects invalid ancestor without misposting |
| ISO-012 | One Business owner sends money between two Branches | Both endpoints checked, authorized transfer, audit and balance invariants |
| ISO-013 | Manager `U2` attempts to create Manager with all-Business rights | Fail privilege escalation; delegated role/scope cannot exceed explicit authorized grants |
| ISO-014 | `U5` disabled after login, reuses old bearer session | Next protected API request rejected and no new sensitive job scheduled |
| ISO-015 | Role removed during long-running export | Revalidate before issuing/returning private file; cancel or narrow according to final policy |
| ISO-016 | Cached dashboard for U3 requested by U2 with same Business ID | No data leak from privilege-filtered cache; keys include relevant permission context |
| ISO-017 | Switch Business while prior search request is in flight | Old B1 result cannot render as B2 suggestions / records |
| ISO-018 | Search autocomplete with unowned Customer/Employee | No private fields, existence/count clues |
| ISO-019 | Outbox event T1/B1 payload claims T2/B3 tenant fields | Reject invalid provenance/scope; log safe audit and DLQ/review |
| ISO-020 | Replayed same authorized SalePosted event 20 times | Exactly one business journal effect, no cross-tenant effects; delivery may be repeated |
| ISO-021 | Worker uses generic Tenant default after retry/exception | Never silently switch scope; fail closed or controlled reconciliation |
| ISO-022 | Long-running worker starts with expired/removed actor rights | Define trusted service principal/previously committed obligation policy; never assume user grant remains |
| ISO-023 | PDF/CSV/Excel export modified with URL `businessId=B2` | Server-scoped export query denies, scoped signed download access |
| ISO-024 | BI/pivot aggregates from T2 or B2 under T1/B1 | Filter **before** aggregate; total and drilldowns agree within scope |
| ISO-025 | Download via old export link after member access revoked | Denied or time-bounded policy with documented revocation guarantees |
| ISO-026 | Support `SUP1` attempts direct Clinic record read | No inherited Customer rights; sensitive access needs separately approved audited time-bound workflow |
| ISO-027 | Clinic encounter emits generic Booking/WhatsApp event with medical content | Reject/redact; clinical data never published to generic subscribers |
| ISO-028 | Theme or optional Module enabled for B1 | B2 (same Tenant) configuration/Apps/entitlements unchanged |
| ISO-029 | Access to suspended Module historical financial data | Only rights and retention-approved read; no new mutations; no history deletion |
| ISO-030 | Branch record unscoped due to null Branch ID | Reject/explicit Business-owned type; never widen Branch-owned access |
| ISO-031 | SQL query uses only a globally unique record ID | Architecture lint/test identifies unauthorized unscoped access path; direct DB defense evaluated |
| ISO-032 | Import API/upload contains references to other Business/Branch | Reject foreign ownership and partial inconsistent imports |
| ISO-033 | Bulk selection "all filtered" uses stale filter or stale membership | Recheck membership/resource scope and operation count at execution |
| ISO-034 | Event, queue or webhook payload alters `actorId`/Tenant context | Enforce trusted producer/service authentication; untrusted payload not authority |
| ISO-035 | Business placement migration simulates B1 to new pool | Scope and audit preserved, event/cache/backup reconciled, no B2 data moved |
| ISO-036 | High concurrency Tenant A requests + Tenant B export | No cross-Tenant contamination from pooled connection/session variables |
| ISO-037 | Session Data/Context leakage in SQL connection pool if RLS chosen | Must fail dedicated reset/reuse tests; no stale scope on next pooled request |
| ISO-038 | User A has multi-Branch role assignments, one Role per Branch | Correct branch-specific effective permission, no implicit Tenant-wide role union |
| ISO-039 | Resource from B1 joins Branch from B2 in reporting projection | Referential/aggregation contract rejects broken ancestry |
| ISO-040 | Read public Industry taxonomy / Module definition | Public global metadata readable without exposing private Business data |

## 3. Verification layers

| Layer | Test technique after authorization | Evidence required |
|---|---|---|
| Domain/Authorization | matrix unit/contract tests for membership, action, resource ownership | allowed vs forbidden table, no accidental superuser default |
| API | cross-Tenant/Business/Branch IDOR and privilege escalation; revoked token | explicit denial, audit correlation, zero private info |
| SQL/Referential | invalid composite owned FK inserts, cross-ancestor joins, connection pool context | constraint rejection and query review; RLS if chosen |
| Background/Events | forged provenance, replay, stale version, DLQ, user disable mid-job | only correct scoped/idempotent domain effect, recovery |
| Read models/Reporting | scoped aggregates, pagination, export, cache, autocomplete | numbers match authorized source rows, no count leak |
| Files/Brand | theme/font/logo/attachment access | correct Business asset and 403 on unrelated scoped assets |
| Ops/Support | break-glass, audit, backup/restore, migration and future Tenant pool routing | separate approved access trace and scope correctness |
| Load and chaos | concurrent T1/T2 workloads, retry/backfill/restore simulations | scope stays isolated under contention and failures |

## 4. Required artifacts for P0 FND-01 closure
1. Signed resource ownership/scope matrix for all actual Salon V1 entities, API endpoints, events and queries.
2. Server-side auth / permission evaluation policy consistent with approved default deny and one-Role-per-Branch; Manager delegated privilege and Owner bootstrap approved.
3. Selected SQL Server FK/indices/tenant isolation mechanism with a documented RLS decision, plus common repository enforcement contract.
4. Signed worker/queue/search/cache/report/export/security observability policies and support-operator isolation.
5. Executable negative tests and independent security review **only when founder authorizes code/tests**; test evidence and failure triage.
6. Reassess Gate D isolation under measured concurrent workloads and future placement; do not claim “100% tested” without facts.

**Overall status:** `TEST PLAN PREPARED; 0 TESTS RUN`. The presence of this matrix is **not** isolation certification or production readiness.

[Isolation Contract](TENANT-BUSINESS-BRANCH-ISOLATION-CONTRACT.md) · [Foundation Architecture Review](FOUNDATION-ARCHITECTURE-REVIEW-2026-10-30.md) · [Founder Charter](../00-start-here/PROJECT-NORTH-STAR-ARCHITECTURE-CHARTER.md).

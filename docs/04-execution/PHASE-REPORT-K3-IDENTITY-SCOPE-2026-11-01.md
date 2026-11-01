# DRVO ERP — K3 Stage Report: Signed Actor + SQL-Verified Branch Scope

**Report date:** 2026-11-01  
**Status:** **BOUNDED K3 PROOF COMPLETED / CI PASS**. Real business authentication remains NOT IMPLEMENTED.  
**PR:** [#10](https://github.com/tarek-saad-dev/drvo-erp/pull/10) merged to `main`.  
**Merge SHA:** `1dc3c0fff8ed1594623462e56af6d77b6e9474bf`.  
**Test SHA:** `25c73cda616d56b2bc90e92d49bbb04697c90907`.  
**CI:** [K3 run 41336574897](https://github.com/tarek-saad-dev/drvo-erp/actions/runs/41336574897) PASS, K0 run 41336574902 PASS, K1 run 41336574941 PASS.

## 1. Delivered

- Read-only NestJS **development-only** `GET /api/k3/businesses/:businessId/branches/:branchId`.
- Test-signed short-lived bearer JWT supplies Account subject and session revision **only**; Token TenantId / BusinessId / custom header cannot grant rights.
- DB-derived Tenant ancestry, current Account active flag and session revision, explicit active Business Membership, active Branch Role and `branch.read` Allow permission checked in one parameterized SQL query before returning Branch details.
- Disposable SQL Server 2022 Developer CI fixture for 2 Tenants, 3 Businesses, 4 Branches and distinct user memberships/roles; composite Tenant/Business foreign-key guards.
- **No customer login or persisted credentials**. The proof route denies if `NODE_ENV=production`, the explicit proof flag is absent, or non-loopback / nonthrowaway DB settings are requested.

## 2. Actual E2E test outcomes

| Check | Result |
|---|---|
| 01 Valid signed actor with current membership/role reads own Branch | PASS |
| 02 Missing token | PASS (401) |
| 03 Tampered signature | PASS (401) |
| 04 Different Tenant Branch cannot be read | PASS (404) |
| 05 Same Tenant but different Business without membership | PASS (404) |
| 06 Same Business but unassigned Branch | PASS (404) |
| 07 Account belonging to other Tenant cannot read A | PASS (404) |
| 08 Spoofed Tenant in signed test token/header ignored as access source | PASS |
| 09 Business Membership revoked — next request refused | PASS |
| 10 Branch Role revoked — next request refused | PASS |
| 11 Account disabled — request refused | PASS |
| 12 Old session revision — request refused | PASS |
| 13 Current session revision allows valid request | PASS |
| 14 Malformed Branch ID — denied | PASS |
| 15 Composite SQL FK denies cross-Tenant Account membership | PASS |

**CI confirmed:** 15 scenario results appear in K3 job logs; K0 foundation and K1 API/Web/Worker CI also passed. Tests use disposable, isolated SQL Server; no external customer records or VPS connections.

## 3. Important limits

- This is **NOT username/password signup or login**, recovery, SSO, robust session/token issuance, MFA or public authentication.
- This is **NOT proof** of SQL RLS, privileged DB least access, multi-Branch reporting, workers/outbox/caches/files/exports or domain-level sensitivity enforcement.
- ADR-030 technical final sign-off remains **PROPOSED**; role/delegation/Owner bootstrap and support break-glass need decisions and independent review.
- SQL proof uses local **sa** only on disposable CI; it is NOT a production connection policy. DB names, credentials and environment are forced to test-safe settings.
- Neither SQL migration schema nor token helper is an accepted customer production contract.
- No billing, Module activation, POS, Accounting or clinical data implemented; ADR-031/032 pending.

## 4. Website preview and VPS

**Public HTTPS URL: NOT YET DEPLOYED/VERIFIED.** The Next.js UI has passed local GitHub Actions build/smoke checks, not a deployed site. [VPS staging handoff](VPS-DRVO-ERP-STAGING-HANDOFF-V1.md) sets aside independent names/ports and the exact non-secret preparation checklist for a real preview.

## 5. Next milestone

**K4 Production-intent Identity Foundation (NOT YET COMPLETE)**:
1. Founder/security sign-off on ADR-030 exact resource matrix and Owner bootstrap/Manager non-escalation.
2. Safe separate Staging database and least-privilege connection, selected migrations/tooling with restore rehearsals.
3. Real global unique username/password authentication with strong hash, server-issued/rotated/revocable sessions, verification and login rate limiting; separate test/admin bootstrap.
4. Persisted explicit Business Memberships, Branch roles/permissions and audit with integration-negative tests, proper HTTP 401/403/404 semantics.
5. Scoped worker/export/cache tests and independent security evaluation.
6. Begin actual Kernel Module Registry and free test grant; **SaaS Commercial Core next**, paid activation only after ADR-032.
7. VPS staging Web preview with verified public HTTPS URL; no DRVO AutoResponse/Cut Salon production dependencies.

**This report is evidence of a specific security experiment, not certification of a deployed secure ERP.**

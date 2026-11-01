# K3 — Trusted Scope HTTP + SQL Integration Proof

**Status:** DEV/CI-SCOPED AUTHORIZATION PROOF, **not** DRVO ERP production authentication or ADR-030 technical acceptance.

[ADR-030](../../docs/05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md) remains PROPOSED. The founder authorized development; the final Owner bootstrap/delegation, session issuer/recovery, real migrations/RLS, background/media/cache scoping, support access and independent security review remain open.

## Proof arrangement

- K3 test harness creates a **disposable SQL Server 2022 Developer database** and inserts synthetic Tenant A/B, Businesses, Branches, Accounts, explicit Business Memberships, Branch Roles and action permission `branch.read`.
- A NestJS HTTP route **GET /api/k3/businesses/:businessId/branches/:branchId** validates a short-lived **HS256 signed CI-only bearer token** (subject AccountId + session revision), then **looks up Tenant from DB**. The caller's Tenant headers/claims cannot control scope.
- One SQL repository query demands Account enabled and session revision current, exact Tenant ancestry, explicit active Business Membership, active Branch Role and `branch.read` Allow. Missing matches return `404` without disclosing whether a resource exists. Invalid token returns `401`.
- Only starts when `NODE_ENV != production`, `DRVO_K3_PROOF_ONLY=YES`, disposable DB name `DrvoK3Proof` and localhost SQL host are explicitly configured. Missing config fails closed. This is not a real login/refresh/account creation flow.
- GitHub Action `K3 Trusted Scope Proof CI` creates a fresh local-only SQL Server container, generates ephemeral database/JWT secrets, builds API and performs **real HTTP negative tests**, then deletes the container.

## Negative scenarios

1. Valid signed Account A with Business Membership and Branch Role reads A/Branch1.
2. Missing/tampered token fails.
3. Cross-Tenant Business/Branch and same-Tenant different Business fail.
4. Same Business but unassigned Branch fails.
5. Signed Account from other Tenant fails.
6. Spoofed Tenant in token payload/header does **not** widen or rewrite scope.
7. Revoked Business Membership, Branch Role or disabled Account denies next request; old session version denies.
8. Malformed BranchId rejects; composite SQL Account→Membership FK rejects cross-Tenant association.

**Do not promote this test route as a customer feature.** Production use of proof guard is deliberately disabled; real authentication requires secure password hashing, login throttling, session issuance, recovery, auditing, release procedures, approved ADR and negative testing. No SaaS billing, POS/GL, worker scope or user data is touched.

## Next technical gates

- Founder/security architecture sign-off of [ADR-030](../../docs/05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md).
- Final SQL Server driver/migration solution, role/grant inheritance matrix, secure ownership bootstrapping.
- Real identity/login/session implementation with rotation/revocation and password recovery.
- Resource owner tests for worker, cache, exports and multi-Branch reports.
- Isolated staging deployment with database principal least privilege and real backup restore.

**No VPS or production database changes performed.**

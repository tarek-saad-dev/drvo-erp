# K5F-2 — Safe Staging activation readiness: no-activation gate (2026-11-12)

**Status:** PR #66 MERGED with K0/K1/K5D CI success; **no VPS K5F operator execution or acceptance**. Staging code-only deploy for merge SHA a1477e07 was verified, but updated immutable root-owned checker bundle was NOT refreshed/executed. K5F remains OPEN. This hardens a read-only operator checker, not a migration runner or entitlement activator. Prerequisites: [K5F security runbook](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md), [ADR-030 accepted scope](../05-decisions/ADR-030-TENANT-ISOLATION-ENFORCEMENT.md), [ADR-032 proposed activation](../05-decisions/ADR-032-ATOMIC-BUSINESS-MODULE-ACTIVATION-AND-VERSION-CONTRACT.md).

## Architecture impact before change

- Zero modifications to API/Web business behavior, database schemas, deployment receivers, SQL users/grants, public DNS, Cashier or customer data.
- **Root-owned K5F checker** is expanded to fail when ANY current Business Module API/Web feature flag is `YES` (Catalog, Customers, Booking, POS Preview, POS Drafts); these are added to existing K5 API/Web flags. The exact 001–009 observed migrations rule is **NOT relaxed**. The operator bundle must be reviewed and replaced as already specified before executing this updated file as root; no execution from a mutable repo checkout.
- **Independent source/CI-only planner** `tools/staging-readiness/manifest-plan.cjs` hashes actual source SQL 001–014, validates exact chronological migration history supplied as untrusted, non-secret evidence under the **current K5F max nine records**, and reports the unobserved source gap. Even on nine matching records output remains `REVIEW_ONLY_NOT_AUTHORIZED` with `canApplyToVps:false`.
- Role/branch/account access still requires live scope enforcement ADR-030; a green source CI or successful SSH code deployment cannot create entitlements or override the unpaid module activation ADR-032 boundary.

## Verification and negative tests

- `tools/k5d/check-staging-readiness.test.cjs` now tests **all 10 API + 7 Web** current K5/business flags; each `YES` fails. Unknown or inconsistent service config still blocks. K5D disposable SQL CI runs these tests.
- `tests/staging-manifest-readiness.test.cjs` (root K0 tests) verifies source migration 001–014 hashes/prefix and rejects wrong DB, changed checksums, out-of-order history, unexpected rows and extra evidence fields. This tool does NOT fetch VPS history itself.
- Run `npm run verify` + K5D SQL CI on the PR commit. These cannot establish current VPS migration history or offsite recovery.

## Future stages, each requires separate approval

| Stage | Evidence required | Status |
|---|---|---|
| K5F root operator technical preflight | Authenticated root-owned immutable bundle, exact reviewed/deployed SHA, closed K5/business flags, runtime privileges and trusted proxy | **OPEN / not executed by this PR** |
| K5F external gates | Correct Nginx real-IP/Origin chain, access restriction, mail-domain and actual synthetic onboarding, no exposed PII | **OPEN** |
| Database disaster recovery | Off-host encrypted backup **plus independent isolated restore** preserving migration/history and object permissions; owner records retention/RPO/RTO | **OPEN** |
| SQL 010–014 authorization | Explicit authorized operator migration window, rehearsed restore, checksum drift proof, scoped SQL grants, rollback policy and monitoring | **NOT APPROVED** |
| Activation | ADR-032 accepted, account/Business entitlement confirmed with server-side current checks and test matrix | **NOT APPROVED** |
| Financial Posting | ADR-031 Finance + Founder + Architecture acceptance, first balanced GL and no false tender evidence | **NOT APPROVED** |

**Operator guard:** Never run `staging-db-migrate`, `DRVO_K4_APPLY_STAGING=YES`, change flags, copy actual credentials, or run root commands from this PR. The existing [Staging DB automation](../../ops/staging/db-automation/README.md) is a separately human-authorized workflow, **not** triggered here. Any database restore test must run only on a newly created isolated DRVO-owned database and never overwrite `DRVO_ERP_STAGING` or Cashier databases.

## Next safe code work after PR

Read-only migration metadata audit with actual vetted operator evidence and root-owned checker pinning can happen without changing VPS SQL. After founder and security approval, prepare a separately reviewed targeted staging migration and backup/restore runbook. UI tiles/feature flags remain OFF until Commercial activation is approved. Do not confuse source readiness with operational activation.

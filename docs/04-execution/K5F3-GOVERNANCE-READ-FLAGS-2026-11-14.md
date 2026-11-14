# K5F-3 — Governance feature flags fail closed in immutable operator audit

**Date:** 2026-11-14  
**Status:** review PR / code+test only; live K5F operator audit **NOT executed** or accepted.

## Problem and impact before change

SC-0 Release Registry, SC-1 Business Quote Preview, and K6C Candidate read endpoints were added with individually default-OFF private API flags. The older immutable root-owned K5F readiness checker did not explicitly list those flags in `API_GATES`. The endpoints themselves require the trusted K5 session, but that alone is **not** an adequate security pre-activation checklist.

**Narrow fix:** append `DRVO_K6C_CATALOG_READ_ENABLED`, `DRVO_SC0_RELEASE_READ_ENABLED`, `DRVO_SC1_PREVIEW_READ_ENABLED` to the actual K5F API gate inventory. Each `YES` must reject pre-activation readiness; zero Web flags were introduced by those read-only endpoints. Add a source-level regression test reading the three controller files and ensuring every `DRVO_..._ENABLED` reference is in the K5F deny inventory, so a future code change cannot silently omit these private API flags.

## Security/architecture invariants

- **No** SQL, schema, API implementation changes, public auth, private flag change, runtime user, extra SQL grant, new service, customer PII, enablement or mail action.
- Source K5F still **only** verifies exact observed SQL migration prefix **001–009** before approval of source **010–017**. It never asserts new migrations have run on the VPS or permits 010–017.
- Root execution MUST use independently installed, reviewed, immutable root-owned K5F bundle. A successful GitHub CI test does not install/update that bundle. **Do not run it as root from a mutable Git checkout** or copy secrets to chat/GitHub.
- Test requires the same fail-closed condition on current K6C/SC0/SC1 controller paths as on K5 API and Business Modules. This does not replace physical trust of the executable bundle or real network/Origin/Tenant audit.
- No SC-2/SC-3, no commercial Entitlement, no released production Module. Production SC-0 registry still EMPTY, SC-1 live API remains UNQUOTABLE; ADR-032 financial/security policy incomplete.

## Verification

- `tools/k5d/check-staging-readiness.test.cjs` asserts the exact 13-item API flags and 7-item Web flags, every gate individually rejects YES, the three controllers' literal gate strings are all inventoried, and existing environment/permission tests remain green.
- K0/K1 / K5D CI and relevant staging gates must PASS on final PR head.
- After merge, only a separately authorized operator may review and install the updated root-owned K5F bundle and then independently run the read-only audit with trusted observed SHA. Do not claim that occurred here.

**Rollback:** revert code/test/docs before operational use; leave all live flags OFF. [Salon gate tracker #106](https://github.com/tarek-saad-dev/drvo-erp/issues/106) P1/P3 remain OPEN; this PR eliminates one source coverage gap, not the entire gate.

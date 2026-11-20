# Track A — Private Pilot Operational Readiness — 2026-11-20

**Status:** machine-checkable readiness package only. **No production verification claimed.** Primary/VPS SQL apply is **FORBIDDEN** from this track. Cut live import is **BLOCKED**. ADR-031 posting is **BLOCKED**. Real-data activation remains **BLOCKED**.

Related: [TRACK-D-CUT-SALON-READINESS-2026-11-19](TRACK-D-CUT-SALON-READINESS-2026-11-19.md), [CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18](CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18.md), [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) (PROPOSED).

## What this delivery is

| Deliverable | Path | Claim |
| --- | --- | --- |
| Fail-closed readiness board | `tools/pilot/readiness-board.cjs` | SQL001–034 source checksums + OPEN/BLOCKED operator gates |
| Offline verify | `tools/pilot/verify.cjs` | Exit 0 only while activation stays BLOCKED |
| Workflow matrix + builder | `tools/pilot/workflow-matrix.json` + `workflow-matrix-builder.cjs` | Customer→…→Reload statuses |
| S12/S13 checklist | `tools/pilot/workflow-checklist.cjs` | Maps which phases cover matrix steps |
| E2E evidence matrix | `tools/pilot/e2e-matrix.cjs` | PASS/FAIL/BLOCKED + evidence commands |
| Backup/restore plan + harness | `backup-restore-evidence.cjs` + `isolated-db-harness.cjs` | Disposable SQL only |
| K5 Owner bootstrap plan/seed | `k5-owner-bootstrap-evidence.cjs` | Plan OPEN; disposable seed in harness |
| Board JSON/MD artifacts | `tools/pilot/render-board.cjs` → `artifacts/` | Fail-closed export |
| Unit tests + CI | `tests/pilot-readiness.test.cjs`, `.github/workflows/pilot-readiness-ci.yml` | Offline + disposable SQL |

## What this delivery is NOT

- Not primary/VPS migration apply evidence.
- Not Cut live SQL connection or real-data import.
- Not ADR-031 paid posting / tender / GL enablement.
- Not authenticated Owner browser acceptance on a real Pilot workspace (`OWNER_BROWSER_E2E` stays **OPEN**).
- Not draft-print parity (POS-07 / `DRAFT_PRINT` stays **BLOCKED**).

Disposable GitHub CI PASS (migrations + backup/restore on `DrvoPilotDisposable*`, S12/S13 Chromium elsewhere) remains **CI-only** and does not close human Pilot gates.

## Honest gate status (this commit)

| Gate | Status |
| --- | --- |
| SOURCE_MIGRATIONS_001_034 | **PASS_SOURCE_ONLY** (git checksums) |
| TARGET_APPLY (isolated Pilot DB) | **OPEN** (operator) |
| ISOLATED_BACKUP_RESTORE | **OPEN** (operator; disposable harness is CI rehearsal only) |
| K5_PERMISSIONS | **OPEN** (operator; disposable seed ≠ Pilot Owner session) |
| OWNER_BROWSER_E2E | **OPEN** |
| ADR031_POSTING | **BLOCKED** |
| CUT_LIVE_IMPORT | **BLOCKED** |
| Draft Print workflow step | **BLOCKED** |

## Workflow matrix (E2E evidence class)

Path: `tools/pilot/workflow-matrix.json`

| Step | Matrix status | E2E gate | Evidence command |
| --- | --- | --- | --- |
| Customer | CI_ONLY | PASS | `node tools/pilot/workflow-checklist.cjs` |
| Booking | CI_ONLY | PASS | `node tools/pilot/workflow-checklist.cjs` |
| Barber | CI_ONLY | PASS | `node tools/pilot/workflow-checklist.cjs` |
| POS Draft | CI_ONLY | PASS | `node tools/pilot/verify.cjs` |
| Inventory Validation | READY_IN_REPO | PASS | `apps/web/test/pos-product-stock-gate.test.cjs` present |
| Draft Print | BLOCKED | BLOCKED | POS-07 not merged / no draft-print owner |
| Reload | CI_ONLY | PASS | S12/S13 reload phase markers |

## Operator procedure (isolated Pilot DB only)

1. **Confirm destination identity** — dedicated DRVO Pilot database name, Owner principal, Tenant/Business/Branch UUIDs. Never reuse Cut/Cashier/AutoResponse/primary live SQL.
2. **Backup first** — COPY_ONLY (or approved) → `RESTORE VERIFYONLY` → restore into a **new** recovery DB; compare `core.SchemaMigration` checksums to git.
3. **Apply SQL001–034** only on the isolated Pilot DB with a restricted migrator; re-read checksums. Do **not** apply from chat to primary/VPS.
4. **K5 Owner bootstrap** — grant Pilot scopes (`customers.*`, `booking.*`, `hr.*`, `pos.draft.*`, `inventory.read`, …); keep ADR-031 posting flags **OFF**.
5. **Owner browser E2E** — Customer → Booking → Barber → POS NONPOSTING Draft → Inventory validation → Reload. Treat disposable Chromium as preparatory only.
6. **Draft Print** — remains **BLOCKED** until a NONPOSTING draft-print owner merges (ledger POS-07).
7. **No Cut live import** — use Track D fixtures only until founder-approved export + identity ledger exist off-chat.

## Local / CI commands

```bash
node --test tests/pilot-readiness.test.cjs
node tools/pilot/verify.cjs
node tools/pilot/render-board.cjs
# Disposable SQL (CI flags only — never primary/VPS):
# GITHUB_ACTIONS=true DRVO_PILOT_CI_DISPOSABLE=YES DRVO_PILOT_CI_PORT=14345 \
#   SQL_TEST_SA_PASSWORD=... node tools/pilot/isolated-db-harness.cjs
```

Expected offline verify JSON includes `productionVerificationClaimed: false`, `realDataActivation: "BLOCKED"`, `adr031Posting: "BLOCKED"`, and blocking gate ids for target apply / restore / K5 / Owner browser.

## Architecture language

DRVO remains a **Modular Monolith** with **Tenant / Business / Branch isolation**. Pilot readiness must preserve default-deny foreign scope and must not collapse Cut production SQL into the Pilot database.

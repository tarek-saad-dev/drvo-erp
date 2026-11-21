# Track A — Private Pilot Operational Readiness — 2026-11-20

**Status:** machine-checkable readiness package only. **No production verification claimed.** Primary/VPS SQL apply is **FORBIDDEN** from this track. Cut live import is **BLOCKED**. ADR-031 posting is **BLOCKED** (`postingActivation=BLOCKED`). Real-data activation remains **BLOCKED**.

Related: [TRACK-D-CUT-SALON-READINESS-2026-11-19](TRACK-D-CUT-SALON-READINESS-2026-11-19.md), [CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18](CUT-SALON-REAL-PRODUCT-LIVE-DEVELOPMENT-2026-11-18.md), [ADR-031](../05-decisions/ADR-031-FINANCIAL-CONSISTENCY-AND-POSTING-BOUNDARY.md) (PROPOSED), [ADR-031 posting readiness package](ADR-031-POSTING-READINESS-PACKAGE-2026-11-20.md), [POS-S5 draft print](POS-S5-DRAFT-PRINT-PREVIEW-2026-11-20.md).

## Merged #147–#153 reality (this sync)

| Item | In-repo reality |
| --- | --- |
| Migrations | Git has **SQL001–040**. Formal Track A gate still reports **PASS_SOURCE_ONLY** for **001–034** checksums; **035–039** NONPOSTING slices + **040** Owner Pilot module permissions (`EnsureOwnerPilotModulePermissions` + expanded `ClaimApprovedOwner`). Activation: [PRIVATE-PILOT-P0-ACTIVATION-2026-11-21](PRIVATE-PILOT-P0-ACTIVATION-2026-11-21.md). |
| POS-07 / Draft Print | **#151** merged NONPOSTING DRAFT print preview (`window.print` only). Matrix step `DRAFT_PRINT` = **READY_IN_REPO**. Fiscal/paid receipt remains **BLOCKED**. |
| Purchasing | **#152** / **SQL037** suppliers + receive + AP preview (NONPOSTING). |
| Queue | **#153** / **SQL036** settle-expired + grouped live board (NONPOSTING). |
| ADR-031 package | Readiness package/board merged; ADR remains **PROPOSED**; **`postingActivation=BLOCKED`**. |
| Owner Pilot browser | **`OWNER_BROWSER_E2E` stays OPEN** — disposable CI ≠ Owner proof. |

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
- Not fiscal/paid receipt print (thermal agent / POSTED reprint remain blocked under ADR-031).

Disposable GitHub CI PASS (migrations + backup/restore on `DrvoPilotDisposable*`, S12/S13 Chromium elsewhere) remains **CI-only** and does not close human Pilot gates.

## Honest gate status (this commit)

| Gate | Status |
| --- | --- |
| SOURCE_MIGRATIONS_001_034 | **PASS_SOURCE_ONLY** (git checksums; tree also has 035–040) |
| TARGET_APPLY (isolated Pilot DB) | **OPEN** (operator — apply through **040** on `DRVO_ERP_STAGING`) |
| ISOLATED_BACKUP_RESTORE | **OPEN** (operator; disposable harness is CI rehearsal only) |
| K5_PERMISSIONS | **OPEN** (operator; SQL040 + flag drop-ins in-repo; disposable seed ≠ Pilot Owner session) |
| OWNER_BROWSER_E2E | **OPEN** |
| ADR031_POSTING | **BLOCKED** (`postingActivation=BLOCKED`) |
| CUT_LIVE_IMPORT | **BLOCKED** |
| Draft Print workflow step | **READY_IN_REPO** (#151 NONPOSTING `window.print`) |

## Workflow matrix (E2E evidence class)

Path: `tools/pilot/workflow-matrix.json`

| Step | Matrix status | E2E gate | Evidence command |
| --- | --- | --- | --- |
| Customer | CI_ONLY | PASS | `node tools/pilot/workflow-checklist.cjs` |
| Booking | CI_ONLY | PASS | `node tools/pilot/workflow-checklist.cjs` |
| Barber | CI_ONLY | PASS | `node tools/pilot/workflow-checklist.cjs` |
| POS Draft | CI_ONLY | PASS | `node tools/pilot/verify.cjs` |
| Inventory Validation | READY_IN_REPO | PASS | `apps/web/test/pos-product-stock-gate.test.cjs` present |
| Draft Print | READY_IN_REPO | PASS | #151 evidence paths exist (`draft-print.ts`, `cashier-draft-print*`, POS-S5 doc, shared CI) |
| Reload | CI_ONLY | PASS | S12/S13 reload phase markers |

## Operator procedure (isolated Pilot DB only)

1. **Confirm destination identity** — dedicated DRVO Pilot database name, Owner principal, Tenant/Business/Branch UUIDs. Never reuse Cut/Cashier/AutoResponse/primary live SQL.
2. **Backup first** — COPY_ONLY (or approved) → `RESTORE VERIFYONLY` → restore into a **new** recovery DB; compare `core.SchemaMigration` checksums to git.
3. **Apply migrations** only on the isolated Pilot DB with a restricted migrator through **SQL040** (`DRVO_ERP_STAGING`). Re-read checksums. Do **not** apply from chat to primary/VPS.
4. **K5 Owner bootstrap** — apply Pilot flag drop-ins (`ops/staging/pilot/`), approve/claim Owner, run `EnsureOwnerPilotModulePermissions` / grant tool if Owner predated SQL040; keep ADR-031 posting flags **OFF**.
5. **Owner browser E2E** — start at `/pilot` → Customer → Booking → Barber → POS NONPOSTING Draft → Inventory validation → Draft Print (`window.print` only) → Reload. Treat disposable Chromium as preparatory only. **Never claim Owner E2E done from CI.**
6. **Draft Print** — in-repo after #151 as NONPOSTING DRAFT preview. Fiscal/paid receipt stays **BLOCKED**. Owner Pilot print proof remains **OPEN**.
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

Expected offline verify JSON includes `productionVerificationClaimed: false`, `realDataActivation: "BLOCKED"`, `adr031Posting: "BLOCKED"`, `DRAFT_PRINT` in `READY_IN_REPO` (not BLOCKED), and blocking gate ids for target apply / restore / K5 / Owner browser.

## Architecture language

DRVO remains a **Modular Monolith** with **Tenant / Business / Branch isolation**. Pilot readiness must preserve default-deny foreign scope and must not collapse Cut production SQL into the Pilot database.

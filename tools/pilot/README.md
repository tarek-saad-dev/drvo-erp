# Track A — Private Pilot readiness tools

Fail-closed, machine-checkable Pilot readiness package.

- **Never** applies SQL to primary/VPS.
- **Never** opens Cut live connections.
- **Never** enables ADR-031 posting (`postingActivation=BLOCKED` even after the ADR-031 readiness package merged).
- Offline `verify.cjs` exits 0 only while real-data activation remains **BLOCKED** and human gates stay **OPEN**.

## Post-#147–#153 reality (repo tip)

| Slice | Reality |
| --- | --- |
| Migrations | Source tree includes **SQL001–037** (formal readiness gate still checksums **001–034**; 035 barcode, 036 queue settle-expired, 037 purchasing receive/AP preview are in-repo NONPOSTING) |
| POS-07 Draft Print | **READY_IN_REPO** after **#151** (`window.print` DRAFT preview only; fiscal receipt **BLOCKED**) |
| Purchasing | **SQL037** suppliers + receive + AP preview (**#152**, NONPOSTING) |
| Queue | **SQL036** settle-expired + live board (**#153**, NONPOSTING) |
| ADR-031 package | Merged readiness docs/board; **`postingActivation=BLOCKED`** / ADR still **PROPOSED** |
| Owner gates | `TARGET_APPLY`, `ISOLATED_BACKUP_RESTORE`, `K5_PERMISSIONS`, `OWNER_BROWSER_E2E` remain **OPEN** — never claim Owner E2E done |

## Private Pilot P0 (2026-11-21)

- Owner journey plan: `node tools/pilot/owner-journey-plan.cjs`
- Module permissions contract: `tools/pilot/owner-module-permissions.cjs` ↔ SQL040
- Staging flag templates: `ops/staging/pilot/`
- Founder entry (Web): `/pilot`
- Activation doc: `docs/04-execution/PRIVATE-PILOT-P0-ACTIVATION-2026-11-21.md`

## Commands

```bash
node --test tests/pilot-readiness.test.cjs
node --test tests/pilot-owner-journey.test.cjs
node --test apps/web/test/private-pilot-entry.test.cjs
node tools/pilot/verify.cjs
node tools/pilot/owner-journey-plan.cjs
node tools/pilot/render-board.cjs
node tools/pilot/workflow-checklist.cjs
node tools/pilot/e2e-matrix.cjs
```

Disposable SQL harness (CI only):

```bash
GITHUB_ACTIONS=true DRVO_PILOT_CI_DISPOSABLE=YES DRVO_PILOT_CI_PORT=14345 \
  SQL_TEST_SA_PASSWORD=... node tools/pilot/isolated-db-harness.cjs
```

## Matrix path

`tools/pilot/workflow-matrix.json`

Doc: `docs/04-execution/PILOT-OPERATIONAL-READINESS-2026-11-20.md`

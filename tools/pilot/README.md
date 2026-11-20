# Track A — Private Pilot readiness tools

Fail-closed, machine-checkable Pilot readiness package.

- **Never** applies SQL to primary/VPS.
- **Never** opens Cut live connections.
- **Never** enables ADR-031 posting.
- Offline `verify.cjs` exits 0 only while activation remains **BLOCKED**.

## Commands

```bash
node --test tests/pilot-readiness.test.cjs
node tools/pilot/verify.cjs
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

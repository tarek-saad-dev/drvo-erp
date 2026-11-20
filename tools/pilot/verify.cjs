'use strict';

/**
 * Offline Track A Pilot readiness self-check.
 * Exit 0 only when:
 *  - SQL001–034 source checksums pass
 *  - Pilot activation remains BLOCKED
 *  - ADR-031 posting + Cut live import remain BLOCKED
 *  - Operator gates TARGET_APPLY / ISOLATED_BACKUP_RESTORE / K5 / OWNER_BROWSER stay OPEN
 *  - Draft Print is READY_IN_REPO (#151 NONPOSTING); fiscal receipt stays out of scope
 * Never opens mssql sockets or accepts connection strings.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const {assertNoLiveConnectionMarkers} = require('../cut-adapter/connection-gates.cjs');
const {buildPilotReadinessBoard} = require('./readiness-board.cjs');
const {
  buildWorkflowMatrix,
  writeWorkflowMatrixJson,
  loadCommittedWorkflowMatrix,
  MATRIX_PATH,
} = require('./workflow-matrix-builder.cjs');
const {buildPilotWorkflowChecklist} = require('./workflow-checklist.cjs');
const {buildE2eEvidenceMatrix} = require('./e2e-matrix.cjs');
const {offlineBackupRestorePlan} = require('./backup-restore-evidence.cjs');
const {buildPilotOwnerBootstrapPlan} = require('./k5-owner-bootstrap-evidence.cjs');
const {writeArtifacts} = require('./render-board.cjs');

assertNoLiveConnectionMarkers({});

const board = buildPilotReadinessBoard();
assert.equal(board.schema, 'drvo.pilot.readiness-board.v1');
assert.equal(board.mode, 'PILOT_READINESS_CHECKLIST_DRY_RUN_ONLY');
assert.equal(board.liveAccess, 'BLOCKED');
assert.equal(board.writes, 0);
assert.equal(board.networkDbCalls, 0);
assert.equal(board.productionVerificationClaimed, false);
assert.equal(board.realDataActivation, 'BLOCKED');
assert.equal(board.adr031Posting, 'BLOCKED');
assert.equal(board.cutLiveImport, 'BLOCKED');
assert.equal(board.primaryVpsSqlApply, 'FORBIDDEN');
assert.equal(board.summary.pilotActivationAllowed, false);
assert.ok(
  board.sourceMigrations.complete,
  'SQL001–034 source migrations must be present with checksums'
);
assert.equal(board.sourceMigrations.presentCount, 34);
assert.equal(
  board.gates.find((g) => g.id === 'SOURCE_MIGRATIONS_001_034').status,
  'PASS_SOURCE_ONLY'
);

for (const id of [
  'TARGET_APPLY',
  'ISOLATED_BACKUP_RESTORE',
  'K5_PERMISSIONS',
  'OWNER_BROWSER_E2E',
]) {
  assert.ok(board.blockingGateIds.includes(id), id + ' must remain blocking');
  assert.equal(board.gates.find((g) => g.id === id).status, 'OPEN', id);
}

assert.equal(board.gates.find((g) => g.id === 'ADR031_POSTING').status, 'BLOCKED');
assert.equal(board.gates.find((g) => g.id === 'CUT_LIVE_IMPORT').status, 'BLOCKED');
assert.ok(board.blockingGateIds.includes('ADR031_POSTING'));
assert.ok(board.blockingGateIds.includes('CUT_LIVE_IMPORT'));

assert.throws(
  () => buildPilotReadinessBoard({productionVerificationClaimed: true}),
  TypeError
);
assert.throws(() => buildPilotReadinessBoard({adr031Posting: 'ENABLED'}), TypeError);
assert.throws(
  () => buildPilotReadinessBoard({connectionString: 'Server=vps.example.com,1433'}),
  TypeError
);

const matrix = buildWorkflowMatrix();
assert.equal(matrix.productionVerificationClaimed, false);
assert.equal(matrix.adr031Posting, 'BLOCKED');
assert.deepEqual(
  matrix.steps.map((s) => s.id),
  [
    'CUSTOMER',
    'BOOKING',
    'BARBER',
    'POS_DRAFT',
    'INVENTORY_VALIDATION',
    'DRAFT_PRINT',
    'RELOAD',
  ]
);
assert.equal(matrix.steps.find((s) => s.id === 'DRAFT_PRINT').status, 'READY_IN_REPO');
assert.equal(
  matrix.steps.find((s) => s.id === 'INVENTORY_VALIDATION').status,
  'READY_IN_REPO'
);
assert.ok(!matrix.summary.byStatus.BLOCKED.includes('DRAFT_PRINT'));
assert.ok(matrix.summary.byStatus.READY_IN_REPO.includes('DRAFT_PRINT'));

writeWorkflowMatrixJson();
const committed = loadCommittedWorkflowMatrix();
assert.equal(committed.schema, matrix.schema);
assert.equal(committed.steps.find((s) => s.id === 'DRAFT_PRINT').status, 'READY_IN_REPO');

const checklist = buildPilotWorkflowChecklist();
assert.equal(checklist.productionVerificationClaimed, false);
assert.equal(checklist.summary.draftPrintStatus, 'READY_IN_REPO');
assert.ok(!checklist.summary.blockedStepIds.includes('DRAFT_PRINT'));
assert.ok(checklist.summary.openOrUncoveredStepIds.includes('INVENTORY_VALIDATION'));
assert.ok(checklist.summary.openOrUncoveredStepIds.includes('DRAFT_PRINT'));
for (const id of ['CUSTOMER', 'BOOKING', 'BARBER', 'POS_DRAFT', 'RELOAD']) {
  assert.ok(
    checklist.summary.s12s13CoveredStepIds.includes(id),
    id + ' should have S12/S13 phase markers'
  );
}

const e2e = buildE2eEvidenceMatrix();
assert.equal(e2e.steps.find((s) => s.id === 'DRAFT_PRINT').gate, 'PASS');
assert.equal(e2e.steps.find((s) => s.id === 'DRAFT_PRINT').matrixStatus, 'READY_IN_REPO');
assert.ok(e2e.summary.passStepIds.includes('CUSTOMER'));
assert.ok(e2e.summary.passStepIds.includes('DRAFT_PRINT'));
assert.ok(!e2e.summary.blockedStepIds.includes('DRAFT_PRINT'));

const backupPlan = offlineBackupRestorePlan(34);
assert.equal(backupPlan.expectedMigrationCount, 34);
assert.equal(backupPlan.primaryVpsSqlApply, 'FORBIDDEN');

const ownerPlan = buildPilotOwnerBootstrapPlan();
assert.equal(ownerPlan.status, 'OPEN');
assert.equal(ownerPlan.adr031Posting, 'BLOCKED');

const artifacts = writeArtifacts();
assert.equal(artifacts.board.productionVerificationClaimed, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'PILOT_READINESS_OFFLINE_VERIFY',
      productionVerificationClaimed: false,
      realDataActivation: 'BLOCKED',
      adr031Posting: 'BLOCKED',
      cutLiveImport: 'BLOCKED',
      sourceMigrationsComplete: board.sourceMigrations.complete,
      sourceMigrationCount: board.sourceMigrations.presentCount,
      blockingGateIds: board.blockingGateIds,
      workflowBlockedStepIds: matrix.summary.byStatus.BLOCKED,
      checklistOpenOrUncoveredStepIds: checklist.summary.openOrUncoveredStepIds,
      e2ePassStepIds: e2e.summary.passStepIds,
      e2eBlockedStepIds: e2e.summary.blockedStepIds,
      artifactPaths: artifacts.paths,
      workflowMatrixPath: path
        .relative(path.resolve(__dirname, '..', '..'), MATRIX_PATH)
        .replace(/\\/g, '/'),
    },
    null,
    2
  )
);

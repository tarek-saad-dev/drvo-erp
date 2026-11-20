'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildPilotReadinessBoard,
  probeSourceMigrations001to034,
} = require('../tools/pilot/readiness-board.cjs');
const {
  buildWorkflowMatrix,
  writeWorkflowMatrixJson,
  loadCommittedWorkflowMatrix,
} = require('../tools/pilot/workflow-matrix-builder.cjs');
const {buildPilotWorkflowChecklist} = require('../tools/pilot/workflow-checklist.cjs');
const {buildE2eEvidenceMatrix} = require('../tools/pilot/e2e-matrix.cjs');
const {
  assertAllowedPilotDatabase,
  offlineBackupRestorePlan,
  buildBackupSql,
} = require('../tools/pilot/backup-restore-evidence.cjs');
const {buildPilotOwnerBootstrapPlan} = require('../tools/pilot/k5-owner-bootstrap-evidence.cjs');
const {writeArtifacts} = require('../tools/pilot/render-board.cjs');
const {assertNoLiveConnectionMarkers} = require('../tools/cut-adapter/connection-gates.cjs');

test('SQL001–034 source probe is complete with checksums', () => {
  const probe = probeSourceMigrations001to034();
  assert.equal(probe.complete, true);
  assert.equal(probe.presentCount, 34);
  assert.equal(probe.missingIds.length, 0);
  assert.ok(probe.migrations.every((m) => m.present && /^[0-9a-f]{64}$/.test(m.checksumSha256)));
});

test('readiness board keeps activation BLOCKED and refuses production claims', () => {
  const board = buildPilotReadinessBoard();
  assert.equal(board.productionVerificationClaimed, false);
  assert.equal(board.realDataActivation, 'BLOCKED');
  assert.equal(board.adr031Posting, 'BLOCKED');
  assert.equal(board.cutLiveImport, 'BLOCKED');
  assert.equal(board.primaryVpsSqlApply, 'FORBIDDEN');
  assert.equal(board.summary.pilotActivationAllowed, false);
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
    assert.equal(board.gates.find((g) => g.id === id).status, 'OPEN');
    assert.ok(board.blockingGateIds.includes(id));
  }
  assert.equal(board.gates.find((g) => g.id === 'ADR031_POSTING').status, 'BLOCKED');
  assert.throws(
    () => buildPilotReadinessBoard({productionVerificationClaimed: true}),
    TypeError
  );
  assert.throws(() => buildPilotReadinessBoard({adr031Posting: 'ENABLED'}), TypeError);
  assert.throws(
    () => buildPilotReadinessBoard({host: 'erp-stage.drvotech.com'}),
    TypeError
  );
});

test('workflow matrix covers Customer→Reload and marks Draft Print READY_IN_REPO', () => {
  const matrix = buildWorkflowMatrix();
  assert.equal(
    matrix.workflow,
    'Customer → Booking → Barber → POS Draft → Inventory Validation → Draft Print → Reload'
  );
  assert.equal(matrix.steps.find((s) => s.id === 'DRAFT_PRINT').status, 'READY_IN_REPO');
  assert.equal(matrix.steps.find((s) => s.id === 'INVENTORY_VALIDATION').status, 'READY_IN_REPO');
  assert.ok(matrix.summary.byStatus.CI_ONLY.includes('CUSTOMER'));
  assert.ok(matrix.summary.byStatus.READY_IN_REPO.includes('DRAFT_PRINT'));
  assert.ok(!matrix.summary.byStatus.BLOCKED.includes('DRAFT_PRINT'));
  writeWorkflowMatrixJson();
  const committed = loadCommittedWorkflowMatrix();
  assert.equal(committed.steps.find((s) => s.id === 'DRAFT_PRINT').status, 'READY_IN_REPO');
});

test('workflow checklist maps S12/S13 coverage and leaves Draft Print READY_IN_REPO', () => {
  const checklist = buildPilotWorkflowChecklist();
  for (const id of ['CUSTOMER', 'BOOKING', 'BARBER', 'POS_DRAFT', 'RELOAD']) {
    assert.ok(checklist.summary.s12s13CoveredStepIds.includes(id), id);
  }
  assert.equal(checklist.summary.draftPrintStatus, 'READY_IN_REPO');
  assert.ok(!checklist.summary.blockedStepIds.includes('DRAFT_PRINT'));
  assert.ok(checklist.summary.openOrUncoveredStepIds.includes('INVENTORY_VALIDATION'));
  assert.ok(checklist.summary.openOrUncoveredStepIds.includes('DRAFT_PRINT'));
});

test('E2E evidence matrix marks Draft Print PASS (READY_IN_REPO) with evidence commands', () => {
  const e2e = buildE2eEvidenceMatrix();
  assert.equal(e2e.steps.find((s) => s.id === 'DRAFT_PRINT').gate, 'PASS');
  assert.equal(e2e.steps.find((s) => s.id === 'DRAFT_PRINT').matrixStatus, 'READY_IN_REPO');
  assert.ok(e2e.summary.passStepIds.includes('POS_DRAFT'));
  assert.ok(e2e.summary.passStepIds.includes('DRAFT_PRINT'));
  assert.ok(!e2e.summary.blockedStepIds.includes('DRAFT_PRINT'));
  for (const step of e2e.steps) {
    assert.ok(step.evidenceCommand.length > 10);
    assert.equal(step.ownerPilotBrowser, 'OPEN');
    assert.equal(step.primaryVpsApply, 'FORBIDDEN');
  }
});

test('backup/restore plan allowlists disposable Pilot DBs only', () => {
  assert.throws(() => assertAllowedPilotDatabase('CutSalonProd'), TypeError);
  assert.throws(() => assertAllowedPilotDatabase('DRVO_ERP_STAGING'), TypeError);
  assert.equal(assertAllowedPilotDatabase('DrvoPilotDisposable'), true);
  const plan = offlineBackupRestorePlan(34);
  assert.equal(plan.expectedMigrationCount, 34);
  assert.match(plan.backupSql, /COPY_ONLY/);
  assert.throws(
    () => buildBackupSql('CashierProd', '/var/opt/mssql/data/drvo_pilot_x.bak'),
    TypeError
  );
});

test('K5 Owner bootstrap plan stays OPEN and refuses ADR-031 enablement', () => {
  const plan = buildPilotOwnerBootstrapPlan();
  assert.equal(plan.status, 'OPEN');
  assert.equal(plan.adr031Posting, 'BLOCKED');
  assert.ok(plan.requiredActions.includes('pos.draft.manage'));
  assert.throws(
    () => buildPilotOwnerBootstrapPlan({adr031Posting: 'ENABLED'}),
    TypeError
  );
});

test('render-board writes fail-closed JSON and markdown artifacts', () => {
  const result = writeArtifacts();
  assert.equal(result.board.productionVerificationClaimed, false);
  for (const rel of Object.values(result.paths)) {
    const abs = path.join(__dirname, '..', rel);
    assert.ok(fs.existsSync(abs), rel);
  }
  const md = fs.readFileSync(path.join(__dirname, '..', result.paths.boardMd), 'utf8');
  assert.match(md, /BLOCKED/);
  assert.match(md, /DRAFT_PRINT|Draft Print/);
  assert.match(md, /productionVerificationClaimed=false/);
});

test('connection gates refuse live markers inside pilot tooling inputs', () => {
  assert.throws(
    () => assertNoLiveConnectionMarkers({DATABASE_URL: 'mssql://vps:1433'}),
    TypeError
  );
});

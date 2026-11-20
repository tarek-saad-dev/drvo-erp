'use strict';

/**
 * Offline Track D Cut adapter self-check.
 * Runs fixture planner → identity map → reconciliation report → preactivation gates.
 * Exit 0 only when fixture dry-run succeeds AND real-data activation remains BLOCKED.
 * Never opens mssql sockets or accepts connection strings.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {assertNoLiveConnectionMarkers} = require('./connection-gates.cjs');
const {planCutFixtureReconciliation} = require('./reconciliation-planner.cjs');
const {buildIdentityMappingLedger} = require('./identity-mapping.cjs');
const {buildReconciliationReport} = require('./reconciliation-report.cjs');
const {buildPreactivationGateBoard} = require('./preactivation-gates.cjs');

const root = __dirname;
const customersFixture = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures', 'sample-customers-services.json'), 'utf8')
);
const salesFixture = JSON.parse(
  fs.readFileSync(path.join(root, 'fixtures', 'sample-sales-history-summary.json'), 'utf8')
);

assertNoLiveConnectionMarkers(customersFixture);
assertNoLiveConnectionMarkers(salesFixture);

const plan = planCutFixtureReconciliation(customersFixture);
assert.equal(plan.mode, 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY');
assert.equal(plan.writes, 0);
assert.equal(plan.liveAccess, 'BLOCKED');

const ledger = buildIdentityMappingLedger(plan, {
  sourceTenantKey: customersFixture.meta.sourceTenantKey,
  defaultSourceBranchKey: customersFixture.meta.sourceBranchKey,
  approvedImportLedgerEvidence: false,
});
assert.equal(ledger.mode, 'FIXTURE_IDENTITY_MAP_DRY_RUN_ONLY');
assert.equal(ledger.entryCount, plan.customerCount + plan.serviceCount);
assert.equal(ledger.productionVerificationClaimed, false);

const report = buildReconciliationReport(plan, {
  identityLedger: ledger,
  salesSummary: salesFixture,
});
assert.equal(report.mode, 'FIXTURE_RECONCILIATION_REPORT_DRY_RUN_ONLY');
assert.equal(report.productionVerificationClaimed, false);
assert.equal(report.realDataActivation, 'BLOCKED');
assert.equal(report.writes, 0);

const board = buildPreactivationGateBoard();
assert.equal(board.realDataActivation, 'BLOCKED');
assert.equal(board.productionVerificationClaimed, false);
assert.equal(board.cutSqlModifications, 'FORBIDDEN');
assert.ok(board.sourceMigrations.sql024.present, 'SQL024 source migration must exist');
assert.ok(board.sourceMigrations.sql025.present, 'SQL025 source migration must exist');
assert.ok(
  board.blockingGateIds.includes('SQL024_TARGET_APPLY'),
  'Target SQL024 apply must remain a blocking OPEN gate'
);
assert.ok(
  board.blockingGateIds.includes('SQL025_TARGET_APPLY'),
  'Target SQL025 apply must remain a blocking OPEN gate'
);
assert.ok(board.blockingGateIds.includes('ISOLATED_RESTORE'));
assert.ok(board.blockingGateIds.includes('K5_PERMISSIONS'));
assert.ok(board.blockingGateIds.includes('OWNER_BROWSER'));
assert.ok(board.blockingGateIds.includes('FOUNDER_SOURCE_SCOPE'));
assert.ok(board.blockingGateIds.includes('APPROVED_IMPORT_LEDGER'));
assert.equal(board.summary.realDataActivationAllowed, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'CUT_ADAPTER_OFFLINE_VERIFY',
      productionVerificationClaimed: false,
      realDataActivation: 'BLOCKED',
      planDigest: plan.digest,
      identityDigest: ledger.digest,
      reportDigest: report.digest,
      sourceSql024: board.sourceMigrations.sql024.checksumSha256,
      sourceSql025: board.sourceMigrations.sql025.checksumSha256,
      blockingGateIds: board.blockingGateIds,
    },
    null,
    2
  )
);

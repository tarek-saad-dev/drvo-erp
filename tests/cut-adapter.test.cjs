'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertNoLiveConnectionMarkers,
  assertFixtureOnlyMode,
} = require('../tools/cut-adapter/connection-gates.cjs');
const {planCutFixtureReconciliation} = require('../tools/cut-adapter/reconciliation-planner.cjs');
const {buildIdentityMappingLedger, composeSourceKey} = require('../tools/cut-adapter/identity-mapping.cjs');
const {buildReconciliationReport} = require('../tools/cut-adapter/reconciliation-report.cjs');
const {buildPreactivationGateBoard} = require('../tools/cut-adapter/preactivation-gates.cjs');
const {planCutEmployeeFixture} = require('../tools/cut-adapter/employee-planner.cjs');

const samplePath = path.join(
  __dirname,
  '..',
  'tools',
  'cut-adapter',
  'fixtures',
  'sample-customers-services.json'
);
const salesPath = path.join(
  __dirname,
  '..',
  'tools',
  'cut-adapter',
  'fixtures',
  'sample-sales-history-summary.json'
);
const employeesPath = path.join(
  __dirname,
  '..',
  'tools',
  'cut-adapter',
  'fixtures',
  'sample-employees-hr.json'
);

function loadSample() {
  return JSON.parse(fs.readFileSync(samplePath, 'utf8'));
}

function loadSales() {
  return JSON.parse(fs.readFileSync(salesPath, 'utf8'));
}

function loadEmployees() {
  return JSON.parse(fs.readFileSync(employeesPath, 'utf8'));
}

test('Cut adapter sample fixture plans dry-run characterization with zero writes', () => {
  const a = planCutFixtureReconciliation(loadSample());
  const b = planCutFixtureReconciliation({
    ...loadSample(),
    customers: loadSample().customers.slice().reverse(),
  });
  assert.equal(a.mode, 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY');
  assert.equal(a.writes, 0);
  assert.equal(a.networkDbCalls, 0);
  assert.equal(a.liveAccess, 'BLOCKED');
  assert.equal(a.customerCount, 2);
  assert.equal(a.serviceCount, 2);
  assert.equal(a.digest, b.digest);
  assert.equal(a.customers[0].targetMapping, 'UNASSIGNED_PENDING_APPROVED_IMPORT_LEDGER');
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.customers) && Object.isFrozen(a.services));
  assert.ok(a.findings.some((f) => f.code === 'LIVE_SOURCE_BLOCKED'));
});

test('Cut employee HR fixture plans dry-run and maps HR_EMPLOYEE identity keys', () => {
  const emp = planCutEmployeeFixture(loadEmployees());
  assert.equal(emp.mode, 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY');
  assert.equal(emp.writes, 0);
  assert.equal(emp.liveAccess, 'BLOCKED');
  assert.ok(emp.employeeCount >= 1);
  const plan = Object.assign({}, planCutFixtureReconciliation(loadSample()), {
    employees: emp.employees,
  });
  const ledger = buildIdentityMappingLedger(plan, {
    sourceTenantKey: loadSample().meta.sourceTenantKey,
    defaultSourceBranchKey: loadSample().meta.sourceBranchKey,
    approvedImportLedgerEvidence: false,
  });
  assert.ok(ledger.entries.some((e) => e.entityType === 'HR_EMPLOYEE'));
  assert.ok(ledger.entries.every((e) => e.targetDrvoUuid === null));
  assert.throws(() => planCutEmployeeFixture({
    ...loadEmployees(),
    meta: {...loadEmployees().meta, liveConnectionAuthorized: true},
  }), TypeError);
});

test('connection gates refuse live connection strings and hostnames', () => {
  const liveSamples = [
    {connectionString: 'Server=cut-salon.drvotech.com,1433;Database=Cashier;User Id=ro;Password=x'},
    {host: 'erp-stage.drvotech.com'},
    {hostname: '10.0.0.8'},
    {server: 'cashier-prod'},
    {meta: {notes: 'mssql://user:pass@vps.example.com:1433/CutLive'}},
    {DATABASE_URL: 'sqlserver://live-db:1433'},
    {SQL_HOST: 'cut-salon-sql'},
    {DRVO_SQL_HOST: '127.0.0.1'},
    {payload: 'Data Source=production.database.windows.net'},
    {payload: 'jdbc:sqlserver://cut_salon:14333'},
  ];
  for (const sample of liveSamples) {
    assert.throws(() => assertNoLiveConnectionMarkers(sample), TypeError);
    assert.throws(
      () => planCutFixtureReconciliation({...loadSample(), ...sample}),
      TypeError
    );
  }
});

test('fixture-only mode rejects live authorization flags and wrong modes', () => {
  assert.throws(
    () => assertFixtureOnlyMode({mode: 'LIVE_SQL', liveConnectionAuthorized: false}),
    TypeError
  );
  assert.throws(
    () =>
      assertFixtureOnlyMode({
        mode: 'EXPORTED_JSON_FIXTURE_ONLY',
        liveConnectionAuthorized: true,
      }),
    TypeError
  );
  const bad = loadSample();
  bad.meta.liveConnectionAuthorized = true;
  assert.throws(() => planCutFixtureReconciliation(bad), TypeError);
  const liveMode = loadSample();
  liveMode.meta.mode = 'LIVE_READONLY_SQL';
  assert.throws(() => planCutFixtureReconciliation(liveMode), TypeError);
});

test('planner rejects PII-shaped fields, duplicate ids, and malformed tokens', () => {
  for (const mutation of [
    (p) => {
      p.customers[0].displayNameToken = 'Real Person';
    },
    (p) => {
      p.customers[0].phoneToken = '+201111111111';
    },
    (p) => {
      p.customers.push({...p.customers[0]});
    },
    (p) => {
      p.services[0].serviceCode = 'haircut';
    },
    (p) => {
      p.services.push({...p.services[0]});
    },
    (p) => {
      p.schema = 'other';
    },
    (p) => {
      p.meta.datasetId = 'CashierProduction';
    },
    (p) => {
      p.customers = [];
    },
    (p) => {
      p.sourceConnectionString = 'Server=legacy';
    },
  ]) {
    const x = loadSample();
    mutation(x);
    assert.throws(() => planCutFixtureReconciliation(x), TypeError);
  }
});

test('identity mapping builds unassigned source keys and refuses UUID binds', () => {
  const plan = planCutFixtureReconciliation(loadSample());
  const ledger = buildIdentityMappingLedger(plan, {
    sourceTenantKey: 'SYN-TENANT-CUT-01',
    defaultSourceBranchKey: 'SYN-BRANCH-01',
  });
  assert.equal(ledger.mode, 'FIXTURE_IDENTITY_MAP_DRY_RUN_ONLY');
  assert.equal(ledger.entryCount, 4);
  assert.equal(ledger.writes, 0);
  assert.equal(ledger.productionVerificationClaimed, false);
  assert.ok(ledger.entries.every((e) => e.targetDrvoUuid === null));
  assert.ok(
    ledger.entries.every((e) => e.mappingStatus === 'UNASSIGNED_PENDING_APPROVED_IMPORT_LEDGER')
  );
  assert.equal(
    ledger.entries[0].sourceKey,
    composeSourceKey({
      sourceSystem: 'CUT_CASHIER',
      sourceTenantKey: 'SYN-TENANT-CUT-01',
      sourceBranchKey: 'SYN-BRANCH-01',
      entityType: 'CATALOG_SERVICE',
      originalId: 501,
    })
  );
  assert.throws(
    () =>
      buildIdentityMappingLedger(plan, {
        approvedImportLedgerEvidence: true,
      }),
    TypeError
  );
  assert.throws(
    () =>
      buildIdentityMappingLedger(plan, {
        proposedTargetAssignments: [{targetDrvoUuid: '11111111-1111-4111-8111-111111111111'}],
      }),
    TypeError
  );
});

test('reconciliation report stays redacted and blocks production claims', () => {
  const plan = planCutFixtureReconciliation(loadSample());
  const ledger = buildIdentityMappingLedger(plan);
  const report = buildReconciliationReport(plan, {
    identityLedger: ledger,
    salesSummary: loadSales(),
  });
  assert.equal(report.mode, 'FIXTURE_RECONCILIATION_REPORT_DRY_RUN_ONLY');
  assert.equal(report.productionVerificationClaimed, false);
  assert.equal(report.realDataActivation, 'BLOCKED');
  assert.equal(report.writes, 0);
  assert.equal(report.counts.customers.count, 2);
  assert.equal(report.counts.services.count, 2);
  assert.equal(report.counts.salesHistory.counts.saleHeaderCount, 12);
  assert.equal(report.counts.identity.unassignedCount, 4);
  assert.ok(report.findings.some((f) => f.code === 'PRODUCTION_VERIFICATION_NOT_CLAIMED'));
  const liveSales = loadSales();
  liveSales.meta.notes = 'Server=cut-salon.drvotech.com';
  assert.throws(
    () => buildReconciliationReport(plan, {salesSummary: liveSales}),
    TypeError
  );
});

test('preactivation gates pass SQL024/025/027/031 source only and keep operator gates OPEN', () => {
  const board = buildPreactivationGateBoard();
  assert.equal(board.schema, 'drvo.cut-adapter.preactivation-gates.v1');
  assert.equal(board.realDataActivation, 'BLOCKED');
  assert.equal(board.productionVerificationClaimed, false);
  assert.equal(board.cutSqlModifications, 'FORBIDDEN');
  assert.equal(board.summary.realDataActivationAllowed, false);
  assert.ok(board.sourceMigrations.sql024.present);
  assert.ok(board.sourceMigrations.sql025.present);
  assert.ok(board.sourceMigrations.sql027.present);
  assert.ok(board.sourceMigrations.sql031.present);
  assert.equal(
    board.gates.find((g) => g.id === 'SQL024_SOURCE_PRESENT').status,
    'PASS_SOURCE_ONLY'
  );
  assert.equal(
    board.gates.find((g) => g.id === 'SQL025_SOURCE_PRESENT').status,
    'PASS_SOURCE_ONLY'
  );
  assert.equal(
    board.gates.find((g) => g.id === 'SQL027_SOURCE_PRESENT').status,
    'PASS_SOURCE_ONLY'
  );
  assert.equal(
    board.gates.find((g) => g.id === 'SQL031_SOURCE_PRESENT').status,
    'PASS_SOURCE_ONLY'
  );
  for (const id of [
    'SQL024_TARGET_APPLY',
    'SQL025_TARGET_APPLY',
    'SQL027_TARGET_APPLY',
    'SQL031_TARGET_APPLY',
    'ISOLATED_RESTORE',
    'K5_PERMISSIONS',
    'OWNER_BROWSER',
    'FOUNDER_SOURCE_SCOPE',
    'APPROVED_IMPORT_LEDGER',
  ]) {
    assert.ok(board.blockingGateIds.includes(id), id);
    assert.equal(board.gates.find((g) => g.id === id).status, 'OPEN');
  }
  assert.throws(
    () => buildPreactivationGateBoard({productionVerificationClaimed: true}),
    TypeError
  );
  assert.throws(
    () => buildPreactivationGateBoard({realDataActivation: 'AUTHORIZED'}),
    TypeError
  );
});

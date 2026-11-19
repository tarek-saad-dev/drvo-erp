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

const samplePath = path.join(
  __dirname,
  '..',
  'tools',
  'cut-adapter',
  'fixtures',
  'sample-customers-services.json'
);

function loadSample() {
  return JSON.parse(fs.readFileSync(samplePath, 'utf8'));
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

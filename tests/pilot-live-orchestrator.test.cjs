'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildOfflinePackage} = require('../tools/pilot/live-orchestrator.cjs');

test('live orchestrator packages one-time Pilot activator without verification claims', () => {
  const plan = buildOfflinePackage();
  assert.equal(plan.productionVerificationClaimed, false);
  assert.equal(plan.pilotVerified, false);
  assert.equal(plan.targetDatabase, 'DRVO_ERP_PILOT');
  assert.equal(plan.stagingDatabaseUntouched, true);
  assert.equal(plan.adr031Posting, 'BLOCKED');
  assert.equal(plan.status, 'READY_FOR_ONE_TIME_ROOT_ACTIVATION');
  assert.equal(plan.missing.length, 0);
  assert.match(plan.oneTimeOperatorAction.commands[1], /activate-isolated-pilot-once\.sh/);
});

test('activator scripts refuse staging DB identity and secrets in git', () => {
  const sh = fs.readFileSync(
    path.join(__dirname, '../ops/staging/pilot/activate-isolated-pilot-once.sh'),
    'utf8'
  );
  const sql = fs.readFileSync(
    path.join(__dirname, '../ops/staging/pilot/activate-pilot-sql.cjs'),
    'utf8'
  );
  assert.match(sh, /DRVO_ERP_PILOT/);
  assert.match(sh, /APPROVE CREATE DRVO_ERP_PILOT SYNTHETIC/);
  assert.match(sh, /45-pilot-sql\.conf/);
  assert.doesNotMatch(sh, /sa_password\s*=|Password=.*Drvo!/i);
  assert.match(sql, /DRVO_ERP_PILOT/);
  assert.match(sql, /041_booking_no_show_terminal\.sql/);
  assert.match(sql, /assert\.notEqual\(DB, 'DRVO_ERP_STAGING'\)/);
  assert.match(sql, /productionVerificationClaimed: false/);
});

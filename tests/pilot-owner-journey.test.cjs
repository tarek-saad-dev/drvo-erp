'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildOwnerJourneyPlan} = require('../tools/pilot/owner-journey-plan.cjs');
const {
  PILOT_OWNER_MODULE_ACTIONS,
  buildOwnerPilotPermissionPlan,
} = require('../tools/pilot/owner-module-permissions.cjs');

test('Owner journey plan is fail-closed and evidence-backed in repo', () => {
  const plan = buildOwnerJourneyPlan();
  assert.equal(plan.productionVerificationClaimed, false);
  assert.equal(plan.pilotVerified, false);
  assert.equal(plan.adr031Posting, 'BLOCKED');
  assert.equal(plan.targetDatabase, 'DRVO_ERP_STAGING');
  assert.equal(plan.publicDemo.connectsToPrivateDb, false);
  assert.equal(plan.status, 'READY_IN_REPO_AWAITING_OPERATOR');
  assert.equal(plan.blockers.length, 0);
  assert.ok(plan.journey.some((s) => s.id === 'POS_DRAFT'));
  assert.ok(plan.externalGatesOpen.includes('OWNER_BROWSER_E2E_ACCEPTANCE'));
});

test('SQL040 and ClaimApprovedOwner grant Pilot module actions', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../db/migrations/040_owner_pilot_module_permissions.sql'),
    'utf8'
  );
  assert.match(sql, /EnsureOwnerPilotModulePermissions/);
  assert.match(sql, /ClaimApprovedOwner/);
  for (const action of PILOT_OWNER_MODULE_ACTIONS) {
    assert.ok(sql.includes(action), action);
  }
  assert.doesNotMatch(sql, /pos\.sale|treasury\.settle|accounting\.post/i);
  const plan = buildOwnerPilotPermissionPlan();
  assert.equal(plan.adr031Posting, 'BLOCKED');
});

test('systemd Pilot flag templates cover Cashier vertical slice', () => {
  const api = fs.readFileSync(
    path.join(__dirname, '../ops/staging/pilot/40-k5-pilot-api.conf.example'),
    'utf8'
  );
  const web = fs.readFileSync(
    path.join(__dirname, '../ops/staging/pilot/40-k5-pilot-web.conf.example'),
    'utf8'
  );
  for (const flag of [
    'DRVO_K5_AUTH_ENABLED',
    'DRVO_POS_DRAFTS_ENABLED',
    'DRVO_POS_RICH_ENABLED',
    'DRVO_CUSTOMERS_ENABLED',
    'DRVO_BOOKING_ENABLED',
  ]) {
    assert.ok(api.includes(flag), flag);
  }
  for (const flag of [
    'DRVO_K5_WEB_ENABLED',
    'DRVO_POS_PREVIEW_WEB_ENABLED',
    'DRVO_POS_DRAFTS_WEB_ENABLED',
    'DRVO_POS_RICH_WEB_ENABLED',
  ]) {
    assert.ok(web.includes(flag), flag);
  }
});

test('Owner journey plan refuses verification claims', () => {
  assert.throws(() => buildOwnerJourneyPlan({productionVerificationClaimed: true}));
  assert.throws(() => buildOwnerJourneyPlan({adr031Posting: 'ENABLED'}));
  assert.throws(() => buildOwnerJourneyPlan({pilotVerified: true}));
});

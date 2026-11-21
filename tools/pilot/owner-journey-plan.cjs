'use strict';

/**
 * Machine-checkable Private Pilot Owner journey plan.
 * Offline by default. Never claims PILOT_VERIFIED or Owner browser PASS.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PILOT_OWNER_MODULE_ACTIONS,
  PILOT_API_FLAGS,
  PILOT_WEB_FLAGS,
  buildOwnerPilotPermissionPlan,
} = require('./owner-module-permissions.cjs');

const ROOT = path.resolve(__dirname, '../..');

const JOURNEY_STEPS = Object.freeze([
  {id: 'SIGN_IN', title: 'Owner signs in', path: '/sign-in', persistence: 'session'},
  {id: 'CUSTOMER', title: 'Create customer via UI', path: '/customers', persistence: 'SQL'},
  {id: 'CATALOG_BARBER', title: 'Service + Barber ready', path: '/catalog|/hr', persistence: 'SQL'},
  {id: 'BOOKING', title: 'Create booking linked to customer', path: '/booking', persistence: 'SQL'},
  {id: 'POS_HANDOFF', title: 'Open booking in POS workstation', path: '/pos-preview?customerId&offeringId', persistence: 'query'},
  {id: 'POS_DRAFT', title: 'Save POS Draft via API', path: '/pos-preview', persistence: 'SQL'},
  {id: 'INVENTORY', title: 'Inventory stock gate on products', path: '/pos-preview', persistence: 'SQL027 overlay'},
  {id: 'DRAFT_PRINT', title: 'NOT PAID / NOT POSTED draft print', path: '/pos-preview/draft-print', persistence: 'read'},
  {id: 'RELOAD', title: 'Refresh + re-login recovers data', path: '/workspaces', persistence: 'SQL'},
]);

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function buildOwnerJourneyPlan(operatorEvidence = {}) {
  assert.notEqual(operatorEvidence.productionVerificationClaimed, true);
  assert.notEqual(operatorEvidence.adr031Posting, 'ENABLED');
  assert.notEqual(operatorEvidence.pilotVerified, true);

  const evidence = Object.freeze({
    migration040: fileExists('db/migrations/040_owner_pilot_module_permissions.sql'),
    workstationShell: fileExists(
      'apps/web/src/components/cashier-pos/cashier-workstation-shell.tsx'
    ),
    posPreview: fileExists(
      'apps/web/src/app/workspace/[businessId]/[branchId]/pos-preview/pos-preview-client.tsx'
    ),
    pilotEntry: fileExists('apps/web/src/app/pilot/page.tsx'),
    flagTemplates: fileExists('ops/staging/pilot/40-k5-pilot-api.conf.example') &&
      fileExists('ops/staging/pilot/40-k5-pilot-web.conf.example'),
    salonBrowserOps: fileExists('tools/salon-browser/operations.cjs'),
  });

  const blockers = [];
  if (!evidence.migration040) blockers.push('SQL040_MISSING');
  if (!evidence.workstationShell) blockers.push('WORKSTATION_SHELL_MISSING');
  if (!evidence.flagTemplates) blockers.push('FLAG_TEMPLATES_MISSING');

  return Object.freeze({
    schema: 'drvo.pilot.owner-journey-plan.v1',
    mode: 'PILOT_OWNER_JOURNEY_PLAN_DRY_RUN_ONLY',
    productionVerificationClaimed: false,
    pilotVerified: false,
    realDataActivation: 'BLOCKED_UNTIL_OPERATOR_GATES',
    adr031Posting: 'BLOCKED',
    cutLiveImport: 'BLOCKED',
    targetDatabase: 'DRVO_ERP_STAGING',
    publicDemo: Object.freeze({
      url: 'https://erp-stage.drvotech.com/demo/salon',
      mode: 'SYNTHETIC_ONLY',
      connectsToPrivateDb: false,
    }),
    privateEntry: Object.freeze({
      url: 'https://erp-stage.drvotech.com/pilot',
      signIn: 'https://erp-stage.drvotech.com/sign-in',
      requiresFlags: PILOT_WEB_FLAGS,
    }),
    journey: JOURNEY_STEPS,
    permissions: buildOwnerPilotPermissionPlan(),
    apiFlagsRequiredYes: PILOT_API_FLAGS,
    webFlagsRequiredYes: PILOT_WEB_FLAGS,
    ownerActions: PILOT_OWNER_MODULE_ACTIONS,
    evidence,
    externalGatesOpen: Object.freeze([
      'TARGET_APPLY_SQL001_040',
      'ISOLATED_BACKUP_RESTORE_WITNESS',
      'K5D_OPERATOR_ENV_HMAC_MAIL',
      'SYSTEMD_PILOT_FLAG_DROPINS',
      'OWNER_APPROVE_CLAIM',
      'ENSURE_OWNER_PILOT_PERMISSIONS_IF_PRE_040',
      'OWNER_BROWSER_E2E_ACCEPTANCE',
      'NGINX_ACCESS_RESTRICTION_REVIEW',
    ]),
    blockers,
    status: blockers.length ? 'BLOCKED_IN_REPO' : 'READY_IN_REPO_AWAITING_OPERATOR',
  });
}

function main() {
  const plan = buildOwnerJourneyPlan();
  process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
  if (plan.blockers.length) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {JOURNEY_STEPS, buildOwnerJourneyPlan};

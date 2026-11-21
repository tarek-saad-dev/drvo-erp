'use strict';

/**
 * K5 Owner bootstrap evidence for disposable Pilot tenant only.
 * Offline mode documents the required gates and refuses live connection strings.
 * Disposable SQL mode (via isolated-db-harness) seeds a synthetic Owner-scoped
 * Tenant/Business/Branch with Pilot permissions — never primary/VPS / Cut.
 */
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {assertNoLiveConnectionMarkers} = require('../cut-adapter/connection-gates.cjs');
const {PILOT_OWNER_MODULE_ACTIONS} = require('./owner-module-permissions.cjs');

const PILOT_OWNER_ACTIONS = PILOT_OWNER_MODULE_ACTIONS;

function buildPilotOwnerBootstrapPlan(operatorEvidence = {}) {
  assertNoLiveConnectionMarkers(operatorEvidence);
  if (operatorEvidence && operatorEvidence.productionVerificationClaimed === true) {
    throw new TypeError(
      'productionVerificationClaimed=true refused: K5 Owner bootstrap plan never attests production verification'
    );
  }
  if (operatorEvidence && operatorEvidence.adr031Posting === 'ENABLED') {
    throw new TypeError('adr031Posting ENABLED refused during Pilot Owner bootstrap planning');
  }

  return Object.freeze({
    schema: 'drvo.pilot.k5-owner-bootstrap-plan.v1',
    mode: 'PILOT_K5_OWNER_BOOTSTRAP_PLAN_DRY_RUN_ONLY',
    productionVerificationClaimed: false,
    realDataActivation: 'BLOCKED',
    adr031Posting: 'BLOCKED',
    cutLiveImport: 'BLOCKED',
    primaryVpsSqlApply: 'FORBIDDEN',
    architectureNote:
      'Modular Monolith Tenant isolation: Owner bootstrap must bind Account → BusinessMembership → BranchAssignment → BranchRole under a single Tenant.',
    requiredActions: PILOT_OWNER_ACTIONS,
    featureFlagsRequiredOff: Object.freeze([
      'ADR031_POSTING',
      'PAID_POS_SALE',
      'CUT_LIVE_IMPORT',
    ]),
    evidenceCommands: Object.freeze([
      'node tools/pilot/k5-owner-bootstrap-evidence.cjs',
      'DRVO_PILOT_CI_DISPOSABLE=YES GITHUB_ACTIONS=true node tools/pilot/isolated-db-harness.cjs',
      'node tools/k5d/verify-owner-bootstrap.cjs  # separate K5D disposable Owner claim proof',
    ]),
    status: 'OPEN',
    note:
      'Plan/documentation only until disposable harness or authorized Pilot DB Operator evidence closes K5_PERMISSIONS. Do not paste secrets. Do not enable ADR-031.',
  });
}

/**
 * Seed synthetic Owner-scoped tenant graph inside an already-migrated disposable pool.
 * Expects dbo/sa-class access on DrvoPilotDisposable only.
 */
async function seedDisposablePilotOwner(pool, sql, ids = {}) {
  assert.ok(pool && typeof pool.request === 'function', 'sql pool required');
  assert.ok(sql, 'mssql module required');

  const tenantId = ids.tenantId || randomUUID();
  const businessId = ids.businessId || randomUUID();
  const branchId = ids.branchId || randomUUID();
  const accountId = ids.accountId || randomUUID();
  const roleId = ids.roleId || randomUUID();
  const username = ids.username || 'pilot.owner.ci';

  await pool
    .request()
    .input('t', sql.UniqueIdentifier, tenantId)
    .input('b', sql.UniqueIdentifier, businessId)
    .input('br', sql.UniqueIdentifier, branchId)
    .input('a', sql.UniqueIdentifier, accountId)
    .input('r', sql.UniqueIdentifier, roleId)
    .input('name', sql.NVarChar(80), username)
    .query(`
      INSERT INTO core.Tenant(TenantId, DisplayName) VALUES(@t, N'Pilot Disposable Tenant');
      INSERT INTO core.Business(TenantId, BusinessId, DisplayName)
        VALUES(@t, @b, N'Pilot Disposable Business');
      INSERT INTO core.Branch(TenantId, BusinessId, BranchId, DisplayName)
        VALUES(@t, @b, @br, N'Pilot Disposable Branch');
      INSERT INTO core.Account(TenantId, AccountId, Username) VALUES(@t, @a, @name);
      INSERT INTO core.BusinessRole(TenantId, BusinessId, RoleId, RoleCode, DisplayName)
        VALUES(@t, @b, @r, N'PILOT_OWNER', N'Pilot Owner');
      INSERT INTO core.BusinessMembership(TenantId, BusinessId, AccountId) VALUES(@t, @b, @a);
      INSERT INTO core.BranchAssignment(TenantId, BusinessId, BranchId, AccountId)
        VALUES(@t, @b, @br, @a);
      INSERT INTO core.BranchRole(TenantId, BusinessId, BranchId, AccountId, RoleId)
        VALUES(@t, @b, @br, @a, @r);
    `);

  for (const action of PILOT_OWNER_ACTIONS) {
    await pool
      .request()
      .input('t', sql.UniqueIdentifier, tenantId)
      .input('b', sql.UniqueIdentifier, businessId)
      .input('r', sql.UniqueIdentifier, roleId)
      .input('action', sql.VarChar(64), action)
      .query(
        `INSERT INTO core.RolePermission(TenantId, BusinessId, RoleId, ActionCode)
         VALUES(@t, @b, @r, @action)`
      );
  }

  const permCount = await pool
    .request()
    .input('t', sql.UniqueIdentifier, tenantId)
    .input('b', sql.UniqueIdentifier, businessId)
    .input('r', sql.UniqueIdentifier, roleId)
    .query(
      `SELECT COUNT(*) AS n FROM core.RolePermission
       WHERE TenantId=@t AND BusinessId=@b AND RoleId=@r`
    );

  assert.equal(Number(permCount.recordset[0].n), PILOT_OWNER_ACTIONS.length);

  return Object.freeze({
    mode: 'PILOT_K5_OWNER_SEED_DISPOSABLE_ONLY',
    productionVerificationClaimed: false,
    adr031Posting: 'BLOCKED',
    tenantId,
    businessId,
    branchId,
    accountId,
    roleId,
    username,
    permissionCount: PILOT_OWNER_ACTIONS.length,
    requiredActions: PILOT_OWNER_ACTIONS,
  });
}

if (require.main === module) {
  const plan = buildPilotOwnerBootstrapPlan();
  console.log(JSON.stringify(plan, null, 2));
}

module.exports = {
  PILOT_OWNER_ACTIONS,
  buildPilotOwnerBootstrapPlan,
  seedDisposablePilotOwner,
};

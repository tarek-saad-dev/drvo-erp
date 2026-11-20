'use strict';

/**
 * Pure Cut HR employee fixture planner (characterization only).
 * Never opens SQL, never maps live phones/salaries, never authorizes import writes.
 */
const {createHash} = require('node:crypto');
const {
  assertFixtureOnlyMode,
  assertNoLiveConnectionMarkers,
} = require('./connection-gates.cjs');

const SCHEMA = 'drvo.cut-adapter.fixture.employees-hr.v1';
const DATASET = /^FIX-[A-Z0-9-]{3,40}$/;
const BRANCH = /^SYN-BRANCH-[A-Z0-9-]{1,30}$/;
const EMP_NAME = /^EMP-[A-Z0-9-]{2,40}$/;
const ROLE = /^ROLE-[A-Z0-9-]{2,40}$/;

function exactObject(input, keys, required = keys) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !keys.includes(k)) ||
    required.some((k) => !Object.prototype.hasOwnProperty.call(input, k))
  ) {
    throw new TypeError('Unexpected employee fixture fields');
  }
  return input;
}

function positiveInt(v, label) {
  if (!Number.isSafeInteger(v) || v < 1) {
    throw new TypeError('Invalid ' + label);
  }
  return v;
}

function planCutEmployeeFixture(fixture) {
  assertNoLiveConnectionMarkers(fixture);
  const root = exactObject(fixture, ['schema', 'meta', 'employees']);
  if (root.schema !== SCHEMA) {
    throw new TypeError('Unsupported Cut employee fixture schema');
  }
  const meta = exactObject(
    root.meta,
    [
      'mode',
      'sourceSystem',
      'datasetId',
      'exportedAt',
      'liveConnectionAuthorized',
      'sourceTenantKey',
      'sourceBranchKey',
      'notes',
    ],
    ['mode', 'sourceSystem', 'datasetId', 'exportedAt', 'liveConnectionAuthorized']
  );
  assertFixtureOnlyMode(meta);
  if (meta.sourceSystem !== 'CUT_CASHIER') {
    throw new TypeError('sourceSystem must be CUT_CASHIER');
  }
  if (typeof meta.datasetId !== 'string' || !DATASET.test(meta.datasetId)) {
    throw new TypeError('Synthetic FIX- datasetId required');
  }
  if (!Array.isArray(root.employees) || root.employees.length < 1 || root.employees.length > 200) {
    throw new TypeError('employees array size out of range');
  }

  const ids = new Set();
  const employees = [];
  for (const raw of root.employees) {
    const row = exactObject(
      raw,
      ['sourceEmployeeId', 'displayNameToken', 'roleToken', 'sourceBranchKey', 'isActive'],
      ['sourceEmployeeId', 'displayNameToken', 'roleToken', 'isActive']
    );
    const sourceEmployeeId = positiveInt(row.sourceEmployeeId, 'sourceEmployeeId');
    if (ids.has(sourceEmployeeId)) {
      throw new TypeError('Duplicate sourceEmployeeId');
    }
    ids.add(sourceEmployeeId);
    if (typeof row.displayNameToken !== 'string' || !EMP_NAME.test(row.displayNameToken)) {
      throw new TypeError('Invalid displayNameToken');
    }
    if (typeof row.roleToken !== 'string' || !ROLE.test(row.roleToken)) {
      throw new TypeError('Invalid roleToken');
    }
    if (typeof row.isActive !== 'boolean') {
      throw new TypeError('isActive must be boolean');
    }
    let sourceBranchKey = null;
    if (Object.prototype.hasOwnProperty.call(row, 'sourceBranchKey') && row.sourceBranchKey != null) {
      if (typeof row.sourceBranchKey !== 'string' || !BRANCH.test(row.sourceBranchKey)) {
        throw new TypeError('Invalid sourceBranchKey');
      }
      sourceBranchKey = row.sourceBranchKey;
    }
    employees.push(
      Object.freeze({
        originalId: sourceEmployeeId,
        displayNameToken: row.displayNameToken,
        roleToken: row.roleToken,
        isActive: row.isActive,
        sourceBranchKey,
      })
    );
  }

  const body = {
    datasetId: meta.datasetId,
    employeeCount: employees.length,
    activeCount: employees.filter((e) => e.isActive).length,
    employees,
  };
  const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');

  return Object.freeze({
    schema: 'drvo.cut-adapter.plan.employees-hr.v1',
    mode: 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY',
    liveAccess: 'BLOCKED',
    writes: 0,
    networkDbCalls: 0,
    datasetId: meta.datasetId,
    sourceTenantKey: meta.sourceTenantKey || null,
    employeeCount: employees.length,
    activeCount: body.activeCount,
    digest,
    employees: Object.freeze(employees),
  });
}

module.exports = {
  planCutEmployeeFixture,
};

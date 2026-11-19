'use strict';

/**
 * Pure Cut Salon characterization / reconciliation planner.
 * Accepts exported JSON fixtures only. Never opens sockets, never loads mssql,
 * never reads credentials, never targets VPS/live Cut or Cashier databases.
 */
const {createHash} = require('node:crypto');
const {
  assertFixtureOnlyMode,
  assertNoLiveConnectionMarkers,
} = require('./connection-gates.cjs');

const SCHEMA = 'drvo.cut-adapter.fixture.customers-services.v1';
const DATASET = /^FIX-[A-Z0-9-]{3,40}$/;
const BRANCH = /^SYN-BRANCH-[A-Z0-9-]{1,30}$/;
const CUST_NAME = /^CUST-[A-Z0-9-]{2,40}$/;
const PHONE = /^PHONE-[A-Z0-9-]{2,40}$/;
const SVC_CODE = /^SVC-[A-Z0-9-]{2,40}$/;
const SVC_NAME = /^NAME-[A-Z0-9-]{2,40}$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function exactObject(input, keys, required = keys) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !keys.includes(k)) ||
    required.some((k) => !Object.prototype.hasOwnProperty.call(input, k))
  ) {
    throw new TypeError('Unexpected fixture fields');
  }
  return input;
}

function positiveInt(v, label) {
  if (!Number.isSafeInteger(v) || v < 1) {
    throw new TypeError('Invalid ' + label);
  }
  return v;
}

function planCutFixtureReconciliation(fixture) {
  assertNoLiveConnectionMarkers(fixture);
  const root = exactObject(fixture, ['schema', 'meta', 'customers', 'services']);
  if (root.schema !== SCHEMA) {
    throw new TypeError('Unsupported Cut fixture schema');
  }

  const metaKeys = [
    'mode',
    'sourceSystem',
    'datasetId',
    'exportedAt',
    'liveConnectionAuthorized',
    'sourceTenantKey',
    'sourceBranchKey',
    'notes',
  ];
  const meta = exactObject(
    root.meta,
    metaKeys,
    ['mode', 'sourceSystem', 'datasetId', 'exportedAt', 'liveConnectionAuthorized']
  );
  assertFixtureOnlyMode(meta);
  if (meta.sourceSystem !== 'CUT_CASHIER') {
    throw new TypeError('sourceSystem must be CUT_CASHIER');
  }
  if (typeof meta.datasetId !== 'string' || !DATASET.test(meta.datasetId)) {
    throw new TypeError('Synthetic FIX- datasetId required');
  }
  if (typeof meta.exportedAt !== 'string' || Number.isNaN(Date.parse(meta.exportedAt))) {
    throw new TypeError('exportedAt must be an ISO timestamp');
  }
  if (
    Object.prototype.hasOwnProperty.call(meta, 'sourceBranchKey') &&
    (typeof meta.sourceBranchKey !== 'string' || !BRANCH.test(meta.sourceBranchKey))
  ) {
    throw new TypeError('Invalid sourceBranchKey');
  }

  if (!Array.isArray(root.customers) || root.customers.length < 1 || root.customers.length > 200) {
    throw new TypeError('customers array size out of range');
  }
  if (!Array.isArray(root.services) || root.services.length < 1 || root.services.length > 200) {
    throw new TypeError('services array size out of range');
  }

  const customerIds = new Set();
  const customerMap = [];
  for (const raw of root.customers) {
    const row = exactObject(raw, [
      'sourceCustomerId',
      'displayNameToken',
      'phoneToken',
      'sourceBranchKey',
      'lastVisitDate',
    ], ['sourceCustomerId', 'displayNameToken', 'phoneToken']);
    const sourceCustomerId = positiveInt(row.sourceCustomerId, 'sourceCustomerId');
    if (customerIds.has(sourceCustomerId)) {
      throw new TypeError('Duplicate sourceCustomerId');
    }
    customerIds.add(sourceCustomerId);
    if (typeof row.displayNameToken !== 'string' || !CUST_NAME.test(row.displayNameToken)) {
      throw new TypeError('displayNameToken must be pseudonym CUST-* token');
    }
    if (typeof row.phoneToken !== 'string' || !PHONE.test(row.phoneToken)) {
      throw new TypeError('phoneToken must be pseudonym PHONE-* token');
    }
    if (
      Object.prototype.hasOwnProperty.call(row, 'sourceBranchKey') &&
      (typeof row.sourceBranchKey !== 'string' || !BRANCH.test(row.sourceBranchKey))
    ) {
      throw new TypeError('Invalid customer sourceBranchKey');
    }
    if (
      Object.prototype.hasOwnProperty.call(row, 'lastVisitDate') &&
      row.lastVisitDate !== null &&
      (typeof row.lastVisitDate !== 'string' || !ISO_DAY.test(row.lastVisitDate))
    ) {
      throw new TypeError('Invalid lastVisitDate');
    }
    customerMap.push(
      Object.freeze({
        entityType: 'CUSTOMER',
        sourceSystem: 'CUT_CASHIER',
        datasetId: meta.datasetId,
        originalId: sourceCustomerId,
        displayNameToken: row.displayNameToken,
        phoneToken: row.phoneToken,
        sourceBranchKey: row.sourceBranchKey || meta.sourceBranchKey || null,
        lastVisitDate: Object.prototype.hasOwnProperty.call(row, 'lastVisitDate')
          ? row.lastVisitDate
          : null,
        targetMapping: 'UNASSIGNED_PENDING_APPROVED_IMPORT_LEDGER',
      })
    );
  }

  const serviceIds = new Set();
  const serviceMap = [];
  for (const raw of root.services) {
    const row = exactObject(raw, [
      'sourceServiceId',
      'serviceCode',
      'nameToken',
      'priceMinor',
      'active',
    ], ['sourceServiceId', 'serviceCode', 'nameToken', 'priceMinor']);
    const sourceServiceId = positiveInt(row.sourceServiceId, 'sourceServiceId');
    if (serviceIds.has(sourceServiceId)) {
      throw new TypeError('Duplicate sourceServiceId');
    }
    serviceIds.add(sourceServiceId);
    if (typeof row.serviceCode !== 'string' || !SVC_CODE.test(row.serviceCode)) {
      throw new TypeError('Invalid serviceCode');
    }
    if (typeof row.nameToken !== 'string' || !SVC_NAME.test(row.nameToken)) {
      throw new TypeError('nameToken must be pseudonym NAME-* token');
    }
    if (!Number.isSafeInteger(row.priceMinor) || row.priceMinor < 0 || row.priceMinor > 100000000) {
      throw new TypeError('Invalid priceMinor');
    }
    const active = Object.prototype.hasOwnProperty.call(row, 'active') ? row.active : true;
    if (typeof active !== 'boolean') {
      throw new TypeError('active must be boolean when present');
    }
    serviceMap.push(
      Object.freeze({
        entityType: 'CATALOG_SERVICE',
        sourceSystem: 'CUT_CASHIER',
        datasetId: meta.datasetId,
        originalId: sourceServiceId,
        serviceCode: row.serviceCode,
        nameToken: row.nameToken,
        priceMinor: row.priceMinor,
        active,
        targetMapping: 'UNASSIGNED_PENDING_APPROVED_IMPORT_LEDGER',
      })
    );
  }

  customerMap.sort((a, b) => a.originalId - b.originalId);
  serviceMap.sort((a, b) => a.originalId - b.originalId);

  const findings = Object.freeze([
    Object.freeze({
      code: 'FIXTURE_ACCEPTED',
      severity: 'INFO',
      detail: 'Offline JSON fixture characterized; no live DB read performed',
    }),
    Object.freeze({
      code: 'LIVE_SOURCE_BLOCKED',
      severity: 'GATE',
      detail:
        'Live Cut/Cashier/VPS SQL access remains BLOCKED until founder-approved connection + scope',
    }),
    Object.freeze({
      code: 'TARGET_UUID_UNASSIGNED',
      severity: 'OPEN',
      detail: 'Id maps require a separate approved import ledger before any DRVO write',
    }),
  ]);

  const planBody = {
    datasetId: meta.datasetId,
    customers: customerMap,
    services: serviceMap,
    findings,
  };
  const digest = createHash('sha256').update(JSON.stringify(planBody)).digest('hex');

  return Object.freeze({
    mode: 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY',
    schema: SCHEMA,
    writes: 0,
    networkDbCalls: 0,
    liveAccess: 'BLOCKED',
    datasetId: meta.datasetId,
    customerCount: customerMap.length,
    serviceCount: serviceMap.length,
    digest,
    findings,
    customers: Object.freeze(customerMap),
    services: Object.freeze(serviceMap),
  });
}

module.exports = {planCutFixtureReconciliation, SCHEMA};

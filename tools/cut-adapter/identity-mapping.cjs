'use strict';

/**
 * Pure Cut → DRVO identity-map scaffold.
 * Builds SourceSystem + SourceTenant + SourceBranch + EntityType + OriginalId keys
 * from fixture characterization plans only. Never assigns live DRVO UUIDs, never
 * opens SQL, never reads credentials, never mutates Cut or DRVO databases.
 */
const {createHash} = require('node:crypto');
const {assertNoLiveConnectionMarkers} = require('./connection-gates.cjs');

const SOURCE_SYSTEM = 'CUT_CASHIER';
const KEY_SEP = '|';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertPlanShape(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new TypeError('Characterization plan object required');
  }
  if (plan.mode !== 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY') {
    throw new TypeError('Identity mapping accepts fixture dry-run plans only');
  }
  if (plan.liveAccess !== 'BLOCKED' || plan.writes !== 0 || plan.networkDbCalls !== 0) {
    throw new TypeError('Plan must remain fixture-only with zero writes/network DB calls');
  }
  if (!Array.isArray(plan.customers) || !Array.isArray(plan.services)) {
    throw new TypeError('Plan customers/services arrays required');
  }
  // Scan entity tokens only — do not walk generated findings text (may say "VPS"/"BLOCKED").
  assertNoLiveConnectionMarkers({
    datasetId: plan.datasetId,
    customers: plan.customers,
    services: plan.services,
  });
  return plan;
}

function composeSourceKey(parts) {
  const {
    sourceSystem,
    sourceTenantKey,
    sourceBranchKey,
    entityType,
    originalId,
  } = parts;
  if (sourceSystem !== SOURCE_SYSTEM) {
    throw new TypeError('sourceSystem must be CUT_CASHIER');
  }
  if (typeof sourceTenantKey !== 'string' || !sourceTenantKey.startsWith('SYN-TENANT-')) {
    throw new TypeError('Synthetic SYN-TENANT-* sourceTenantKey required');
  }
  if (
    sourceBranchKey !== null &&
    (typeof sourceBranchKey !== 'string' || !sourceBranchKey.startsWith('SYN-BRANCH-'))
  ) {
    throw new TypeError('sourceBranchKey must be null or SYN-BRANCH-*');
  }
  if (typeof entityType !== 'string' || !/^[A-Z_]{3,40}$/.test(entityType)) {
    throw new TypeError('Invalid entityType');
  }
  if (!Number.isSafeInteger(originalId) || originalId < 1) {
    throw new TypeError('Invalid originalId');
  }
  return [
    sourceSystem,
    sourceTenantKey,
    sourceBranchKey === null ? 'BRANCH-UNSCOPED' : sourceBranchKey,
    entityType,
    String(originalId),
  ].join(KEY_SEP);
}

function mapRow(entityType, row, datasetId, sourceTenantKey) {
  const sourceKey = composeSourceKey({
    sourceSystem: SOURCE_SYSTEM,
    sourceTenantKey,
    sourceBranchKey: row.sourceBranchKey || null,
    entityType,
    originalId: row.originalId,
  });
  return Object.freeze({
    sourceKey,
    entityType,
    datasetId,
    originalId: row.originalId,
    sourceSystem: SOURCE_SYSTEM,
    sourceTenantKey,
    sourceBranchKey: row.sourceBranchKey || null,
    targetDrvoUuid: null,
    mappingStatus: 'UNASSIGNED_PENDING_APPROVED_IMPORT_LEDGER',
    writeAuthorized: false,
  });
}

/**
 * Build an unassigned identity ledger from a fixture characterization plan.
 * Optional `options.approvedImportLedgerEvidence` may only stay false here;
 * true is refused so this package cannot silently claim production mapping.
 */
function buildIdentityMappingLedger(plan, options = {}) {
  assertPlanShape(plan);
  assertNoLiveConnectionMarkers(options);
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options object required');
  }
  const allowed = [
    'sourceTenantKey',
    'defaultSourceBranchKey',
    'approvedImportLedgerEvidence',
    'proposedTargetAssignments',
  ];
  if (Object.keys(options).some((k) => !allowed.includes(k))) {
    throw new TypeError('Unexpected identity-mapping options');
  }
  if (options.approvedImportLedgerEvidence === true) {
    throw new TypeError(
      'approvedImportLedgerEvidence=true refused in fixture scaffold; record approval outside this package'
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(options, 'proposedTargetAssignments') &&
    options.proposedTargetAssignments != null
  ) {
    throw new TypeError(
      'proposedTargetAssignments refused: fixture scaffold never binds DRVO UUIDs'
    );
  }

  const sourceTenantKey =
    typeof options.sourceTenantKey === 'string' && options.sourceTenantKey.startsWith('SYN-TENANT-')
      ? options.sourceTenantKey
      : 'SYN-TENANT-CUT-01';
  const defaultSourceBranchKey =
    typeof options.defaultSourceBranchKey === 'string' ? options.defaultSourceBranchKey : null;
  if (
    defaultSourceBranchKey !== null &&
    !defaultSourceBranchKey.startsWith('SYN-BRANCH-')
  ) {
    throw new TypeError('defaultSourceBranchKey must be SYN-BRANCH-* when provided');
  }

  function withDefaultBranch(row) {
    if (row.sourceBranchKey) return row;
    if (!defaultSourceBranchKey) return row;
    return Object.assign({}, row, {sourceBranchKey: defaultSourceBranchKey});
  }

  const entries = [];
  for (const row of plan.customers) {
    entries.push(mapRow('CUSTOMER', withDefaultBranch(row), plan.datasetId, sourceTenantKey));
  }
  for (const row of plan.services) {
    entries.push(
      mapRow('CATALOG_SERVICE', withDefaultBranch(row), plan.datasetId, sourceTenantKey)
    );
  }
  entries.sort((a, b) => (a.sourceKey < b.sourceKey ? -1 : a.sourceKey > b.sourceKey ? 1 : 0));

  const keys = new Set();
  for (const entry of entries) {
    if (keys.has(entry.sourceKey)) {
      throw new TypeError('Duplicate sourceKey in identity ledger');
    }
    keys.add(entry.sourceKey);
    if (entry.targetDrvoUuid !== null && UUID_RE.test(String(entry.targetDrvoUuid))) {
      throw new TypeError('Live DRVO UUID assignment blocked in fixture identity mapping');
    }
  }

  const body = {
    datasetId: plan.datasetId,
    sourceTenantKey,
    entries,
  };
  const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');

  return Object.freeze({
    schema: 'drvo.cut-adapter.identity-mapping.v1',
    mode: 'FIXTURE_IDENTITY_MAP_DRY_RUN_ONLY',
    liveAccess: 'BLOCKED',
    writes: 0,
    networkDbCalls: 0,
    productionVerificationClaimed: false,
    datasetId: plan.datasetId,
    sourceTenantKey,
    entryCount: entries.length,
    digest,
    entries: Object.freeze(entries),
    findings: Object.freeze([
      Object.freeze({
        code: 'IDENTITY_MAP_UNASSIGNED',
        severity: 'OPEN',
        detail:
          'All source keys unassigned; approved restricted import ledger required before any DRVO write',
      }),
      Object.freeze({
        code: 'LIVE_UUID_BIND_BLOCKED',
        severity: 'GATE',
        detail: 'Fixture scaffold refuses binding real DRVO UUIDs or approved-ledger claims',
      }),
    ]),
  });
}

module.exports = {
  SOURCE_SYSTEM,
  composeSourceKey,
  buildIdentityMappingLedger,
};

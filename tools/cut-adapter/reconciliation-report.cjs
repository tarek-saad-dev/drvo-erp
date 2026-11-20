'use strict';

/**
 * Redacted reconciliation report scaffold for Cut fixture characterization.
 * Emits non-PII counts, digests, and gate findings only. Never claims production
 * verification, never opens SQL, never writes destination tables.
 */
const {createHash} = require('node:crypto');
const {assertNoLiveConnectionMarkers} = require('./connection-gates.cjs');

function requireFrozenPlan(plan) {
  if (!plan || plan.mode !== 'FIXTURE_CHARACTERIZATION_DRY_RUN_ONLY') {
    throw new TypeError('Fixture characterization plan required');
  }
  if (plan.writes !== 0 || plan.networkDbCalls !== 0 || plan.liveAccess !== 'BLOCKED') {
    throw new TypeError('Report requires fixture-only zero-write plan');
  }
  assertNoLiveConnectionMarkers({
    datasetId: plan.datasetId,
    customers: plan.customers,
    services: plan.services,
  });
  return plan;
}

function optionalLedger(ledger) {
  if (ledger == null) return null;
  if (!ledger || ledger.mode !== 'FIXTURE_IDENTITY_MAP_DRY_RUN_ONLY') {
    throw new TypeError('Identity ledger must be fixture dry-run when provided');
  }
  if (ledger.writes !== 0 || ledger.productionVerificationClaimed === true) {
    throw new TypeError('Identity ledger must not claim writes or production verification');
  }
  assertNoLiveConnectionMarkers({
    datasetId: ledger.datasetId,
    sourceTenantKey: ledger.sourceTenantKey,
    entries: ledger.entries,
  });
  return ledger;
}

function optionalSalesSummary(summary) {
  if (summary == null) return null;
  assertNoLiveConnectionMarkers(summary);
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    throw new TypeError('salesSummary object required');
  }
  if (summary.schema !== 'drvo.cut-adapter.fixture.sales-history-summary.v1') {
    throw new TypeError('Unsupported sales-history summary schema');
  }
  if (!summary.meta || summary.meta.mode !== 'EXPORTED_JSON_FIXTURE_ONLY') {
    throw new TypeError('salesSummary must be EXPORTED_JSON_FIXTURE_ONLY');
  }
  if (summary.meta.liveConnectionAuthorized === true) {
    throw new TypeError('live sales summary authorization refused');
  }
  const counts = summary.counts;
  if (!counts || typeof counts !== 'object') {
    throw new TypeError('salesSummary.counts required');
  }
  for (const key of [
    'saleHeaderCount',
    'saleLineCount',
    'tenderCount',
    'voidOrRefundCount',
    'uniqueCustomerCount',
  ]) {
    if (!Number.isSafeInteger(counts[key]) || counts[key] < 0 || counts[key] > 1000000) {
      throw new TypeError('Invalid sales summary count: ' + key);
    }
  }
  return Object.freeze({
    datasetId: summary.meta.datasetId,
    windowStart: summary.meta.windowStart || null,
    windowEnd: summary.meta.windowEnd || null,
    counts: Object.freeze({...counts}),
    financialEffect: 'NONE_HISTORICAL_REFERENCE_ONLY',
  });
}

/**
 * Build a redacted reconciliation report from a fixture plan (+ optional maps).
 */
function buildReconciliationReport(plan, options = {}) {
  requireFrozenPlan(plan);
  assertNoLiveConnectionMarkers(options);
  const ledger = optionalLedger(options.identityLedger);
  const sales = optionalSalesSummary(options.salesSummary);

  const customerBranchKeys = new Set();
  for (const row of plan.customers) {
    if (row.sourceBranchKey) customerBranchKeys.add(row.sourceBranchKey);
  }
  const activeServices = plan.services.filter((s) => s.active !== false).length;
  const inactiveServices = plan.services.length - activeServices;
  const withLastVisit = plan.customers.filter(
    (c) => typeof c.lastVisitDate === 'string' && c.lastVisitDate
  ).length;

  const findings = [
    Object.freeze({
      code: 'FIXTURE_RECON_SCAFFOLD',
      severity: 'INFO',
      detail: 'Redacted fixture reconciliation only; not Cut production verification',
    }),
    Object.freeze({
      code: 'PRODUCTION_VERIFICATION_NOT_CLAIMED',
      severity: 'GATE',
      detail: 'Report explicitly refuses production/pilot verification claims',
    }),
    Object.freeze({
      code: 'DESTINATION_WRITES_BLOCKED',
      severity: 'GATE',
      detail: 'writes=0; no DRVO owner-table mutation from this scaffold',
    }),
  ];
  if (!ledger) {
    findings.push(
      Object.freeze({
        code: 'IDENTITY_LEDGER_ABSENT',
        severity: 'OPEN',
        detail: 'Pass identityLedger from identity-mapping.cjs for id-map preflight counts',
      })
    );
  } else if (ledger.entries.some((e) => e.targetDrvoUuid !== null)) {
    throw new TypeError('Assigned target UUIDs are not allowed in fixture recon reports');
  } else {
    findings.push(
      Object.freeze({
        code: 'IDENTITY_LEDGER_UNASSIGNED',
        severity: 'OPEN',
        detail:
          'Identity ledger present with ' +
          ledger.entryCount +
          ' unassigned keys; approved import ledger still required',
      })
    );
  }
  if (sales) {
    findings.push(
      Object.freeze({
        code: 'HISTORICAL_SALES_COUNTS_FIXTURE',
        severity: 'INFO',
        detail:
          'Sales history counts are fixture/redacted only; never trigger tender/stock/loyalty side effects',
      })
    );
  }

  const body = {
    datasetId: plan.datasetId,
    planDigest: plan.digest,
    identityDigest: ledger ? ledger.digest : null,
    customers: {
      count: plan.customerCount,
      withLastVisit,
      distinctBranchKeys: customerBranchKeys.size,
    },
    services: {
      count: plan.serviceCount,
      active: activeServices,
      inactive: inactiveServices,
    },
    salesHistory: sales,
    identity: ledger
      ? Object.freeze({
          entryCount: ledger.entryCount,
          assignedCount: 0,
          unassignedCount: ledger.entryCount,
        })
      : null,
  };
  const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');

  return Object.freeze({
    schema: 'drvo.cut-adapter.reconciliation-report.v1',
    mode: 'FIXTURE_RECONCILIATION_REPORT_DRY_RUN_ONLY',
    liveAccess: 'BLOCKED',
    writes: 0,
    networkDbCalls: 0,
    productionVerificationClaimed: false,
    realDataActivation: 'BLOCKED',
    datasetId: plan.datasetId,
    planDigest: plan.digest,
    digest,
    counts: Object.freeze(body),
    findings: Object.freeze(findings),
  });
}

module.exports = {buildReconciliationReport};

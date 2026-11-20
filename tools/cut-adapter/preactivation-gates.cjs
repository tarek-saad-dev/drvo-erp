'use strict';

/**
 * Track D Cut Salon pre-activation readiness checklist (source/docs only).
 * Evaluates repository presence of SQL024/025 migration files and returns a
 * fail-closed gate board. Never connects to primary/VPS SQL, never claims
 * production verification, never authorizes real-data activation.
 */
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {assertNoLiveConnectionMarkers} = require('./connection-gates.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

const GATE_DEFS = Object.freeze([
  Object.freeze({
    id: 'SQL024_SOURCE_PRESENT',
    title: 'Customers SQL024 present in DRVO source tree',
    evidenceClass: 'SOURCE_ARTIFACT',
    howToVerify:
      'Confirm db/migrations/024_customer_business_search.sql exists and matches the committed SHA-256 checksum in this checklist run. Source presence ≠ target DB apply.',
  }),
  Object.freeze({
    id: 'SQL025_SOURCE_PRESENT',
    title: 'Catalog packages SQL025 present in DRVO source tree',
    evidenceClass: 'SOURCE_ARTIFACT',
    howToVerify:
      'Confirm db/migrations/025_catalog_packages.sql exists and matches the committed SHA-256 checksum in this checklist run. Source presence ≠ target DB apply.',
  }),
  Object.freeze({
    id: 'SQL024_TARGET_APPLY',
    title: 'SQL024 applied on verified isolated DRVO target DB',
    evidenceClass: 'OPERATOR_TARGET_DB',
    howToVerify:
      'On the dedicated DRVO pilot DB (not Cut/Cashier/AutoResponse), read-only inspect core.SchemaMigration for 024_customer_business_search.sql with matching checksum. Do not apply from chat; use approved restricted migrator after backup.',
  }),
  Object.freeze({
    id: 'SQL025_TARGET_APPLY',
    title: 'SQL025 applied on verified isolated DRVO target DB',
    evidenceClass: 'OPERATOR_TARGET_DB',
    howToVerify:
      'Read-only confirm 025_catalog_packages.sql in target SchemaMigration with matching checksum after SQL024. Separate authorization required; disposable CI PASS is not primary/VPS proof.',
  }),
  Object.freeze({
    id: 'ISOLATED_RESTORE',
    title: 'Independent encrypted backup restore into a separate DRVO-only DB',
    evidenceClass: 'OPERATOR_RECOVERY',
    howToVerify:
      'Take COPY_ONLY (or approved equivalent) backup of the target DRVO DB, RESTORE VERIFYONLY, restore into a newly named isolated recovery database, compare SchemaMigration rows/checksums. Never restore into Cut production or unrelated staging DBs. Record RPO/RTO outside the repo.',
  }),
  Object.freeze({
    id: 'K5_PERMISSIONS',
    title: 'K5 private permissions/flags for Customers/Catalog/POS DRAFT',
    evidenceClass: 'OPERATOR_K5',
    howToVerify:
      'With trusted K5 session on the intended private environment: confirm customers.read/customers.manage (and catalog/POS draft actions as scoped), default-deny for foreign Tenant/Business/Branch, and that activation flags remain OFF until separately approved. Use K5F readiness checker where installed; do not paste secrets.',
  }),
  Object.freeze({
    id: 'OWNER_BROWSER',
    title: 'Authenticated Owner browser gates on private workspace',
    evidenceClass: 'OPERATOR_BROWSER',
    howToVerify:
      'Authorized Owner signs in to the private workspace (not /demo/salon): Business/Branch scope correct; Customer SQL024 search works; Catalog/packages visible if SQL025 applied; POS creates NONPOSTING DRAFT only; foreign tenant denial; no paid posting. Disposable Chromium CI ≠ Owner browser proof.',
  }),
  Object.freeze({
    id: 'FOUNDER_SOURCE_SCOPE',
    title: 'Founder-approved Cut read-only source + Tenant/Branch/time scope',
    evidenceClass: 'FOUNDER_APPROVAL',
    howToVerify:
      'Cut admin authorizes read-only export from a verified Cut SQL target with SourceSystem+SourceTenant+SourceBranch+time window recorded in a restricted channel. Credentials/backups/phone rosters never enter git or chat.',
  }),
  Object.freeze({
    id: 'APPROVED_IMPORT_LEDGER',
    title: 'Approved restricted identity import ledger before any DRVO write',
    evidenceClass: 'FOUNDER_APPROVAL',
    howToVerify:
      'Populate SourceSystem|SourceTenant|SourceBranch|EntityType|OriginalId → DRVO UUID mappings in an approved offline ledger; run fixture reconciliation report digests; no unreviewed DML into module owner tables.',
  }),
]);

function sha256File(absPath) {
  return createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function sourceMigrationProbe(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return Object.freeze({
      path: relPath,
      present: false,
      checksumSha256: null,
    });
  }
  return Object.freeze({
    path: relPath,
    present: true,
    checksumSha256: sha256File(abs),
  });
}

/**
 * Build the pre-activation gate board.
 * `operatorEvidence` may only supply non-secret status notes; any claim of
 * production PASS is refused. Defaults keep every operator/founder gate OPEN.
 */
function buildPreactivationGateBoard(operatorEvidence = {}) {
  assertNoLiveConnectionMarkers(operatorEvidence);
  if (
    operatorEvidence &&
    typeof operatorEvidence === 'object' &&
    operatorEvidence.productionVerificationClaimed === true
  ) {
    throw new TypeError(
      'productionVerificationClaimed=true refused: this scaffold never attests production verification'
    );
  }
  if (operatorEvidence && operatorEvidence.realDataActivation === 'AUTHORIZED') {
    throw new TypeError('realDataActivation AUTHORIZED refused in pre-activation scaffold');
  }

  const sql024 = sourceMigrationProbe(path.join('db', 'migrations', '024_customer_business_search.sql'));
  const sql025 = sourceMigrationProbe(path.join('db', 'migrations', '025_catalog_packages.sql'));

  const gates = GATE_DEFS.map((def) => {
    let status = 'OPEN';
    let evidence = 'NOT_VERIFIED_IN_THIS_SCAFFOLD';
    if (def.id === 'SQL024_SOURCE_PRESENT') {
      status = sql024.present ? 'PASS_SOURCE_ONLY' : 'FAIL_SOURCE_MISSING';
      evidence = sql024.present
        ? 'source checksum ' + sql024.checksumSha256
        : 'migration file missing from repo';
    } else if (def.id === 'SQL025_SOURCE_PRESENT') {
      status = sql025.present ? 'PASS_SOURCE_ONLY' : 'FAIL_SOURCE_MISSING';
      evidence = sql025.present
        ? 'source checksum ' + sql025.checksumSha256
        : 'migration file missing from repo';
    }
    return Object.freeze({
      id: def.id,
      title: def.title,
      evidenceClass: def.evidenceClass,
      status,
      evidence,
      howToVerify: def.howToVerify,
      blocksRealDataActivation: def.evidenceClass !== 'SOURCE_ARTIFACT' || status !== 'PASS_SOURCE_ONLY',
    });
  });

  const blocking = gates.filter(
    (g) =>
      g.status === 'OPEN' ||
      g.status === 'FAIL_SOURCE_MISSING' ||
      (g.evidenceClass === 'SOURCE_ARTIFACT' && g.status !== 'PASS_SOURCE_ONLY')
  );

  const board = Object.freeze({
    schema: 'drvo.cut-adapter.preactivation-gates.v1',
    mode: 'PREACTIVATION_CHECKLIST_DRY_RUN_ONLY',
    liveAccess: 'BLOCKED',
    writes: 0,
    networkDbCalls: 0,
    productionVerificationClaimed: false,
    realDataActivation: 'BLOCKED',
    cutSqlModifications: 'FORBIDDEN',
    sourceMigrations: Object.freeze({
      sql024,
      sql025,
    }),
    gates: Object.freeze(gates),
    blockingGateIds: Object.freeze(blocking.map((g) => g.id)),
    summary: Object.freeze({
      sourceArtifactPassCount: gates.filter((g) => g.status === 'PASS_SOURCE_ONLY').length,
      openOperatorGateCount: gates.filter((g) => g.status === 'OPEN').length,
      realDataActivationAllowed: false,
      note:
        'PASS_SOURCE_ONLY means the migration file exists in git. Target apply, restore, K5, Owner browser, founder scope, and import ledger remain OPEN until independent operator evidence exists outside this tool.',
    }),
  });

  return board;
}

module.exports = {
  GATE_DEFS,
  buildPreactivationGateBoard,
};

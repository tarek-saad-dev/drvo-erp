'use strict';

/**
 * Track A — Private Pilot Readiness gate board (source/docs only).
 * Probes SQL001–034 source artifacts with SHA-256 checksums and keeps every
 * operator/activation gate OPEN or BLOCKED. Never connects to primary/VPS SQL,
 * never claims production verification, never authorizes ADR-031 posting or
 * Cut live import.
 */
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {assertNoLiveConnectionMarkers} = require('../cut-adapter/connection-gates.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT, 'db', 'migrations');
const EXPECTED_MIGRATION_FROM = 1;
const EXPECTED_MIGRATION_TO = 34;

const GATE_DEFS = Object.freeze([
  Object.freeze({
    id: 'SOURCE_MIGRATIONS_001_034',
    title: 'SQL001–034 present in DRVO source tree with SHA-256 checksums',
    evidenceClass: 'SOURCE_ARTIFACT',
    howToVerify:
      'Confirm db/migrations contains exactly one forward migration file for each id 001–034 and record SHA-256. Source presence ≠ target DB apply on primary/VPS or isolated pilot.',
  }),
  Object.freeze({
    id: 'TARGET_APPLY',
    title: 'SQL001–034 applied on verified isolated DRVO Pilot DB only',
    evidenceClass: 'OPERATOR_TARGET_DB',
    howToVerify:
      'On a dedicated DRVO Pilot database (not Cut/Cashier/AutoResponse/primary VPS production), read-only inspect core.SchemaMigration for 001–034 with matching checksums after authorized backup. Do not apply from chat; use restricted migrator only.',
  }),
  Object.freeze({
    id: 'ISOLATED_BACKUP_RESTORE',
    title: 'Independent encrypted backup restore into a separate DRVO-only recovery DB',
    evidenceClass: 'OPERATOR_RECOVERY',
    howToVerify:
      'Take COPY_ONLY (or approved equivalent) backup of the Pilot DB, RESTORE VERIFYONLY, restore into a newly named isolated recovery database, compare SchemaMigration rows/checksums. Never restore into Cut production or primary live DBs. Record RPO/RTO outside the repo.',
  }),
  Object.freeze({
    id: 'K5_PERMISSIONS',
    title: 'K5 private permissions/flags for Modular Monolith Tenant/Business/Branch scope',
    evidenceClass: 'OPERATOR_K5',
    howToVerify:
      'With trusted K5 session on the intended private Pilot environment: confirm customers/booking/hr/pos.draft/inventory scopes, default-deny for foreign Tenant/Business/Branch, and that ADR-031 posting flags remain OFF. Use K5F readiness checker where installed; do not paste secrets.',
  }),
  Object.freeze({
    id: 'OWNER_BROWSER_E2E',
    title: 'Authenticated Owner browser E2E on private Pilot workspace',
    evidenceClass: 'OPERATOR_BROWSER',
    howToVerify:
      'Authorized Owner signs in to the private workspace (not /demo/salon): Customer → Booking → Barber → POS NONPOSTING DRAFT → inventory validation → reload. Disposable Chromium CI ≠ Owner browser proof. Draft print remains separately tracked.',
  }),
  Object.freeze({
    id: 'ADR031_POSTING',
    title: 'ADR-031 financial posting / paid sale / GL settlement',
    evidenceClass: 'FOUNDER_FINANCE_GATE',
    howToVerify:
      'ADR-031 remains PROPOSED. Paid POS, tender settlement, stock decrement-on-sale, and first mandatory journal stay blocked until Founder+Finance+Architecture acceptance. This gate must stay BLOCKED in the readiness scaffold.',
  }),
  Object.freeze({
    id: 'CUT_LIVE_IMPORT',
    title: 'Cut Salon live SQL connection / real-data import',
    evidenceClass: 'FOUNDER_APPROVAL',
    howToVerify:
      'Live Cut/Cashier connection strings and real-data import remain forbidden from this package. Use Track D fixture-only tools until founder-approved read-only export + approved identity ledger exist outside chat.',
  }),
]);

function sha256File(absPath) {
  return createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function padMigrationId(n) {
  return String(n).padStart(3, '0');
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort();
}

/**
 * Probe SQL001–034 source migrations. Extra files beyond 034 are recorded but
 * do not satisfy the 001–034 completeness gate by themselves.
 */
function probeSourceMigrations001to034() {
  const files = listMigrationFiles();
  const byId = new Map();
  for (const name of files) {
    const id = name.slice(0, 3);
    const abs = path.join(MIGRATIONS_DIR, name);
    const entry = Object.freeze({
      id,
      fileName: name,
      path: path.join('db', 'migrations', name).replace(/\\/g, '/'),
      present: true,
      checksumSha256: sha256File(abs),
    });
    if (!byId.has(id)) {
      byId.set(id, entry);
    } else {
      // Ambiguous duplicate id → mark collision for fail-closed completeness.
      byId.set(
        id,
        Object.freeze({
          ...entry,
          duplicate: true,
          previousFileName: byId.get(id).fileName,
        })
      );
    }
  }

  const expected = [];
  const missingIds = [];
  for (let n = EXPECTED_MIGRATION_FROM; n <= EXPECTED_MIGRATION_TO; n++) {
    const id = padMigrationId(n);
    const found = byId.get(id);
    if (!found || found.duplicate) {
      missingIds.push(id);
      expected.push(
        Object.freeze({
          id,
          fileName: null,
          path: null,
          present: false,
          checksumSha256: null,
          duplicate: !!(found && found.duplicate),
        })
      );
    } else {
      expected.push(found);
    }
  }

  const complete =
    missingIds.length === 0 &&
    expected.every((m) => m.present && m.checksumSha256);

  return Object.freeze({
    from: EXPECTED_MIGRATION_FROM,
    to: EXPECTED_MIGRATION_TO,
    expectedCount: EXPECTED_MIGRATION_TO - EXPECTED_MIGRATION_FROM + 1,
    presentCount: expected.filter((m) => m.present).length,
    complete,
    missingIds: Object.freeze(missingIds),
    migrations: Object.freeze(expected),
    checksumIndex: Object.freeze(
      Object.fromEntries(
        expected
          .filter((m) => m.present)
          .map((m) => [m.fileName, m.checksumSha256])
      )
    ),
  });
}

/**
 * Build the private Pilot readiness gate board.
 * `operatorEvidence` may only supply non-secret status notes; any claim of
 * production PASS or ADR-031 authorization is refused.
 */
function buildPilotReadinessBoard(operatorEvidence = {}) {
  assertNoLiveConnectionMarkers(operatorEvidence);
  if (
    operatorEvidence &&
    typeof operatorEvidence === 'object' &&
    operatorEvidence.productionVerificationClaimed === true
  ) {
    throw new TypeError(
      'productionVerificationClaimed=true refused: Pilot readiness scaffold never attests production verification'
    );
  }
  if (operatorEvidence && operatorEvidence.realDataActivation === 'AUTHORIZED') {
    throw new TypeError('realDataActivation AUTHORIZED refused in Pilot readiness scaffold');
  }
  if (operatorEvidence && operatorEvidence.adr031Posting === 'ENABLED') {
    throw new TypeError('adr031Posting ENABLED refused: ADR-031 posting stays BLOCKED');
  }
  if (operatorEvidence && operatorEvidence.cutLiveImport === 'AUTHORIZED') {
    throw new TypeError('cutLiveImport AUTHORIZED refused: Cut live import stays BLOCKED');
  }

  const sourceMigrations = probeSourceMigrations001to034();

  const gates = GATE_DEFS.map((def) => {
    let status = 'OPEN';
    let evidence = 'NOT_VERIFIED_IN_THIS_SCAFFOLD';
    if (def.id === 'SOURCE_MIGRATIONS_001_034') {
      status = sourceMigrations.complete ? 'PASS_SOURCE_ONLY' : 'FAIL_SOURCE_MISSING';
      evidence = sourceMigrations.complete
        ? 'source checksums for SQL001–034 recorded (' +
          sourceMigrations.presentCount +
          '/' +
          sourceMigrations.expectedCount +
          ')'
        : 'missing migration ids: ' + sourceMigrations.missingIds.join(',');
    } else if (def.id === 'ADR031_POSTING') {
      status = 'BLOCKED';
      evidence =
        'ADR-031 PROPOSED; paid posting / GL settlement not authorized by this scaffold';
    } else if (def.id === 'CUT_LIVE_IMPORT') {
      status = 'BLOCKED';
      evidence =
        'Cut live connection/import forbidden; use fixture-only Track D until founder scope + ledger';
    }
    return Object.freeze({
      id: def.id,
      title: def.title,
      evidenceClass: def.evidenceClass,
      status,
      evidence,
      howToVerify: def.howToVerify,
      blocksPilotActivation:
        def.evidenceClass !== 'SOURCE_ARTIFACT' || status !== 'PASS_SOURCE_ONLY',
    });
  });

  const blocking = gates.filter(
    (g) =>
      g.status === 'OPEN' ||
      g.status === 'BLOCKED' ||
      g.status === 'FAIL_SOURCE_MISSING' ||
      (g.evidenceClass === 'SOURCE_ARTIFACT' && g.status !== 'PASS_SOURCE_ONLY')
  );

  return Object.freeze({
    schema: 'drvo.pilot.readiness-board.v1',
    mode: 'PILOT_READINESS_CHECKLIST_DRY_RUN_ONLY',
    architectureNote:
      'Modular Monolith with Tenant/Business/Branch isolation; Pilot DB must remain isolated from Cut live SQL.',
    liveAccess: 'BLOCKED',
    writes: 0,
    networkDbCalls: 0,
    productionVerificationClaimed: false,
    realDataActivation: 'BLOCKED',
    adr031Posting: 'BLOCKED',
    cutLiveImport: 'BLOCKED',
    primaryVpsSqlApply: 'FORBIDDEN',
    sourceMigrations,
    gates: Object.freeze(gates),
    blockingGateIds: Object.freeze(blocking.map((g) => g.id)),
    summary: Object.freeze({
      sourceArtifactPassCount: gates.filter((g) => g.status === 'PASS_SOURCE_ONLY').length,
      openOperatorGateCount: gates.filter((g) => g.status === 'OPEN').length,
      blockedGateCount: gates.filter((g) => g.status === 'BLOCKED').length,
      pilotActivationAllowed: false,
      note:
        'PASS_SOURCE_ONLY means SQL001–034 files exist in git with checksums. Target apply, isolated backup/restore, K5, and Owner browser E2E remain OPEN. ADR-031 posting and Cut live import remain BLOCKED.',
    }),
  });
}

module.exports = {
  GATE_DEFS,
  EXPECTED_MIGRATION_FROM,
  EXPECTED_MIGRATION_TO,
  probeSourceMigrations001to034,
  buildPilotReadinessBoard,
};

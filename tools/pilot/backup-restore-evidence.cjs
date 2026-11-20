'use strict';

/**
 * Independent backup/restore evidence helpers for disposable Pilot CI SQL only.
 * NEVER targets primary VPS / Cut live / Cashier production databases.
 * Offline helpers intentionally avoid requiring tools/k4-db/migrate.cjs (mssql).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT, 'db', 'migrations');
const ID_PATTERN = /^([0-9]{3})_([a-z][a-z0-9_]*)\.sql$/;

const ALLOWED_PILOT_DBS = Object.freeze([
  'DrvoPilotDisposable',
  'DrvoPilotDisposableRestore',
]);

function readMigrationManifestOffline(dir = MIGRATIONS_DIR, maxMigrations = 34) {
  const filenames = fs
    .readdirSync(dir)
    .filter((x) => x.endsWith('.sql'))
    .sort();
  assert.ok(filenames.length, 'No migrations found');
  const manifest = filenames.map((filename, i) => {
    const match = ID_PATTERN.exec(filename);
    assert.ok(match, 'Unexpected migration filename: ' + filename);
    assert.equal(Number(match[1]), i + 1, 'Migration numbering must be consecutive');
    const source = fs.readFileSync(path.join(dir, filename));
    return {
      filename,
      checksum: createHash('sha256').update(source).digest('hex'),
    };
  });
  return manifest.slice(0, maxMigrations);
}

const FORBIDDEN_DB_NAMES = Object.freeze([
  /cut/i,
  /cashier/i,
  /autoresponse/i,
  /production/i,
  /DRVO_ERP_STAGING/i,
  /primary/i,
]);

function assertAllowedPilotDatabase(name) {
  assert.ok(typeof name === 'string' && name.length > 0, 'database name required');
  for (const pattern of FORBIDDEN_DB_NAMES) {
    if (pattern.test(name) && !ALLOWED_PILOT_DBS.includes(name)) {
      throw new TypeError(
        'Forbidden database target for Pilot backup/restore evidence: ' + name
      );
    }
  }
  if (!ALLOWED_PILOT_DBS.includes(name)) {
    throw new TypeError(
      'Pilot backup/restore allowlist miss: ' +
        name +
        ' (only disposable Pilot CI DB names permitted)'
    );
  }
  return true;
}

function backupDiskPath(dbName, stamp) {
  assertAllowedPilotDatabase(dbName);
  const safeStamp = String(stamp || Date.now()).replace(/[^0-9A-Za-z_-]/g, '');
  return path.posix.join(
    '/var/opt/mssql/data',
    'drvo_pilot_' + dbName.toLowerCase() + '_' + safeStamp + '.bak'
  );
}

function buildBackupSql(dbName, diskPath) {
  assertAllowedPilotDatabase(dbName);
  assert.ok(diskPath.startsWith('/var/opt/mssql/data/drvo_pilot_'), 'backup path must be pilot-scoped');
  return (
    `BACKUP DATABASE [${dbName}] TO DISK = N'${diskPath}' ` +
    `WITH COPY_ONLY, FORMAT, INIT, CHECKSUM, NAME = N'DRVO_PILOT_${dbName}'`
  );
}

function buildRestoreVerifySql(diskPath) {
  assert.ok(diskPath.startsWith('/var/opt/mssql/data/drvo_pilot_'), 'restore verify path must be pilot-scoped');
  return `RESTORE VERIFYONLY FROM DISK = N'${diskPath}' WITH CHECKSUM`;
}

function buildRestoreToNewDbSql(sourceDb, restoreDb, diskPath, logicalData, logicalLog) {
  assertAllowedPilotDatabase(sourceDb);
  assertAllowedPilotDatabase(restoreDb);
  assert.notEqual(sourceDb, restoreDb, 'restore target must be a different DB name');
  assert.ok(diskPath.startsWith('/var/opt/mssql/data/drvo_pilot_'));
  const dataFile = `/var/opt/mssql/data/${restoreDb}.mdf`;
  const logFile = `/var/opt/mssql/data/${restoreDb}_log.ldf`;
  return (
    `RESTORE DATABASE [${restoreDb}] FROM DISK = N'${diskPath}' WITH REPLACE, RECOVERY, ` +
    `MOVE N'${logicalData}' TO N'${dataFile}', MOVE N'${logicalLog}' TO N'${logFile}'`
  );
}

function compareSchemaMigrationRows(sourceRows, restoredRows, expectedManifest) {
  assert.ok(Array.isArray(sourceRows) && Array.isArray(restoredRows));
  assert.equal(sourceRows.length, restoredRows.length, 'SchemaMigration row count mismatch');
  assert.equal(sourceRows.length, expectedManifest.length, 'expected migration count mismatch');
  for (let i = 0; i < expectedManifest.length; i++) {
    assert.equal(sourceRows[i].MigrationId, expectedManifest[i].filename);
    assert.equal(sourceRows[i].Checksum, expectedManifest[i].checksum);
    assert.equal(restoredRows[i].MigrationId, expectedManifest[i].filename);
    assert.equal(restoredRows[i].Checksum, expectedManifest[i].checksum);
  }
  const digest = createHash('sha256')
    .update(
      sourceRows.map((r) => r.MigrationId + ':' + r.Checksum).join('|'),
      'utf8'
    )
    .digest('hex');
  return Object.freeze({
    matched: true,
    rowCount: sourceRows.length,
    digest,
  });
}

function offlineBackupRestorePlan(maxMigrations = 34) {
  const manifest = readMigrationManifestOffline(MIGRATIONS_DIR, maxMigrations);
  const sourceDb = 'DrvoPilotDisposable';
  const restoreDb = 'DrvoPilotDisposableRestore';
  const diskPath = backupDiskPath(sourceDb, 'offline-plan');
  return Object.freeze({
    schema: 'drvo.pilot.backup-restore-plan.v1',
    mode: 'PILOT_BACKUP_RESTORE_PLAN_DRY_RUN_ONLY',
    productionVerificationClaimed: false,
    primaryVpsSqlApply: 'FORBIDDEN',
    cutLiveImport: 'BLOCKED',
    sourceDb,
    restoreDb,
    diskPath,
    backupSql: buildBackupSql(sourceDb, diskPath),
    verifySql: buildRestoreVerifySql(diskPath),
    expectedMigrationCount: manifest.length,
    expectedChecksums: Object.freeze(
      Object.fromEntries(manifest.map((m) => [m.filename, m.checksum]))
    ),
    note:
      'Plan only. Execute exclusively inside tools/pilot/isolated-db-harness.cjs under disposable CI flags. Never against primary/VPS or Cut.',
  });
}

module.exports = {
  ALLOWED_PILOT_DBS,
  assertAllowedPilotDatabase,
  backupDiskPath,
  buildBackupSql,
  buildRestoreVerifySql,
  buildRestoreToNewDbSql,
  compareSchemaMigrationRows,
  readMigrationManifestOffline,
  offlineBackupRestorePlan,
};

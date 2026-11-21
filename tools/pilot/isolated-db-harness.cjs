'use strict';

/**
 * Disposable Pilot DB harness — SQL Server localhost CI only.
 * - applyMigrations 001–034 with checksum verify
 * - COPY_ONLY backup → RESTORE VERIFYONLY → restore into new recovery DB
 * - Seed synthetic K5 Owner Tenant/Business/Branch permissions
 *
 * NEVER targets primary VPS, Cut live, Cashier production, or DRVO_ERP_STAGING.
 * Requires: GITHUB_ACTIONS=true, DRVO_PILOT_CI_DISPOSABLE=YES, SQL on 127.0.0.1.
 *
 * mssql / migrate.cjs are lazy-loaded so offline unit tests never need apps/api deps.
 */
const assert = require('node:assert/strict');
const {
  assertAllowedPilotDatabase,
  backupDiskPath,
  buildBackupSql,
  buildRestoreVerifySql,
  buildRestoreToNewDbSql,
  compareSchemaMigrationRows,
  readMigrationManifestOffline,
} = require('./backup-restore-evidence.cjs');
const {seedDisposablePilotOwner, PILOT_OWNER_ACTIONS} = require('./k5-owner-bootstrap-evidence.cjs');
const {buildPilotReadinessBoard} = require('./readiness-board.cjs');

const SOURCE_DB = 'DrvoPilotDisposable';
const RESTORE_DB = 'DrvoPilotDisposableRestore';
const PORT = Number(process.env.DRVO_PILOT_CI_PORT || '14345');

function assertDisposableGuards() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Pilot harness is CI-only');
  assert.equal(
    process.env.DRVO_PILOT_CI_DISPOSABLE,
    'YES',
    'Explicit disposable Pilot confirmation required'
  );
  assert.ok(
    process.env.SQL_TEST_SA_PASSWORD && process.env.SQL_TEST_SA_PASSWORD.length >= 12,
    'SQL_TEST_SA_PASSWORD required'
  );
  assert.equal(PORT, 14345, 'Pilot disposable SQL port must be 14345');
  assertAllowedPilotDatabase(SOURCE_DB);
  assertAllowedPilotDatabase(RESTORE_DB);
}

function loadSqlModules() {
  const sql = require('../../apps/api/node_modules/mssql');
  const {applyMigrations} = require('../k4-db/migrate.cjs');
  return {sql, applyMigrations};
}

async function open(sql, database, user = 'sa', password = process.env.SQL_TEST_SA_PASSWORD) {
  const pool = new sql.ConnectionPool({
    server: '127.0.0.1',
    port: PORT,
    user,
    password,
    database,
    options: {encrypt: true, trustServerCertificate: true},
    connectionTimeout: 5000,
    requestTimeout: 180000,
    pool: {min: 0, max: 3},
  });
  await pool.connect();
  return pool;
}

async function waitForSql(sql) {
  let master;
  for (let i = 0; i < 45; i++) {
    try {
      master = await open(sql, 'master');
      await master.query('SELECT 1');
      return master;
    } catch (err) {
      await master?.close().catch(() => {});
      if (i === 44) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('Pilot disposable SQL unavailable');
}

async function dropIfExists(master, dbName) {
  assertAllowedPilotDatabase(dbName);
  await master.query(`
    IF DB_ID(N'${dbName}') IS NOT NULL
    BEGIN
      ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      DROP DATABASE [${dbName}];
    END
  `);
}

async function runHarness() {
  assertDisposableGuards();
  const {sql, applyMigrations} = loadSqlModules();

  const board = buildPilotReadinessBoard();
  assert.equal(board.productionVerificationClaimed, false);
  assert.equal(board.adr031Posting, 'BLOCKED');
  assert.equal(board.primaryVpsSqlApply, 'FORBIDDEN');
  assert.ok(board.sourceMigrations.complete);

  const manifest = readMigrationManifestOffline(undefined, 34);
  assert.equal(manifest.length, 34);

  let master;
  let source;
  let restored;
  try {
    master = await waitForSql(sql);
    await dropIfExists(master, RESTORE_DB);
    await dropIfExists(master, SOURCE_DB);
    await master.query(`CREATE DATABASE [${SOURCE_DB}]`);
    source = await open(sql, SOURCE_DB);

    const applied = await applyMigrations(source, undefined, 34);
    assert.equal(applied.length, 34);
    assert.ok(applied.every((x) => x.status === 'applied' || x.status === 'unchanged'));

    const replay = await applyMigrations(source, undefined, 34);
    assert.ok(replay.every((x) => x.status === 'unchanged'), 'checksum drift on replay');

    const history = await source.query(
      'SELECT MigrationId, Checksum FROM core.SchemaMigration ORDER BY MigrationId'
    );
    assert.equal(history.recordset.length, 34);
    for (let i = 0; i < 34; i++) {
      assert.equal(history.recordset[i].MigrationId, manifest[i].filename);
      assert.equal(history.recordset[i].Checksum, manifest[i].checksum);
    }
    console.log('PASS: SQL001–034 applied on disposable Pilot DB with matching checksums');

    const owner = await seedDisposablePilotOwner(source, sql);
    assert.equal(owner.permissionCount, PILOT_OWNER_ACTIONS.length);
    console.log('PASS: synthetic K5 Owner Tenant/Business/Branch seeded (ADR-031 still BLOCKED)');

    const stamp = Date.now();
    const diskPath = backupDiskPath(SOURCE_DB, stamp);
    await source.query(buildBackupSql(SOURCE_DB, diskPath));
    await master.query(buildRestoreVerifySql(diskPath));
    console.log('PASS: COPY_ONLY backup + RESTORE VERIFYONLY');

    const filelist = await master.query(`RESTORE FILELISTONLY FROM DISK = N'${diskPath}'`);
    const logicalData = filelist.recordset.find((r) => r.Type === 'D')?.LogicalName;
    const logicalLog = filelist.recordset.find((r) => r.Type === 'L')?.LogicalName;
    assert.ok(logicalData && logicalLog, 'logical file names required');

    await master.query(
      buildRestoreToNewDbSql(SOURCE_DB, RESTORE_DB, diskPath, logicalData, logicalLog)
    );
    restored = await open(sql, RESTORE_DB);
    const restoredHistory = await restored.query(
      'SELECT MigrationId, Checksum FROM core.SchemaMigration ORDER BY MigrationId'
    );
    const compare = compareSchemaMigrationRows(
      history.recordset,
      restoredHistory.recordset,
      manifest
    );
    assert.equal(compare.matched, true);
    console.log('PASS: isolated restore into DrvoPilotDisposableRestore matches SchemaMigration');

    return Object.freeze({
      ok: true,
      mode: 'PILOT_ISOLATED_DB_HARNESS_DISPOSABLE_CI',
      productionVerificationClaimed: false,
      realDataActivation: 'BLOCKED',
      adr031Posting: 'BLOCKED',
      cutLiveImport: 'BLOCKED',
      primaryVpsSqlApply: 'FORBIDDEN',
      sourceDb: SOURCE_DB,
      restoreDb: RESTORE_DB,
      migrationCount: 34,
      backupDiskPath: diskPath,
      schemaMigrationDigest: compare.digest,
      ownerSeed: Object.freeze({
        tenantId: owner.tenantId,
        businessId: owner.businessId,
        branchId: owner.branchId,
        permissionCount: owner.permissionCount,
      }),
      readinessNote:
        'Disposable harness PASS ≠ Owner browser E2E or primary/VPS apply. Board gates TARGET_APPLY/ISOLATED_BACKUP_RESTORE/K5_PERMISSIONS/OWNER_BROWSER_E2E stay OPEN for real Pilot.',
    });
  } finally {
    await restored?.close().catch(() => {});
    await source?.close().catch(() => {});
    if (master) {
      try {
        await dropIfExists(master, RESTORE_DB);
        await dropIfExists(master, SOURCE_DB);
      } catch {
        /* best-effort cleanup */
      }
      await master.close().catch(() => {});
    }
  }
}

if (require.main === module) {
  runHarness()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(
        'PILOT ISOLATED DB HARNESS FAILED:',
        err instanceof Error ? err.message.slice(0, 400) : 'unknown'
      );
      process.exitCode = 1;
    });
}

module.exports = {
  SOURCE_DB,
  RESTORE_DB,
  runHarness,
  assertDisposableGuards,
};

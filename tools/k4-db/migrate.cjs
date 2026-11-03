'use strict';

/**
 * K4 SQL Server forward-only migration engine.
 * - Uses a per-database SQL applock, SERIALIZABLE transactions, and SHA-256 drift detection.
 * - Never creates a database and refuses non-allowlisted target databases.
 * - SQL credentials are taken ONLY from the current process environment.
 * - No production Casher/AutoResponse host, database or credentials are referenced.
 * - Staging application runtime login has CONNECT only: DO NOT run migrations as it.
 */
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { createHash } = require('node:crypto');
const sql = require('../../apps/api/node_modules/mssql');

const MIGRATIONS_DIR = resolve(__dirname, '../../db/migrations');
const ID_PATTERN = /^([0-9]{3})_([a-z][a-z0-9_]*)\.sql$/;
const CI_DB = 'DrvoK4Disposable';
const STAGE_DB = 'DRVO_ERP_STAGING';

function readManifest(dir = MIGRATIONS_DIR) {
  const filenames = readdirSync(dir).filter((x) => x.endsWith('.sql')).sort();
  assert.ok(filenames.length, 'No migrations found');
  return filenames.map((filename, i) => {
    const match = ID_PATTERN.exec(filename);
    assert.ok(match, 'Unexpected migration filename: ' + filename);
    assert.equal(Number(match[1]), i + 1, 'Migration numbering must be consecutive');
    const source = readFileSync(join(dir, filename));
    assert.ok(!/^\s*GO\s*$/im.test(source.toString('utf8')), 'GO batches are not allowed');
    return {
      filename,
      content: source.toString('utf8'),
      checksum: createHash('sha256').update(source).digest('hex'),
    };
  });
}

function configFromEnv() {
  const mode = process.env.DRVO_K4_TARGET;
  let database, port, user, password;
  if (mode === 'ci') {
    assert.equal(process.env.DRVO_K4_DISPOSABLE, 'YES', 'Explicit throwaway CI confirmation required');
    database = CI_DB;
    port = Number(process.env.SQL_TEST_PORT);
    assert.equal(port, 14334, 'CI port must be 14334');
    user = 'sa';
    password = process.env.SQL_TEST_SA_PASSWORD;
  } else if (mode === 'staging') {
    assert.equal(process.env.DRVO_K4_APPLY_STAGING, 'YES', 'Explicit staging DDL approval required');
    assert.equal(process.env.DRVO_K4_SQL_HOST, '127.0.0.1', 'No remote staging migrations');
    assert.equal(process.env.DRVO_K4_SQL_DATABASE, STAGE_DB, 'Staging target is strictly allowlisted');
    database = STAGE_DB;
    port = Number(process.env.DRVO_K4_SQL_PORT);
    assert.equal(port, 1433);
    user = process.env.DRVO_K4_SQL_USER;
    password = process.env.DRVO_K4_SQL_PASSWORD;
  } else {
    throw new Error('K4 SQL target must be explicitly selected: ci or staging');
  }
  assert.ok(user && typeof user === 'string' && user.length < 128);
  assert.ok(password && password.length >= 12, 'A strong SQL secret is required');
  return {
    server: '127.0.0.1', port, user, password, database,
    options: { encrypt: true, trustServerCertificate: true },
    connectionTimeout: 5000, requestTimeout: 30000,
    pool: { min: 0, max: 3 },
  };
}

async function applyMigrations(pool, dir = MIGRATIONS_DIR) {
  const manifest = readManifest(dir);
  const applied = [];
  for (const migration of manifest) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const lock = await transaction.request().query(`
        DECLARE @result INT;
        EXEC @result = sys.sp_getapplock
          @Resource=N'drvo-erp-k4-schema-migrations',
          @LockMode=N'Exclusive',
          @LockOwner=N'Transaction',
          @LockTimeout=15000;
        SELECT @result AS result;
      `);
      if (lock.recordset[0].result < 0) throw new Error('Could not obtain migration lock');

      await transaction.request().batch(`
        IF SCHEMA_ID(N'core') IS NULL EXEC(N'CREATE SCHEMA core');
        IF OBJECT_ID(N'core.SchemaMigration', N'U') IS NULL
        BEGIN
          CREATE TABLE core.SchemaMigration (
            MigrationId NVARCHAR(160) NOT NULL PRIMARY KEY,
            Checksum CHAR(64) NOT NULL,
            AppliedAtUtc DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
          );
        END
      `);
      const existing = await transaction.request()
        .input('id', sql.NVarChar(160), migration.filename)
        .query('SELECT Checksum FROM core.SchemaMigration WHERE MigrationId=@id');
      if (existing.recordset.length > 0) {
        assert.equal(
          existing.recordset[0].Checksum,
          migration.checksum,
          'Checksum drift: ' + migration.filename,
        );
        await transaction.commit();
        applied.push({ filename: migration.filename, status: 'unchanged' });
        continue;
      }

      // DDL and metadata commit atomically under one exclusive app lock.
      await transaction.request().batch(migration.content);
      await transaction.request()
        .input('id', sql.NVarChar(160), migration.filename)
        .input('checksum', sql.Char(64), migration.checksum)
        .query('INSERT INTO core.SchemaMigration(MigrationId,Checksum) VALUES (@id,@checksum)');
      await transaction.commit();
      applied.push({ filename: migration.filename, status: 'applied' });
    } catch (error) {
      try { await transaction.rollback(); } catch { /* transaction may already be aborted */ }
      throw error;
    }
  }
  return applied;
}

async function connect(config) {
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  return pool;
}

async function main() {
  const config = configFromEnv();
  const pool = await connect(config);
  try {
    const identity = await pool.query('SELECT DB_NAME() AS DatabaseName');
    assert.equal(identity.recordset[0].DatabaseName, config.database, 'Wrong SQL database selected');
    const result = await applyMigrations(pool);
    for (const item of result) console.log(item.status.toUpperCase() + ': ' + item.filename);
    console.log('K4 migrations completed in ' + config.database);
  } finally {
    await pool.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    // Fail closed, do not dump driver configuration / credentials / stack.
    console.error('K4 migration FAILED:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}

module.exports = { readManifest, applyMigrations, configFromEnv, connect, CI_DB, STAGE_DB };

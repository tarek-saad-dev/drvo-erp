'use strict';

/**
 * K4B ONE-TIME OPERATOR action, run as root on the VPS, NOT via GitHub Actions.
 * Uses an EXISTING SQL administrator only for backup/restore/migrations/grants.
 * Application runtime uses existing CONNECT-only drvo_erp_stage_app login.
 *
 * No remote SQL, no new SQL login, no other databases, no production data.
 */
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const sql = require('../../apps/api/node_modules/mssql');
const { applyMigrations, readManifest } = require('../../tools/k4-db/migrate.cjs');

const DATABASE = 'DRVO_ERP_STAGING';
const APP_LOGIN = 'drvo_erp_stage_app';
const ENV_FILE = '/etc/drvo-erp/staging-sql.env';
const SQL_DATA_DIR = '/var/opt/mssql/data';
const CORE_TABLES = [
  'core.Account', 'core.Branch', 'core.BranchAssignment',
  'core.Business', 'core.BusinessMembership', 'core.SchemaMigration', 'core.Tenant',
];
const SAFE_CORE_SET = new Set(CORE_TABLES);
const adminName = process.env.DRVO_K4_ADMIN_LOGIN || 'sa';
const adminPassword = process.env.DRVO_K4_ADMIN_PASSWORD;

function validateInputs() {
  assert.equal(process.getuid?.(), 0, 'This one-time operator command must run as root');
  assert.match(adminName, /^[a-zA-Z0-9_.-]{1,64}$/);
  assert.ok(adminPassword && adminPassword.length > 0, 'Enter existing SQL admin password via hidden prompt');
  assert.equal(process.env.DRVO_K4B_EXECUTE, 'YES', 'Explicit one-time operator intent required');
  const stat = fs.lstatSync(ENV_FILE);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0);
  assert.equal(stat.mode & 0o777, 0o600, 'SQL env file must be root-only 0600');
  assert.ok(fs.statSync(SQL_DATA_DIR).isDirectory(), 'Local SQL Server storage path is unexpected');
  const app = Object.fromEntries(fs.readFileSync(ENV_FILE, 'utf8')
    .split(/\r?\n/).filter(Boolean).map((line) => {
      const idx = line.indexOf('=');
      assert.ok(idx > 0, 'Invalid SQL env setting');
      return [line.slice(0, idx), line.slice(idx + 1)];
    }));
  assert.equal(app.DRVO_SQL_HOST, '127.0.0.1');
  assert.equal(app.DRVO_SQL_PORT, '1433');
  assert.equal(app.DRVO_SQL_DATABASE, DATABASE);
  assert.equal(app.DRVO_SQL_USER, APP_LOGIN);
  assert.ok(app.DRVO_SQL_PASSWORD && app.DRVO_SQL_PASSWORD.length >= 12);
  assert.deepEqual(readManifest().map((m) => m.filename), ['001_platform_identity_foundation.sql']);
  return app;
}

const base = {
  server: '127.0.0.1', port: 1433,
  options: { encrypt: true, trustServerCertificate: true },
  pool: { min: 0, max: 2 },
  connectionTimeout: 5000, requestTimeout: 120000,
};
async function connect(user, password, database) {
  const p = new sql.ConnectionPool({ ...base, user, password, database });
  await p.connect();
  return p;
}
function quote(input) { return String(input).replaceAll("'", "''"); }
function dbId(name) { assert.match(name, /^[A-Za-z0-9_]{1,90}$/); return '[' + name + ']'; }
async function tableNames(pool) {
  const found = await pool.query(`SELECT s.name + '.' + t.name AS TableName
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
    ORDER BY s.name,t.name`);
  return found.recordset.map((r) => r.TableName);
}
function assertExpectedTables(tables, after) {
  const unknown = tables.filter((x) => !SAFE_CORE_SET.has(x));
  assert.deepEqual(unknown, [], 'Unexpected tables in DRVO_ERP_STAGING: refuse any schema mutation');
  if (after) assert.deepEqual([...tables].sort(), [...CORE_TABLES].sort(), 'K4 schema mismatch');
}
async function preflight(db) {
  const target = await db.query(`SELECT DB_NAME() AS DB, CAST(SUM(size)*8.0/1024 AS FLOAT) AS MB
    FROM sys.database_files`);
  assert.equal(target.recordset[0].DB, DATABASE, 'Never migrate another database');
  assert.ok(Number(target.recordset[0].MB) < 512, 'Stage database too large for this foundation bootstrap');
  const tables = await tableNames(db);
  assertExpectedTables(tables, false);
  console.log('PASS: staging DB verified, no unrelated tables; size within bootstrap limit');
  return tables;
}
async function backup(master, tag, nonce) {
  const file = path.posix.join(SQL_DATA_DIR, `drvo_k4b_${nonce}_${tag}.bak`);
  const literal = "N'" + quote(file) + "'";
  await master.query(`BACKUP DATABASE [${DATABASE}] TO DISK=${literal}
    WITH INIT, COPY_ONLY, CHECKSUM`);
  await master.query(`RESTORE VERIFYONLY FROM DISK=${literal} WITH CHECKSUM`);
  console.log('PASS: backup + checksum verify (' + tag + '): ' + file);
  return file;
}
async function testRestore(master, backupFile, expectedTables, nonce, suffix) {
  const restoreName = 'DRVO_K4B_RESTORE_' + nonce + '_' + suffix;
  assert.equal(restoreName.length < 90, true);
  assert.equal((await master.query(`SELECT DB_ID(N'${restoreName}') AS id`)).recordset[0].id, null,
    'Unexpected restore-test DB already exists; abort');
  const filelist = await master.query(`RESTORE FILELISTONLY FROM DISK=N'${quote(backupFile)}'`);
  assert.ok(filelist.recordset.length > 0, 'Backup file list is empty');
  const moves = filelist.recordset.map((f, i) => {
    assert.ok(f.LogicalName && (f.Type === 'D' || f.Type === 'L'));
    const extension = f.Type === 'L' ? 'ldf' : i === 0 ? 'mdf' : 'ndf';
    const target = path.posix.join(SQL_DATA_DIR, `${restoreName}_${i}.${extension}`);
    return `MOVE N'${quote(f.LogicalName)}' TO N'${quote(target)}'`;
  });
  let restored;
  try {
    await master.query(`RESTORE DATABASE ${dbId(restoreName)}
      FROM DISK=N'${quote(backupFile)}'
      WITH ${moves.join(', ')}, CHECKSUM, RECOVERY`);
    restored = await connect(adminName, adminPassword, restoreName);
    const found = await tableNames(restored);
    assert.deepEqual(found, expectedTables, 'Independent restored DB has different tables');
    if (expectedTables.length) {
      const history = await restored.query(`SELECT COUNT(*) AS Applied
        FROM core.SchemaMigration WHERE MigrationId=N'001_platform_identity_foundation.sql'`);
      assert.equal(history.recordset[0].Applied, 1);
    }
    console.log('PASS: independent restore + schema verification (' + suffix + ')');
  } finally {
    await restored?.close().catch(() => {});
    // Only touch the unique DRVO_K4B_RESTORE_* DB created by this invocation.
    if ((await master.query(`SELECT DB_ID(N'${restoreName}') AS id`)).recordset[0].id != null) {
      await master.query(`ALTER DATABASE ${dbId(restoreName)}
        SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${dbId(restoreName)};`);
    }
  }
}
async function grantOnlyRead(db) {
  const user = await db.query(`SELECT USER_ID(N'${APP_LOGIN}') AS id`);
  assert.ok(user.recordset[0].id != null, 'Existing runtime DB user is missing');
  for (const table of CORE_TABLES) {
    assert.match(table, /^core\.[A-Za-z]+$/);
    await db.query(`GRANT SELECT ON OBJECT::${table} TO [${APP_LOGIN}]`);
  }
  console.log('PASS: granted existing app login SELECT on seven K4 core tables only');
}
async function testAppPermissions(app) {
  const pool = await connect(APP_LOGIN, app.DRVO_SQL_PASSWORD, DATABASE);
  try {
    const result = await pool.query(`SELECT
      DB_NAME() AS Db,
      IS_ROLEMEMBER(N'db_owner') AS OwnerRole,
      IS_ROLEMEMBER(N'db_ddladmin') AS DdlRole,
      IS_ROLEMEMBER(N'db_datawriter') AS WriterRole,
      HAS_PERMS_BY_NAME(N'core.Account', N'OBJECT', N'SELECT') AS AccountRead,
      HAS_PERMS_BY_NAME(N'core.Account', N'OBJECT', N'UPDATE') AS AccountWrite,
      HAS_PERMS_BY_NAME(DB_NAME(), N'DATABASE', N'CREATE TABLE') AS CanCreateTable`);
    const r = result.recordset[0];
    assert.equal(r.Db, DATABASE);
    assert.equal(Number(r.AccountRead), 1);
    for (const flag of ['OwnerRole','DdlRole','WriterRole','AccountWrite','CanCreateTable']) {
      assert.equal(Number(r[flag] ?? 0), 0, 'Runtime privilege escalation detected: ' + flag);
    }
    const status = await pool.query(`SELECT COUNT(*) AS MigrationRows FROM core.SchemaMigration`);
    assert.equal(status.recordset[0].MigrationRows, 1);
    await pool.query('SELECT TOP (1) TenantId FROM core.Tenant');
  } finally {
    await pool.close();
  }
  console.log('PASS: existing app login can SELECT only; cannot UPDATE or CREATE TABLE');
}
async function main() {
  const app = validateInputs();
  const nonce = randomBytes(6).toString('hex');
  let master, db;
  try {
    master = await connect(adminName, adminPassword, 'master');
    db = await connect(adminName, adminPassword, DATABASE);
    const before = await preflight(db);
    const preBackup = await backup(master, 'pre', nonce);
    await testRestore(master, preBackup, before, nonce, 'pre');

    const applied = await applyMigrations(db);
    assert.equal(applied.length, 1);
    assert.ok(['applied','unchanged'].includes(applied[0].status));
    assert.equal((await applyMigrations(db))[0].status, 'unchanged', 'Replay must be idempotent');
    console.log('PASS: K4 schema migration applied / replay verified');

    const after = await tableNames(db);
    assertExpectedTables(after, true);
    await grantOnlyRead(db);
    await testAppPermissions(app);

    const postBackup = await backup(master, 'post', nonce);
    await testRestore(master, postBackup, after, nonce, 'post');
    console.log('K4B SQL STAGING CUTOVER: PASS');
    console.log('Retain BOTH backup files above under your SQL Server backup policy.');
    console.log('No API service or unrelated database has been restarted.');
  } finally {
    await db?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
if (require.main === module) {
  main().catch((error) => {
    // Do NOT print environment, passwords, pool config, SQL connection strings.
    console.error('K4B SQL cutover FAILED:',
      error instanceof Error ? error.message.slice(0, 350) : 'unknown error');
    process.exitCode = 1;
  });
}
module.exports = { main, validateInputs, tableNames, assertExpectedTables };

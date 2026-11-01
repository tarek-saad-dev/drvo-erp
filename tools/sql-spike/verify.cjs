'use strict';
/**
 * DRVO ERP K2: disposable relational/transaction/backup experiment.
 *
 * THIS DOES NOT AUTHENTICATE USERS OR PROVE SQL ROW LEVEL SECURITY.
 * Connection is restricted to localhost disposable CI SQL Server.
 */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sql = require('mssql');

const database = 'DrvoSpikeValidation';
const restoredDb = 'DrvoSpikeValidationRestore';
const base = {
  server: '127.0.0.1',
  port: Number(process.env.SQL_TEST_PORT || '14333'),
  user: 'sa',
  password: process.env.SQL_TEST_SA_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 3000,
  requestTimeout: 30000,
  pool: { min: 0, max: 4 },
};

function ensureDisposable() {
  assert.ok(base.password && base.password.length >= 12, 'Ephemeral test SQL password must be supplied');
  assert.equal(base.server, '127.0.0.1');
  assert.equal(process.env.DRVO_SQL_SPIKE_DISPOSABLE, 'YES', 'Explicit disposable DB confirmation required');
}

async function connect(db) {
  const pool = new sql.ConnectionPool({ ...base, database: db });
  await pool.connect();
  return pool;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      const pool = await connect('master');
      await pool.query('SELECT 1 AS Ready');
      return pool;
    } catch (error) {
      if (attempt === 44) throw new Error('Disposable SQL Server did not become ready', { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw new Error('Unreachable SQL Server readiness code');
}

async function migration(pool) {
  const source = readFileSync(path.join(__dirname, '001-isolated-fixture.sql'), 'utf8');
  const digest = crypto.createHash('sha256').update(source).digest('hex');
  await pool.request().query(`
    IF OBJECT_ID('dbo.DrvoSpike_Migrations','U') IS NULL
      CREATE TABLE dbo.DrvoSpike_Migrations (
        MigrationId NVARCHAR(100) NOT NULL PRIMARY KEY,
        Sha256 CHAR(64) NOT NULL
      );
  `);
  const existing = await pool.request()
    .input('migrationId', sql.NVarChar(100), '001-isolated-fixture')
    .query('SELECT Sha256 FROM dbo.DrvoSpike_Migrations WHERE MigrationId=@migrationId');
  if (existing.recordset.length) {
    assert.equal(existing.recordset[0].Sha256, digest, 'Migration checksum drift detected');
    return false;
  }
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    await tx.request().query(source);
    await tx.request()
      .input('migrationId', sql.NVarChar(100), '001-isolated-fixture')
      .input('sha', sql.Char(64), digest)
      .query('INSERT INTO dbo.DrvoSpike_Migrations(MigrationId,Sha256) VALUES (@migrationId,@sha)');
    await tx.commit();
    return true;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

async function negativeFk(action, reason) {
  await assert.rejects(action, (err) => {
    const msg = String(err.message || '');
    return /FOREIGN KEY|conflicted|547/i.test(msg);
  }, reason);
}

async function run() {
  ensureDisposable();
  const admin = await waitForServer();
  let pool;
  try {
    // Test database is uniquely named and created only in disposable container.
    await admin.query(`IF DB_ID(N'${database}') IS NULL CREATE DATABASE [${database}]`);
    pool = await connect(database);
    assert.equal(await migration(pool), true);
    assert.equal(await migration(pool), false, 'Same migration must be idempotent');
    console.log('PASS 01 migration applies once, checksum revalidation is a no-op');

    const t1 = crypto.randomUUID(), t2 = crypto.randomUUID();
    const b1 = crypto.randomUUID(), b2 = crypto.randomUUID();
    const br1 = crypto.randomUUID(), br2 = crypto.randomUUID();
    const r1 = crypto.randomUUID();
    for (const [tenant, name] of [[t1, 'Tenant A'], [t2, 'Tenant B']]) {
      await pool.request().input('t', sql.UniqueIdentifier, tenant)
        .input('name', sql.NVarChar(80), name)
        .query('INSERT INTO dbo.DrvoSpike_Tenants VALUES (@t,@name)');
    }
    for (const [tenant, biz, name] of [[t1,b1,'A company'],[t2,b2,'B company']]) {
      await pool.request().input('t',sql.UniqueIdentifier,tenant)
        .input('b',sql.UniqueIdentifier,biz).input('name',sql.NVarChar(80),name)
        .query('INSERT INTO dbo.DrvoSpike_Businesses VALUES (@t,@b,@name)');
    }
    for (const [tenant,biz,branch] of [[t1,b1,br1],[t2,b2,br2]]) {
      await pool.request().input('t',sql.UniqueIdentifier,tenant)
        .input('b',sql.UniqueIdentifier,biz).input('br',sql.UniqueIdentifier,branch)
        .input('name',sql.NVarChar(80),'Branch')
        .query('INSERT INTO dbo.DrvoSpike_Branches VALUES (@t,@b,@br,@name)');
    }
    await negativeFk(
      () => pool.request().input('t',sql.UniqueIdentifier,t1)
        .input('b',sql.UniqueIdentifier,b2).input('br',sql.UniqueIdentifier,crypto.randomUUID())
        .query("INSERT INTO dbo.DrvoSpike_Branches VALUES (@t,@b,@br,N'wrong parent')"),
      'Cross-Tenant Business reference should fail FK'
    );
    console.log('PASS 02 cross-Tenant Business-Branch ancestry rejected by composite FK');

    await negativeFk(
      () => pool.request().input('t',sql.UniqueIdentifier,t1)
        .input('b',sql.UniqueIdentifier,b1).input('br',sql.UniqueIdentifier,br2)
        .input('r',sql.UniqueIdentifier,crypto.randomUUID())
        .query("INSERT INTO dbo.DrvoSpike_Resources(TenantId,BusinessId,BranchId,ResourceId,Label) VALUES (@t,@b,@br,@r,N'wrong branch')"),
      'Cross-Branch ownership must reject wrong branch ancestry'
    );
    console.log('PASS 03 cross-Branch resource FK rejected');

    await pool.request().input('t',sql.UniqueIdentifier,t1)
      .input('b',sql.UniqueIdentifier,b1).input('br',sql.UniqueIdentifier,br1)
      .input('r',sql.UniqueIdentifier,r1)
      .query("INSERT INTO dbo.DrvoSpike_Resources(TenantId,BusinessId,BranchId,ResourceId,Label) VALUES (@t,@b,@br,@r,N'valid')");
    const excluded = await pool.request()
      .input('t',sql.UniqueIdentifier,t2)
      .input('b',sql.UniqueIdentifier,b2)
      .query('SELECT COUNT(*) AS Num FROM dbo.DrvoSpike_Resources WHERE TenantId=@t AND BusinessId=@b');
    assert.equal(excluded.recordset[0].Num, 0);
    console.log('PASS 04 explicitly scoped read excludes unrelated Tenant');

    const oldVersion = await pool.request()
      .input('r',sql.UniqueIdentifier,r1)
      .query('SELECT RowVersion FROM dbo.DrvoSpike_Resources WHERE ResourceId=@r');
    const version = oldVersion.recordset[0].RowVersion;
    const update = () => pool.request().input('r',sql.UniqueIdentifier,r1)
      .input('v',sql.VarBinary(8),version)
      .query("UPDATE dbo.DrvoSpike_Resources SET Label=N'edited' WHERE ResourceId=@r AND RowVersion=@v");
    assert.equal((await update()).rowsAffected[0], 1);
    assert.equal((await update()).rowsAffected[0], 0);
    console.log('PASS 05 rowversion CAS rejects stale update');

    const rollbackId = crypto.randomUUID();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await tx.request().input('id',sql.UniqueIdentifier,rollbackId)
        .input('amt',sql.Decimal(19,4),99.99)
        .query('INSERT INTO dbo.DrvoSpike_Amounts(Id,Amount) VALUES (@id,@amt)');
    } finally {
      await tx.rollback();
    }
    const rolled = await pool.request().input('id',sql.UniqueIdentifier,rollbackId)
      .query('SELECT COUNT(*) AS Num FROM dbo.DrvoSpike_Amounts WHERE Id=@id');
    assert.equal(rolled.recordset[0].Num, 0);
    console.log('PASS 06 transaction rollback has no persisted money effect');

    for (const amount of [1.2345,0.0001]) {
      await pool.request().input('id',sql.UniqueIdentifier,crypto.randomUUID())
        .input('amt',sql.Decimal(19,4),amount)
        .query('INSERT INTO dbo.DrvoSpike_Amounts(Id,Amount) VALUES (@id,@amt)');
    }
    const sum = await pool.query('SELECT CAST(SUM(Amount) AS VARCHAR(64)) AS ExactAmount FROM dbo.DrvoSpike_Amounts');
    assert.equal(sum.recordset[0].ExactAmount, '1.2346');
    console.log('PASS 07 DECIMAL(19,4) exact monetary addition');

    if (process.env.RUN_BACKUP_RESTORE === '1') {
      await pool.close();
      pool = null;
      const file = '/var/opt/mssql/data/drvo_spike_ci_backup.bak';
      await admin.query(`BACKUP DATABASE [${database}] TO DISK=N'${file}' WITH INIT, CHECKSUM`);
      const metadata = await admin.query(`RESTORE FILELISTONLY FROM DISK=N'${file}'`);
      const data = metadata.recordset.find(x => x.Type === 'D');
      const log = metadata.recordset.find(x => x.Type === 'L');
      assert.ok(data && log, 'Backup must have data and log logical files');
      function quote(value){ return '['+String(value).replaceAll(']', ']]')+']'; }
      await admin.query(`
        RESTORE DATABASE [${restoredDb}] FROM DISK=N'${file}'
        WITH MOVE N'${data.LogicalName.replaceAll("'","''")}' TO N'/var/opt/mssql/data/${restoredDb}.mdf',
        MOVE N'${log.LogicalName.replaceAll("'","''")}' TO N'/var/opt/mssql/data/${restoredDb}_log.ldf',
        REPLACE, CHECKSUM, RECOVERY
      `);
      const restored = await connect(restoredDb);
      try {
        const rows = await restored.query('SELECT COUNT(*) AS Num FROM dbo.DrvoSpike_Resources');
        assert.equal(rows.recordset[0].Num, 1);
      } finally {
        await restored.close();
      }
      console.log('PASS 08 verified backup restore into separate disposable DB');
    } else {
      console.log('SKIP 08 backup restore (RUN_BACKUP_RESTORE != 1)');
    }
  } finally {
    if (pool) await pool.close();
    await admin.close();
  }
  console.log('PASS: SQL Server isolation SPIKE checks; no real user authorization proven');
}

run().catch((err) => {
  console.error('SQL Server spike FAILED:', err.message);
  process.exitCode = 1;
});

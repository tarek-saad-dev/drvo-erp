'use strict';
// K4 disposable CI integration test: schema, relational isolation,
// scoped structural reads, replay/drift, transaction rollback and restore.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const sql = require('../../apps/api/node_modules/mssql');
const { configFromEnv, connect, applyMigrations, readManifest, CI_DB } = require('./migrate.cjs');
const { FoundationRepository } = require('../../apps/api/dist/data/foundation-repository');
const { foundationSqlConfig } = require('../../apps/api/dist/data/foundation-connection');
const { FoundationDatabaseService } = require('../../apps/api/dist/data/foundation-database.service');

const cfg = configFromEnv();
assert.equal(process.env.DRVO_K4_TARGET, 'ci');
const restoredDb = 'DrvoK4DisposableRestored';
let checks = 0;

async function check(label, fn) {
  await fn();
  checks++;
  console.log('PASS ' + String(checks).padStart(2, '0') + ': ' + label);
}

async function throwsFk(fn, label) {
  await assert.rejects(fn, (error) => /FOREIGN KEY|conflicted|547/i.test(String(error.message)), label);
}

async function main() {
  let admin;
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      admin = await connect({ ...cfg, database: 'master' });
      await admin.query('SELECT 1 AS Healthy');
      break;
    } catch (error) {
      if (admin) await admin.close().catch(() => {});
      if (attempt === 44) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  let pool;
  try {
    await admin.query(`IF DB_ID(N'${CI_DB}') IS NULL CREATE DATABASE [${CI_DB}]`);
    pool = await connect(cfg);

    await check('runtime SQL config refuses missing flag and foreign DB target', async () => {
      assert.throws(() => foundationSqlConfig({}), /not explicitly configured/);
      const good = {
        DRVO_SQL_ENABLED: 'YES', DRVO_SQL_HOST: '127.0.0.1',
        DRVO_SQL_DATABASE: 'DRVO_ERP_STAGING', DRVO_SQL_PORT: '1433',
        DRVO_SQL_USER: 'drvo_erp_stage_app', DRVO_SQL_PASSWORD: 'ExampleTestSecret1234567!',
      };
      assert.equal(foundationSqlConfig(good).database, 'DRVO_ERP_STAGING');
      assert.throws(() => foundationSqlConfig({...good,DRVO_SQL_DATABASE:'Casher'}),/not explicitly configured/);
      assert.throws(() => foundationSqlConfig({...good,DRVO_SQL_HOST:'example.org'}),/not explicitly configured/);
      assert.throws(() => foundationSqlConfig({...good,DRVO_SQL_USER:'sa'}),/not explicitly configured/);
    });
    await check('transactional checksummed migration applies', async () => {
      const first = await applyMigrations(pool, undefined, 1);
      assert.deepEqual(first.map((x) => x.status), ['applied']);
    });
    await check('immutable migration replay is a no-op', async () => {
      const second = await applyMigrations(pool, undefined, 1);
      assert.deepEqual(second.map((x) => x.status), ['unchanged']);
    });
    await check('source edit triggers checksum drift (without replaying SQL)', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drvo-k4-drift-'));
      const name = readManifest()[0].filename;
      try {
        fs.writeFileSync(path.join(dir, name), readManifest()[0].content + '\n-- modified'); 
        await assert.rejects(() => applyMigrations(pool, dir), /Checksum drift/);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      assert.deepEqual((await applyMigrations(pool, undefined, 1)).map((x) => x.status), ['unchanged']);
    });
    await check('failed forward migration rolls back all its DDL', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drvo-k4-fail-'));
      try {
        const first = readManifest()[0];
        fs.writeFileSync(path.join(dir, first.filename), first.content);
        fs.writeFileSync(path.join(dir, '002_forced_failure.sql'), `
          CREATE TABLE core.K4_FailureMustRollback(Id INT NOT NULL);
          SELECT CAST(N'drvo-bad-int' AS INT);
        `);
        await assert.rejects(() => applyMigrations(pool, dir));
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      const check = await pool.query(`
        SELECT OBJECT_ID(N'core.K4_FailureMustRollback', N'U') AS uncommitted,
          (SELECT COUNT(*) FROM core.SchemaMigration WHERE MigrationId=N'002_forced_failure.sql') AS records
      `);
      assert.equal(check.recordset[0].uncommitted, null);
      assert.equal(check.recordset[0].records, 0);
    });

    const t1 = crypto.randomUUID(), t2 = crypto.randomUUID();
    const b1 = crypto.randomUUID(), b2 = crypto.randomUUID(), b3 = crypto.randomUUID();
    const br1 = crypto.randomUUID(), br2 = crypto.randomUUID(), br3 = crypto.randomUUID();
    const a1 = crypto.randomUUID(), a2 = crypto.randomUUID();
    async function tenant(t,name) {
      await pool.request().input('t',sql.UniqueIdentifier,t).input('name',sql.NVarChar(160),name)
        .query('INSERT INTO core.Tenant(TenantId,DisplayName) VALUES (@t,@name)');
    }
    async function business(t,b,name) {
      await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
        .input('name',sql.NVarChar(160),name)
        .query('INSERT INTO core.Business(TenantId,BusinessId,DisplayName) VALUES (@t,@b,@name)');
    }
    async function branch(t,b,br,name) {
      await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
        .input('br',sql.UniqueIdentifier,br).input('name',sql.NVarChar(160),name)
        .query('INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName) VALUES (@t,@b,@br,@name)');
    }
    async function account(t,a,username) {
      await pool.request().input('t',sql.UniqueIdentifier,t).input('a',sql.UniqueIdentifier,a)
        .input('user',sql.NVarChar(80),username)
        .query('INSERT INTO core.Account(TenantId,AccountId,Username) VALUES (@t,@a,@user)');
    }
    async function membership(t,b,a) {
      await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
        .input('a',sql.UniqueIdentifier,a)
        .query('INSERT INTO core.BusinessMembership(TenantId,BusinessId,AccountId) VALUES (@t,@b,@a)');
    }
    async function assignment(t,b,br,a) {
      await pool.request().input('t',sql.UniqueIdentifier,t).input('b',sql.UniqueIdentifier,b)
        .input('br',sql.UniqueIdentifier,br).input('a',sql.UniqueIdentifier,a)
        .query('INSERT INTO core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId) VALUES (@t,@b,@br,@a)');
    }
    await tenant(t1,'Tenant Alpha'); await tenant(t2,'Tenant Beta');
    await business(t1,b1,'Alpha'); await business(t1,b3,'Alpha Second'); await business(t2,b2,'Beta');
    await branch(t1,b1,br1,'Front'); await branch(t2,b2,br2,'Other'); await branch(t1,b3,br3,'Other Business');
    await account(t1,a1,'alpha.staff'); await account(t2,a2,'beta.staff');
    await membership(t1,b1,a1); await membership(t2,b2,a2);
    await assignment(t1,b1,br1,a1); await assignment(t2,b2,br2,a2);

    await check('composite FK rejects cross-tenant Branch', () =>
      throwsFk(() => branch(t1,b2,crypto.randomUUID(),'wrong'), 'branch must belong to its Tenant/Business'));
    await check('composite FK rejects account Membership in other Tenant', () =>
      throwsFk(() => membership(t1,b1,a2), 'account tenant must match Business tenant'));
    await check('composite FK rejects assignment into another Business without Membership', () =>
      throwsFk(() => assignment(t1,b3,br3,a1), 'assignment membership must match Business'));
    await check('case-insensitive usernames are globally unique', async () => {
      await assert.rejects(() => account(t2,crypto.randomUUID(),'ALPHA.STAFF'), (err) =>
        /UNIQUE|duplicate|2601|2627/i.test(String(err.message)));
    });
    const repo = new FoundationRepository(pool);
    await check('trusted Account + active Membership + BranchAssignment returns own Branch', async () => {
      const rows = await repo.listActiveAssignedBranches({ accountId:a1, sessionVersion:1 },b1);
      assert.equal(rows.length,1);
      assert.equal(rows[0].branchId.toLowerCase(),br1.toLowerCase());
    });
    await check('Account from another Tenant cannot access requested Business', async () => {
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a2,sessionVersion:1 },b1)).length,0);
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b2)).length,0);
    });
    await check('Business with no explicit active Membership is not accessible', async () => {
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b3)).length,0);
    });
    await check('revoked Business Membership denies next structural read', async () => {
      await pool.request().input('t',sql.UniqueIdentifier,t1).input('b',sql.UniqueIdentifier,b1)
        .query('UPDATE core.BusinessMembership SET IsActive=0 WHERE TenantId=@t AND BusinessId=@b');
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b1)).length,0);
      await pool.request().input('t',sql.UniqueIdentifier,t1).input('b',sql.UniqueIdentifier,b1)
        .query('UPDATE core.BusinessMembership SET IsActive=1 WHERE TenantId=@t AND BusinessId=@b');
    });
    await check('disabled BranchAssignment denies next structural read', async () => {
      await pool.request().input('br',sql.UniqueIdentifier,br1)
        .query('UPDATE core.BranchAssignment SET IsActive=0 WHERE BranchId=@br');
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b1)).length,0);
      await pool.request().input('br',sql.UniqueIdentifier,br1)
        .query('UPDATE core.BranchAssignment SET IsActive=1 WHERE BranchId=@br');
    });
    await check('inactive Tenant denies structural branch visibility', async () => {
      await pool.request().input('t',sql.UniqueIdentifier,t1)
        .query('UPDATE core.Tenant SET IsActive=0 WHERE TenantId=@t');
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b1)).length,0);
      await pool.request().input('t',sql.UniqueIdentifier,t1)
        .query('UPDATE core.Tenant SET IsActive=1 WHERE TenantId=@t');
    });
    await check('inactive Business denies structural branch visibility', async () => {
      await pool.request().input('b',sql.UniqueIdentifier,b1)
        .query('UPDATE core.Business SET IsActive=0 WHERE BusinessId=@b');
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b1)).length,0);
      await pool.request().input('b',sql.UniqueIdentifier,b1)
        .query('UPDATE core.Business SET IsActive=1 WHERE BusinessId=@b');
    });
    await check('inactive Branch denies structural branch visibility', async () => {
      await pool.request().input('br',sql.UniqueIdentifier,br1)
        .query('UPDATE core.Branch SET IsActive=0 WHERE BranchId=@br');
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b1)).length,0);
      await pool.request().input('br',sql.UniqueIdentifier,br1)
        .query('UPDATE core.Branch SET IsActive=1 WHERE BranchId=@br');
    });
    await check('malformed actor, scope or session fails closed before SQL lookup', async () => {
      assert.deepEqual(await repo.listActiveAssignedBranches({accountId:'not-a-uuid',sessionVersion:1},b1),[]);
      assert.deepEqual(await repo.listActiveAssignedBranches({accountId:a1,sessionVersion:0},b1),[]);
      assert.deepEqual(await repo.listActiveAssignedBranches({accountId:a1,sessionVersion:1},'bad-business'),[]);
    });
    await check('session-version mismatch and disabled Account deny reads', async () => {
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:2 },b1)).length,0);
      await pool.request().input('a',sql.UniqueIdentifier,a1)
        .query('UPDATE core.Account SET IsActive=0 WHERE AccountId=@a');
      assert.equal((await repo.listActiveAssignedBranches({ accountId:a1,sessionVersion:1 },b1)).length,0);
      await pool.request().input('a',sql.UniqueIdentifier,a1)
        .query('UPDATE core.Account SET IsActive=1 WHERE AccountId=@a');
    });
    await check('rowversion compare-and-swap refuses stale write', async () => {
      const v = (await pool.request().input('b',sql.UniqueIdentifier,b1)
        .query('SELECT RowVersion FROM core.Business WHERE BusinessId=@b')).recordset[0].RowVersion;
      const update = () => pool.request().input('b',sql.UniqueIdentifier,b1)
        .input('version',sql.VarBinary(8),v)
        .query("UPDATE core.Business SET DisplayName=N'Alpha Updated' WHERE BusinessId=@b AND RowVersion=@version");
      assert.equal((await update()).rowsAffected[0],1);
      assert.equal((await update()).rowsAffected[0],0);
    });
    await check('CONNECT-only app SQL login cannot SELECT core data', async () => {
      const login = 'drvo_k4_ci_restricted_app';
      const pass = 'DrvoCI!' + crypto.randomBytes(24).toString('hex');
      await admin.query(`CREATE LOGIN [${login}] WITH PASSWORD=N'${pass}', CHECK_POLICY=ON, CHECK_EXPIRATION=OFF`);
      await pool.query(`CREATE USER [${login}] FOR LOGIN [${login}]; GRANT CONNECT TO [${login}]`);
      const restricted = await connect({...cfg,user:login,password:pass});
      try {
        await assert.rejects(() => restricted.query('SELECT COUNT(*) AS cnt FROM core.Account'),(err) =>
          /SELECT permission|permission was denied|229/i.test(String(err.message)));
      } finally {
        await restricted.close();
      }
    });
    await check('NestJS staging DB service refuses missing migrations and connects with read-only user', async () => {
      const dbname = 'DRVO_ERP_STAGING'; // throwaway database inside disposable CI SQL only
      const login = 'drvo_k4b_ci_app';
      const password = 'DrvoCi!' + crypto.randomBytes(24).toString('hex');
      await admin.query(`CREATE DATABASE [${dbname}]`);
      await admin.query(`CREATE LOGIN [${login}] WITH PASSWORD=N'${password}', CHECK_POLICY=ON, CHECK_EXPIRATION=OFF`);
      const stage = await connect({...cfg,database:dbname});
      const saved = Object.fromEntries(['DRVO_SQL_ENABLED','DRVO_SQL_HOST','DRVO_SQL_PORT',
        'DRVO_SQL_DATABASE','DRVO_SQL_USER','DRVO_SQL_PASSWORD'].map(k => [k,process.env[k]]));
      try {
        await stage.query(`CREATE USER [${login}] FOR LOGIN [${login}]; GRANT CONNECT TO [${login}]`);
        Object.assign(process.env, {
          DRVO_SQL_ENABLED:'YES', DRVO_SQL_HOST:'127.0.0.1', DRVO_SQL_PORT:'1433',
          DRVO_SQL_DATABASE:dbname, DRVO_SQL_USER:login, DRVO_SQL_PASSWORD:password,
        });
        const before = new FoundationDatabaseService();
        await assert.rejects(() => before.onModuleInit(), /staging SQL not ready/);
        await applyMigrations(stage, undefined, 1);
        await stage.query(`GRANT SELECT ON OBJECT::core.SchemaMigration TO [${login}]`);
        const db = new FoundationDatabaseService();
        await db.onModuleInit();
        assert.deepEqual(await db.checkReadiness(),{status:'ok',service:'drvo-api',database:'ready'});
        await db.onModuleDestroy();
        await assert.rejects(() => db.checkReadiness(), /DRVO SQL is not ready/);
      } finally {
        await stage.close();
        for(const [key,value] of Object.entries(saved)){
          if(value === undefined) delete process.env[key];
          else process.env[key]=value;
        }
      }
    });
    await check('backup and independent restore reproduce foundation schema/data', async () => {
      await pool.close(); pool=undefined;
      const file='/var/opt/mssql/data/drvo_k4_disposable_backup.bak';
      await admin.query(`BACKUP DATABASE [${CI_DB}] TO DISK=N'${file}' WITH INIT, CHECKSUM`);
      const meta=await admin.query(`RESTORE FILELISTONLY FROM DISK=N'${file}'`);
      const data=meta.recordset.find((x)=>x.Type==='D');
      const log=meta.recordset.find((x)=>x.Type==='L');
      assert.ok(data && log);
      function quoteSql(s) { return String(s).replaceAll("'", "''"); }
      await admin.query(`
        RESTORE DATABASE [${restoredDb}] FROM DISK=N'${file}'
          WITH MOVE N'${quoteSql(data.LogicalName)}' TO N'/var/opt/mssql/data/${restoredDb}.mdf',
               MOVE N'${quoteSql(log.LogicalName)}' TO N'/var/opt/mssql/data/${restoredDb}_log.ldf',
               REPLACE, CHECKSUM, RECOVERY
      `);
      const restored=await connect({ ...cfg,database:restoredDb });
      try {
        const rows=await restored.query('SELECT COUNT(*) AS TenantCount FROM core.Tenant');
        assert.equal(rows.recordset[0].TenantCount,2);
        const versions=await restored.query('SELECT COUNT(*) AS MigrationCount FROM core.SchemaMigration');
        assert.equal(versions.recordset[0].MigrationCount,1);
      } finally { await restored.close(); }
    });
    console.log(`K4 integration complete: ${checks} SQL checks passed in disposable container`);
  } finally {
    if (pool) await pool.close().catch(()=>{});
    if (admin) await admin.close().catch(()=>{});
  }
}

main().catch((error)=>{
  console.error('K4 SQL integration FAILED:',error instanceof Error?error.message:'unknown');
  process.exitCode=1;
});

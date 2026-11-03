'use strict';
// Root-only, one-time local SQL bootstrap for a DB-scoped migrator.
// Existing SQL Admin password stays in process environment and is never persisted.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const sql=require('mssql');
const NAME='drvo_erp_stage_migrator';
const DB='DRVO_ERP_STAGING';
const OUT='/etc/drvo-erp/staging-db-automation.env';
const BASE={server:'127.0.0.1',port:1433,connectionTimeout:5000,requestTimeout:30000,
  options:{encrypt:true,trustServerCertificate:true},pool:{min:0,max:2}};
async function connect(user,password,database) {
  const pool=new sql.ConnectionPool({...BASE,user,password,database});
  await pool.connect();return pool;
}
async function main(){
  assert.equal(process.getuid?.(),0,'Only root may provision SQL migrator');
  assert.equal(process.env.DRVO_DB_BOOTSTRAP,'YES','Explicit bootstrap required');
  const login=process.env.DRVO_DB_ADMIN_LOGIN||'sa';
  const secret=process.env.DRVO_DB_ADMIN_PASSWORD;
  assert.match(login,/^[a-zA-Z0-9_.-]{1,64}$/);
  assert.ok(secret && secret.length>0,'SQL Admin secret was not supplied');
  assert.ok(!fs.existsSync(OUT),'Existing migration secret must not be overwritten');
  const app=fs.lstatSync('/etc/drvo-erp/staging-sql.env');
  assert.ok(app.isFile()&&!app.isSymbolicLink()&&app.uid===0&&
    (app.mode & 0o777)===0o600,'K4 application SQL secret is not protected');
  let master,db,migrator;
  const password='DrvoDb!'+crypto.randomBytes(32).toString('hex');
  try{
    master=await connect(login,secret,'master');
    const existing=await master.request().query(`
      SELECT DB_ID(N'DRVO_ERP_STAGING') AS Stage,
        SUSER_ID(N'drvo_erp_stage_migrator') AS LoginExists
    `);
    assert.ok(existing.recordset[0].Stage!=null,'DRVO stage DB must already exist');
    assert.equal(existing.recordset[0].LoginExists,null,'SQL migration login exists: inspect rather than overwrite');
    db=await connect(login,secret,DB);
    const pre=await db.request().query(`
      SELECT COUNT_BIG(*) AS Present FROM core.SchemaMigration
      WHERE MigrationId=N'001_platform_identity_foundation.sql'
    `);
    assert.equal(Number(pre.recordset[0].Present),1,'K4 migration must be applied already');
    // The initial operator install also finishes the already-tested K5A
    // migration with the existing interactive administrator credential.
    const migrationName='002_identity_sessions_and_roles.sql';
    const source=fs.readFileSync(path.resolve('/srv/drvo-erp/repo/db/migrations',migrationName));
    const checksum=crypto.createHash('sha256').update(source).digest('hex');
    const existingK5=await db.request()
      .input('name',sql.NVarChar(160),migrationName)
      .query('SELECT Checksum FROM core.SchemaMigration WHERE MigrationId=@name');
    if(existingK5.recordset.length){
      assert.equal(existingK5.recordset[0].Checksum,checksum,'K5A live checksum mismatch');
      console.log('PASS: existing K5A staging migration already matches approved SQL');
    }else{
      process.env.DRVO_K5_ADMIN_LOGIN=login;
      process.env.DRVO_K5_ADMIN_PASSWORD=secret;
      process.env.DRVO_K5_OPERATOR_APPLY='YES';
      try{
        await require('/srv/drvo-erp/repo/ops/staging/k5a-sql-apply.cjs').main();
      }finally{
        delete process.env.DRVO_K5_ADMIN_LOGIN;
        delete process.env.DRVO_K5_ADMIN_PASSWORD;
        delete process.env.DRVO_K5_OPERATOR_APPLY;
      }
      console.log('PASS: K5A backed up, independently restored and migrated during one-time install');
    }
    const defaultPassword=password.replaceAll("'","''");
    await master.request().batch(`
      CREATE LOGIN [drvo_erp_stage_migrator] WITH PASSWORD=N'${defaultPassword}',
      CHECK_POLICY=ON,CHECK_EXPIRATION=OFF,DEFAULT_DATABASE=[DRVO_ERP_STAGING];
    `);
    await db.request().batch(`
      CREATE USER [drvo_erp_stage_migrator] FOR LOGIN [drvo_erp_stage_migrator];
      ALTER ROLE db_ddladmin ADD MEMBER [drvo_erp_stage_migrator];
      ALTER ROLE db_backupoperator ADD MEMBER [drvo_erp_stage_migrator];
      GRANT SELECT, INSERT ON OBJECT::core.SchemaMigration TO [drvo_erp_stage_migrator];
      GRANT CONTROL ON SCHEMA::core TO [drvo_erp_stage_migrator];
    `);
    migrator=await connect(NAME,password,DB);
    const permissions=await migrator.query(`
      SELECT DB_NAME() AS CurrentDb,
        IS_SRVROLEMEMBER('sysadmin') AS Sysadmin,
        IS_SRVROLEMEMBER('dbcreator') AS Dbcreator,
        IS_ROLEMEMBER('db_owner') AS Owner,
        IS_ROLEMEMBER('db_ddladmin') AS Ddl,
        IS_ROLEMEMBER('db_backupoperator') AS BackupRole
    `);
    const p=permissions.recordset[0];
    assert.equal(p.CurrentDb,DB);
    assert.equal(Number(p.Sysadmin),0);
    assert.equal(Number(p.Dbcreator),0);
    assert.equal(Number(p.Owner),0);
    assert.equal(Number(p.Ddl),1);
    assert.equal(Number(p.BackupRole),1);
    const output=[
      'SQL_HOST=127.0.0.1',
      'SQL_PORT=1433',
      'SQL_DATABASE=DRVO_ERP_STAGING',
      'SQL_USER=drvo_erp_stage_migrator',
      'SQL_PASSWORD='+password,'',
    ].join('\n');
    fs.writeFileSync(OUT,output,{flag:'wx',mode:0o600});
    fs.chmodSync(OUT,0o600);
    console.log('PASS: existing DRVO_ERP_STAGING only; no other SQL database modified');
    console.log('PASS: new SQL migration principal limited to database DDL + backup');
    console.log('PASS: SQL secret written root-only; existing application SQL identity unaffected');
  }finally{
    await migrator?.close().catch(()=>{});
    await db?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
if(require.main===module){
  main().catch(error=>{
    console.error('DRVO DB BOOTSTRAP FAILED:',error instanceof Error?
      String(error.message).slice(0,250):'Unknown error');
    process.exitCode=1;
  });
}
module.exports={main};

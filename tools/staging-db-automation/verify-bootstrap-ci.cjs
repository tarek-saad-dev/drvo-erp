'use strict';
// CI-only one-time bootstrap proof: root local admin (disposable SQL), K5A
// pre/post independent restore and a new DB-scoped DDL+backup SQL principal.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');

async function open(user,password,database){
  const p=new sql.ConnectionPool({
    server:'127.0.0.1',port:1433,user,password,database,
    options:{encrypt:true,trustServerCertificate:true},
    connectionTimeout:5000,requestTimeout:120000,pool:{min:0,max:2},
  });
  await p.connect();return p;
}
async function main(){
  assert.equal(process.env.GITHUB_ACTIONS,'true');
  assert.equal(process.env.DRVO_DB_CI_DISPOSABLE,'YES');
  assert.equal(process.getuid?.(),0);
  const password=process.env.SQL_TEST_SA_PASSWORD;
  assert.ok(password?.length>=12);
  let master;
  for(let i=0;i<45;i++){
    try{master=await open('sa',password,'master');await master.query('SELECT 1');break;}
    catch(e){await master?.close().catch(()=>{});if(i===44)throw e;await new Promise(r=>setTimeout(r,3000));}
  }
  let stage,limited,testApp;
  try{
    await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
    stage=await open('sa',password,'DRVO_ERP_STAGING');
    const appPass='DrvoStageCi!'+crypto.randomBytes(24).toString('hex');
    await master.query(`CREATE LOGIN [drvo_erp_stage_app]
      WITH PASSWORD=N'${appPass}',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    await stage.query(`CREATE USER [drvo_erp_stage_app] FOR LOGIN [drvo_erp_stage_app];
      GRANT CONNECT TO [drvo_erp_stage_app]`);
    assert.deepEqual((await applyMigrations(stage,undefined,1)).map(x=>x.status),['applied']);
    fs.mkdirSync('/etc/drvo-erp',{recursive:true,mode:0o700});
    fs.writeFileSync('/etc/drvo-erp/staging-sql.env',
      ['DRVO_SQL_HOST=127.0.0.1','DRVO_SQL_PORT=1433',
       'DRVO_SQL_DATABASE=DRVO_ERP_STAGING','DRVO_SQL_USER=drvo_erp_stage_app',
       'DRVO_SQL_PASSWORD='+appPass,''].join('\\n'),
      {mode:0o600});
    fs.chmodSync('/etc/drvo-erp/staging-sql.env',0o600);

    process.env.DRVO_DB_BOOTSTRAP='YES';
    process.env.DRVO_DB_ADMIN_LOGIN='sa';
    process.env.DRVO_DB_ADMIN_PASSWORD=password;
    try{
      await require('../../ops/staging/db-automation/sql-bootstrap.cjs').main();
    }finally{
      delete process.env.DRVO_DB_BOOTSTRAP;
      delete process.env.DRVO_DB_ADMIN_LOGIN;
      delete process.env.DRVO_DB_ADMIN_PASSWORD;
    }
    const secret=fs.readFileSync('/etc/drvo-erp/staging-db-automation.env','utf8');
    const loginPass=secret.match(/^SQL_PASSWORD=(.+)$/m)?.[1];
    assert.ok(loginPass?.length>=12);
    limited=await open('drvo_erp_stage_migrator',loginPass,'DRVO_ERP_STAGING');
    const privileges=await limited.query(`SELECT
      IS_SRVROLEMEMBER('sysadmin') AS ServerAdmin,
      IS_SRVROLEMEMBER('dbcreator') AS DbCreator,
      IS_ROLEMEMBER('db_owner') AS DbOwner,
      IS_ROLEMEMBER('db_ddladmin') AS DdlAdmin,
      IS_ROLEMEMBER('db_backupoperator') AS BackupOperator,
      HAS_PERMS_BY_NAME('core','SCHEMA','CONTROL') AS SchemaControl`);
    const row=privileges.recordset[0];
    for(const key of ['ServerAdmin','DbCreator','DbOwner']) assert.equal(Number(row[key]),0);
    for(const key of ['DdlAdmin','BackupOperator','SchemaControl']) assert.equal(Number(row[key]),1);
    const history=await limited.query('SELECT MigrationId FROM core.SchemaMigration');
    assert.deepEqual(history.recordset.map(x=>x.MigrationId).sort(),
      ['001_platform_identity_foundation.sql','002_identity_sessions_and_roles.sql']);
    // Test that future migrations may grant runtime access only within core.
    await master.query(`CREATE LOGIN [drvo_db_auto_ci_app] WITH
      PASSWORD=N'DrvoDbCi!123456789012345678901234',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    await stage.query(`CREATE USER [drvo_db_auto_ci_app] FOR LOGIN [drvo_db_auto_ci_app]`);
    await limited.query(`GRANT SELECT ON OBJECT::core.BranchRole TO [drvo_db_auto_ci_app]`);
    const permission=await stage.query(`SELECT HAS_PERMS_BY_NAME('core.BranchRole','OBJECT','SELECT') AS ok`);
    assert.equal(Number(permission.recordset[0].ok),1);
    console.log('DRVO DB BOOTSTRAP CI PASS: K5 backup/restores, DB-only migrator and core-schema grant');
  }finally{
    await testApp?.close().catch(()=>{});
    await limited?.close().catch(()=>{});
    await stage?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
main().catch(err=>{
  console.error('DRVO DB ROOT BOOTSTRAP CI FAILED:',err instanceof Error?err.message.slice(0,350):'unknown');
  process.exitCode=1;
});

'use strict';
// Isolated SQL Server 2022 integration test for the SAME immutable SQL-only
// receive-sql.js engine used by forced SSH on VPS; never touches live systems.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const sql=require('../../apps/api/node_modules/mssql');
const {createPayload}=require('../../ops/staging/db-automation/build-payload.cjs');
const {run,validatePayload}=require('../../ops/staging/db-automation/receive-sql.cjs');
const {applyMigrations}=require('../k4-db/migrate.cjs');

const SHA='1'.repeat(40);
const DB='DRVO_ERP_STAGING';
const LOGIN='drvo_erp_stage_migrator';
const pass='DrvoDBCI!'+crypto.randomBytes(24).toString('hex');
const adminPass=process.env.SQL_TEST_SA_PASSWORD;
assert.equal(process.env.DRVO_DB_CI_DISPOSABLE,'YES');
assert.equal(process.env.DRVO_DB_CI_PORT,'14337');
assert.ok(adminPass?.length>=12);
const base={
  server:'127.0.0.1',port:14337,options:{encrypt:true,trustServerCertificate:true},
  pool:{min:0,max:2},connectionTimeout:5000,requestTimeout:120000,
};
async function connect(user,password,database){
  const pool=new sql.ConnectionPool({...base,user,password,database});
  await pool.connect();return pool;
}
async function initMaster(){
  let master;
  for(let attempt=0;attempt<45;attempt++){
    try{
      master=await connect('sa',adminPass,'master');
      await master.query('SELECT 1');
      return master;
    }catch(err){
      await master?.close().catch(()=>{});
      if(attempt===44)throw err;
      await new Promise(resolve=>setTimeout(resolve,3000));
    }
  }
  throw new Error('SQL test container unavailable');
}
async function main(){
  const payload=createPayload(process.cwd(),SHA);
  assert.equal(payload.format,'drvo-erp-sql-v1');
  assert.equal(payload.migrations.length>=2,true,'Expect K4+K5 foundation migrations');
  const mutations=structuredClone(payload);
  mutations.migrations[0].sha256='0'.repeat(64);
  assert.throws(()=>validatePayload(mutations,SHA),/invalid|hash/i);
  assert.throws(()=>validatePayload({...payload,sha:'f'.repeat(40)},SHA),/identity/);
  assert.throws(()=>validatePayload({...payload,migrations:[...payload.migrations].reverse()},SHA),/numbering/);
  console.log('PASS: SQL manifest SHA, ordering, and checksum tampering fail closed');

  let master,admin,restricted,restored;
  try{
    master=await initMaster();
    await master.query(`CREATE DATABASE [${DB}]`);
    await master.query(`CREATE LOGIN [${LOGIN}] WITH PASSWORD=N'${pass}',CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    admin=await connect('sa',adminPass,DB);
    const init=await applyMigrations(admin,undefined,1);
    assert.deepEqual(init.map(x=>x.status),['applied']);
    await admin.query(`
      CREATE USER [${LOGIN}] FOR LOGIN [${LOGIN}];
      ALTER ROLE db_ddladmin ADD MEMBER [${LOGIN}];
      ALTER ROLE db_backupoperator ADD MEMBER [${LOGIN}];
      GRANT SELECT,INSERT ON OBJECT::core.SchemaMigration TO [${LOGIN}];
    `);
    restricted=await connect(LOGIN,pass,DB);
    const result=await run(restricted,payload.migrations,SHA);
    assert.ok(result.pending>=1);
    assert.ok(result.backupFile?.startsWith('/var/opt/mssql/data/drvo_erp_stage_auto_'));
    console.log('PASS: restricted SQL login runs backup then forward-only migrations');

    const check=await admin.query(`SELECT COUNT(*) AS n FROM core.SchemaMigration`);
    assert.equal(check.recordset[0].n,payload.migrations.length);
    const noOp=await run(restricted,payload.migrations,SHA);
    assert.equal(noOp.pending,0);
    assert.equal(noOp.backupFile,null);
    console.log('PASS: repeated migration is a safe no-op without another backup');

    const altered=structuredClone(payload.migrations);
    altered[1].sql+='\n-- malicious edit';
    altered[1].sha256=crypto.createHash('sha256').update(altered[1].sql).digest('hex');
    await assert.rejects(()=>run(restricted,altered,SHA),/drift/);
    console.log('PASS: historical SQL edit rejected, no replacement migration');

    const perms=await restricted.query(`SELECT
      IS_ROLEMEMBER('db_ddladmin') AS Ddl,
      IS_ROLEMEMBER('db_backupoperator') AS BackupRole,
      IS_ROLEMEMBER('db_owner') AS Owner,
      IS_SRVROLEMEMBER('sysadmin') AS Sysadmin,
      IS_SRVROLEMEMBER('dbcreator') AS Dbcreator`);
    for(const flag of ['Ddl','BackupRole'])assert.equal(Number(perms.recordset[0][flag]),1);
    for(const flag of ['Owner','Sysadmin','Dbcreator'])assert.equal(Number(perms.recordset[0][flag]),0);
    console.log('PASS: DB-only DDL+backup roles, no SQL server creator/admin access');

    const preFile=result.backupFile;
    await master.query(`RESTORE VERIFYONLY FROM DISK=N'${preFile}' WITH CHECKSUM`);
    const filelist=await master.query(`RESTORE FILELISTONLY FROM DISK=N'${preFile}'`);
    const files=filelist.recordset;
    assert.ok(files.length>=2);
    const moves=files.map((f,i)=>{
      const ext=f.Type==='L'?'ldf':i===0?'mdf':'ndf';
      return `MOVE N'${f.LogicalName}' TO N'/var/opt/mssql/data/DrvoDbAutoCIBack_${i}.${ext}'`;
    });
    await master.query(`RESTORE DATABASE [DrvoDbAutoCIBack] FROM DISK=N'${preFile}'
      WITH ${moves.join(', ')},CHECKSUM,RECOVERY`);
    restored=await connect('sa',adminPass,'DrvoDbAutoCIBack');
    const history=await restored.query('SELECT COUNT(*) AS n FROM core.SchemaMigration');
    assert.equal(history.recordset[0].n,1,'Backup must reflect pre-migration K4 state');
    console.log('PASS: real SQL COPY_ONLY backup independently RESTORED to second database');
    console.log('DRVO DB AUTOMATION DISPOSABLE SQL E2E: PASS');
  }finally{
    await restored?.close().catch(()=>{});
    await restricted?.close().catch(()=>{});
    await admin?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
main().catch(err=>{
  console.error('DRVO DB AUTO CI FAILED:',err instanceof Error?err.message.slice(0,280):'unknown');
  process.exitCode=1;
});

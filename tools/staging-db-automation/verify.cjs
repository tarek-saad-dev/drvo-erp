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
      GRANT CONTROL ON SCHEMA::core TO [${LOGIN}];
    `);
    restricted=await connect(LOGIN,pass,DB);
    // P4: recreate EXACT pre-activation K5F 001–009 state using the SAME
    // restricted migrator, then prove that 010–017 are forward-only and
    // recoverable. This is disposable CI; NO production migration is invoked.
    const k5fBaseline=await run(restricted,payload.migrations.slice(0,9),SHA);
    assert.equal(k5fBaseline.pending,8);
    const before=await admin.query(
      "SELECT MigrationId,Checksum FROM core.SchemaMigration ORDER BY MigrationId");
    assert.equal(before.recordset.length,9);
    assert.deepEqual(before.recordset.map(x=>x.MigrationId),
      payload.migrations.slice(0,9).map(x=>x.name));
    assert.deepEqual(before.recordset.map(x=>x.Checksum),
      payload.migrations.slice(0,9).map(x=>x.sha256));
    const result=await run(restricted,payload.migrations,SHA);
    assert.equal(result.pending,8,'P4 must apply only migrations 010–017');
    assert.ok(result.backupFile?.startsWith('/var/opt/mssql/data/drvo_erp_stage_auto_'));
    console.log('PASS P4: same restricted migration runner upgrades exact K5F 001–009 to 010–017');
    const ownerClaim=await admin.query(`
      SELECT USER_NAME(execute_as_principal_id) AS executor
      FROM sys.sql_modules WHERE object_id=OBJECT_ID(N'core.ClaimApprovedOwner')
    `);
    assert.equal(ownerClaim.recordset[0]?.executor,LOGIN,
      'Owner claim procedure must run as scoped migrator, never dbo/sysadmin');
    console.log('PASS: Owner claim SQL executor is restricted DB migration identity');

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
    assert.equal(history.recordset[0].n,9,'P4 pre-upgrade backup must contain exact K5F 001–009');
    const preSql=await restored.query(
      "SELECT MigrationId,Checksum FROM core.SchemaMigration ORDER BY MigrationId");
    assert.deepEqual(preSql.recordset,before.recordset,
      'P4 pre-upgrade restore must preserve all nine K5F migration hashes');
    const noFuture=await restored.query(
      "SELECT OBJECT_ID(N'core.BookingAppointment',N'U') AS Booking, "+
      "OBJECT_ID(N'core.CatalogOffering',N'U') AS Catalog, "+
      "OBJECT_ID(N'core.PosDraft',N'U') AS Draft");
    assert.ok(Object.values(noFuture.recordset[0]).every(v=>v===null),
      'P4 pre-010 restore must not contain later Business schema');
    console.log('PASS P4: isolated pre-010 COPY_ONLY restore preserves exact K5F baseline');

    // K5F-3: second, AFTER-migrations independent restore on disposable CI ONLY.
    // This proves recoverability of the SQL 017 source schema; it is NOT
    // an offsite/VPS disaster-recovery run or operator authorization.
    const postName='DRVO_ERP_CI_POSTRESTORE';
    const postFile='/var/opt/mssql/data/drvo_erp_ci_post_017_checksum.bak';
    const collision=await master.query("SELECT DB_ID(N'"+postName+"') AS id");
    assert.equal(collision.recordset[0].id,null,'Post-restore target collision');
    await admin.query(`BACKUP DATABASE [${DB}] TO DISK=N'${postFile}'
      WITH COPY_ONLY,CHECKSUM,INIT`);
    await master.query(`RESTORE VERIFYONLY FROM DISK=N'${postFile}' WITH CHECKSUM`);
    const postList=await master.query(`RESTORE FILELISTONLY FROM DISK=N'${postFile}'`);
    assert.ok(postList.recordset.length>=2);
    const postMoves=postList.recordset.map((f,i)=>{
      assert.ok(f.LogicalName && ['D','L'].includes(f.Type));
      const ext=f.Type==='L'?'ldf':i===0?'mdf':'ndf';
      return `MOVE N'${f.LogicalName.replaceAll("'","''")}'
        TO N'/var/opt/mssql/data/drvo_erp_ci_post_017_${i}.${ext}'`;
    });
    await master.query(`RESTORE DATABASE [${postName}] FROM DISK=N'${postFile}'
      WITH ${postMoves.join(', ')},CHECKSUM,RECOVERY`);
    const post=await connect('sa',adminPass,postName);
    try{
      const original=await admin.query(
        "SELECT MigrationId,Checksum FROM core.SchemaMigration ORDER BY MigrationId");
      const recovered=await post.query(
        "SELECT MigrationId,Checksum FROM core.SchemaMigration ORDER BY MigrationId");
      assert.equal(recovered.recordset.length,payload.migrations.length);
      assert.deepEqual(recovered.recordset,original.recordset,
        'Restored migrations must preserve exact IDs and checksums');
      const entities=await post.query(`
        SELECT
          OBJECT_ID(N'core.PosDraft',N'U') AS DraftTable,
          OBJECT_ID(N'core.PosDraftLine',N'U') AS LineTable,
          OBJECT_ID(N'core.CreateBranchPosDraft',N'P') AS CreateProc,
          OBJECT_ID(N'core.ReadBranchPosDrafts',N'P') AS ReadProc
      `);
      for(const v of Object.values(entities.recordset[0]))
        assert.ok(v!=null,'Missing post-restore POS scoped object');
      const constraints=await post.query(`
        SELECT name FROM sys.foreign_keys
        WHERE parent_object_id=OBJECT_ID(N'core.PosDraftLine')
      `);
      assert.ok(constraints.recordset.some(x=>x.name==='FK_PosDraftLine_Draft'));
      assert.ok(constraints.recordset.some(x=>x.name==='FK_PosDraftLine_Offering'));
      const status=await post.query(`
        SELECT definition FROM sys.check_constraints
        WHERE name=N'CK_PosDraft_Status'
      `);
      assert.equal(status.recordset.length,1);
      assert.match(status.recordset[0].definition,/DRAFT/);
      const postBooking=await post.query(
        "SELECT OBJECT_ID(N'core.BookingWindowCloseAudit',N'U') AS CloseAudit, "+
        "OBJECT_ID(N'core.BookingResourceWindow',N'U') AS Windows, "+
        "OBJECT_ID(N'core.CloseBookingResourceWindow',N'P') AS CloseProc, "+
        "OBJECT_ID(N'core.ChangeBookingAppointmentStatus',N'P') AS LifecycleProc");
      for(const v of Object.values(postBooking.recordset[0]))
        assert.ok(v!==null,'Missing post-017 Booking lifecycle/window object');
      const closedState=await post.query(
        "SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'core.BookingResourceWindow') "+
        "AND name=N'State'");
      assert.equal(closedState.recordset.length,1);
      console.log('PASS P4: independently restored post-017 SQL history, Booking lifecycle, POS DRAFT');
    }finally{
      await post.close();
      await master.query(`ALTER DATABASE [${postName}]
        SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${postName}]`);
    }
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

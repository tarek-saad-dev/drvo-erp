'use strict';
// One-time guarded K5A migration and runtime permissions. Only DRVO_ERP_STAGING.
// No new SQL login, no customer records, no public authentication enablement.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const sql=require('../../apps/api/node_modules/mssql');
const {readManifest,applyMigrations}=require('../../tools/k4-db/migrate.cjs');

const STAGE='DRVO_ERP_STAGING';
const APP_LOGIN='drvo_erp_stage_app';
const ADMIN=process.env.DRVO_K5_ADMIN_LOGIN || 'sa';
const ADMIN_SECRET=process.env.DRVO_K5_ADMIN_PASSWORD;
const DIR='/var/opt/mssql/data';
const APP_ENV='/etc/drvo-erp/staging-sql.env';
const K4_TABLES=['core.Account','core.Branch','core.BranchAssignment','core.Business',
  'core.BusinessMembership','core.SchemaMigration','core.Tenant'];
const K5_TABLES=['core.AccountCredential','core.AuthSession','core.BranchRole','core.BusinessRole',
  'core.LoginThrottle','core.RolePermission','core.SecurityAudit'];
const FULL=[...K4_TABLES,...K5_TABLES].sort();
function q(s){return String(s).replaceAll("'","''");}
function safeId(name){assert.match(name,/^[a-zA-Z0-9_]{1,100}$/);return '['+name+']';}
function inputs(){
  assert.equal(process.getuid?.(),0,'K5 operator tool must run as root');
  assert.equal(process.env.DRVO_K5_OPERATOR_APPLY,'YES','Explicit K5 operator consent required');
  assert.match(ADMIN,/^[a-zA-Z0-9_.-]{1,64}$/);
  assert.ok(ADMIN_SECRET && ADMIN_SECRET.length > 0,'Existing SQL administrator password required');
  const stat=fs.lstatSync(APP_ENV);
  assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.uid===0&&(stat.mode&0o777)===0o600);
  const lines=fs.readFileSync(APP_ENV,'utf8').split(/\r?\n/).filter(Boolean).map(line=>{
    const pos=line.indexOf('=');assert.ok(pos>0);return [line.slice(0,pos),line.slice(pos+1)];
  });
  const app=Object.fromEntries(lines);
  assert.equal(app.DRVO_SQL_HOST,'127.0.0.1');
  assert.equal(app.DRVO_SQL_PORT,'1433');
  assert.equal(app.DRVO_SQL_DATABASE,STAGE);
  assert.equal(app.DRVO_SQL_USER,APP_LOGIN);
  assert.ok(app.DRVO_SQL_PASSWORD && app.DRVO_SQL_PASSWORD.length>12);
  assert.deepEqual(readManifest().map(x=>x.filename),[
    '001_platform_identity_foundation.sql',
    '002_identity_sessions_and_roles.sql'
  ],'Unreviewed migration detected; refuse');
  assert.ok(fs.statSync(DIR).isDirectory(),'Expected local SQL backup/restore directory missing');
  return app;
}
const BASE={server:'127.0.0.1',port:1433,
  options:{encrypt:true,trustServerCertificate:true},
  connectionTimeout:5000,requestTimeout:120000,pool:{min:0,max:2}};
async function connect(user,password,database){
  const p=new sql.ConnectionPool({...BASE,user,password,database});
  await p.connect();return p;
}
async function tables(pool){
  const r=await pool.query(`SELECT s.name+'.'+t.name AS name FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id=t.schema_id ORDER BY s.name,t.name`);
  return r.recordset.map(x=>x.name);
}
async function migrationRows(pool){
  const r=await pool.query(`SELECT MigrationId FROM core.SchemaMigration ORDER BY MigrationId`);
  return r.recordset.map(x=>x.MigrationId);
}
async function backup(master,tag,nonce){
  const file=`${DIR}/drvo_k5_${nonce}_${tag}.bak`;
  await master.query(`BACKUP DATABASE [${STAGE}] TO DISK=N'${q(file)}'
    WITH INIT,COPY_ONLY,CHECKSUM`);
  await master.query(`RESTORE VERIFYONLY FROM DISK=N'${q(file)}' WITH CHECKSUM`);
  console.log('PASS: checksum backup verified: '+tag+' '+file);
  return file;
}
async function restoreProof(master,filename,expectedTables,expectedMigrations,nonce,phase){
  const db='DRVO_K5_RESTORE_'+nonce+'_'+phase;
  assert.equal((await master.query(`SELECT DB_ID(N'${db}') AS id`)).recordset[0].id,null,
    'Collision with pre-existing database; refuse');
  const meta=await master.query(`RESTORE FILELISTONLY FROM DISK=N'${q(filename)}'`);
  assert.ok(meta.recordset.length>0);
  const moves=meta.recordset.map((item,i)=>{
    assert.ok(item.LogicalName && ['D','L'].includes(item.Type));
    const ext=item.Type==='L'?'ldf':i===0?'mdf':'ndf';
    return `MOVE N'${q(item.LogicalName)}' TO N'${DIR}/${db}_${i}.${ext}'`;
  });
  let restored=false,probe;
  try{
    await master.query(`RESTORE DATABASE ${safeId(db)} FROM DISK=N'${q(filename)}'
      WITH ${moves.join(', ')},CHECKSUM,RECOVERY`);
    restored=true;
    probe=await connect(ADMIN,ADMIN_SECRET,db);
    assert.deepEqual(await tables(probe),expectedTables);
    assert.deepEqual(await migrationRows(probe),expectedMigrations);
    console.log('PASS: independent backup restore verified: '+phase);
  }finally{
    await probe?.close().catch(()=>{});
    if(restored){
      await master.query(`ALTER DATABASE ${safeId(db)}
        SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${safeId(db)};`);
    }
  }
}
async function grantRuntime(db){
  const user=await db.query(`SELECT USER_ID(N'${APP_LOGIN}') AS appId`);
  assert.ok(user.recordset[0].appId!=null);
  const read=[...K4_TABLES,...K5_TABLES.filter(x=>x!=='core.SecurityAudit')];
  for(const table of read) {
    assert.match(table,/^core\.[A-Za-z]+$/);
    await db.query(`GRANT SELECT ON OBJECT::${table} TO [${APP_LOGIN}]`);
  }
  for(const table of ['core.AuthSession','core.LoginThrottle','core.SecurityAudit']){
    await db.query(`GRANT INSERT ON OBJECT::${table} TO [${APP_LOGIN}]`);
  }
  await db.query(`GRANT UPDATE (RevokedAtUtc) ON OBJECT::core.AuthSession TO [${APP_LOGIN}]`);
  await db.query(`GRANT UPDATE (FailedCount,WindowStartedUtc) ON OBJECT::core.LoginThrottle TO [${APP_LOGIN}]`);
  await db.query(`GRANT UPDATE (SessionVersion) ON OBJECT::core.Account TO [${APP_LOGIN}]`);
  await db.query(`GRANT UPDATE (Salt,PasswordHash,PasswordAlgorithm,MustChangePassword,PasswordChangedAtUtc)
    ON OBJECT::core.AccountCredential TO [${APP_LOGIN}]`);
}
async function verifyApp(app){
  const p=await connect(APP_LOGIN,app.DRVO_SQL_PASSWORD,STAGE);
  try{
    const r=await p.query(`
      SELECT DB_NAME() AS db,
      IS_ROLEMEMBER('db_owner') AS owner,
      IS_ROLEMEMBER('db_ddladmin') AS ddladmin,
      IS_ROLEMEMBER('db_datawriter') AS datawriter,
      HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS createTable,
      HAS_PERMS_BY_NAME('core.Business','OBJECT','UPDATE') AS businessWrite,
      HAS_PERMS_BY_NAME('core.AccountCredential','OBJECT','SELECT') AS readCredentials,
      HAS_PERMS_BY_NAME('core.RolePermission','OBJECT','SELECT') AS readRole
    `);
    const x=r.recordset[0];assert.equal(x.db,STAGE);
    for(const k of ['owner','ddladmin','datawriter','createTable','businessWrite']){
      assert.equal(Number(x[k]??0),0,'Overprivileged existing application login: '+k);
    }
    assert.equal(Number(x.readCredentials),1);
    assert.equal(Number(x.readRole),1);
    const row=await p.query(`SELECT COUNT(*) AS applied FROM core.SchemaMigration`);
    assert.equal(Number(row.recordset[0].applied),2);
    await assert.rejects(()=>p.query('SELECT TOP(1) AuditId FROM core.SecurityAudit'),
      e=>/229|permission was denied|SELECT permission/i.test(String(e.message)));
  }finally{await p.close();}
  console.log('PASS: existing application identity has only reviewed auth permissions');
}
async function main(){
  const app=inputs();const nonce=crypto.randomBytes(6).toString('hex');
  let master,db;
  try {
    master=await connect(ADMIN,ADMIN_SECRET,'master');
    db=await connect(ADMIN,ADMIN_SECRET,STAGE);
    const current=await tables(db);
    assert.deepEqual(current,K4_TABLES,'Unexpected live SQL schema; stop before migration');
    assert.deepEqual(await migrationRows(db),['001_platform_identity_foundation.sql']);
    const pre=await backup(master,'pre',nonce);
    await restoreProof(master,pre,current,['001_platform_identity_foundation.sql'],nonce,'pre');

    const result=await applyMigrations(db);
    assert.deepEqual(result.map(x=>x.status),['unchanged','applied']);
    assert.deepEqual((await applyMigrations(db)).map(x=>x.status),['unchanged','unchanged']);
    assert.deepEqual(await tables(db),FULL);
    await grantRuntime(db);
    await verifyApp(app);

    const post=await backup(master,'post',nonce);
    await restoreProof(master,post,FULL,
      ['001_platform_identity_foundation.sql','002_identity_sessions_and_roles.sql'],nonce,'post');
    console.log('K5A SQL STAGING MIGRATION: PASS');
    console.log('Login remains OFF until approved K5 auth activation and owner bootstrap.');
    console.log('Retain pre/post backup paths under SQL backup rotation and off-host policy.');
  }finally{await db?.close().catch(()=>{});await master?.close().catch(()=>{});}
}
if(require.main===module){
  main().catch(err=>{
    console.error('K5A SQL MIGRATION FAILED:',err instanceof Error?err.message.slice(0,260):'unknown');
    process.exitCode=1;
  });
}
module.exports={main,inputs};

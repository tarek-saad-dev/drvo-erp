'use strict';
// Installed root-owned, executed as drvoerp-dbdeploy (NEVER root).
// Only accepts a bounded JSON SQL manifest through stdin over forced SSH.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const sql=require('mssql');
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const NAME=/^([0-9]{3})_[a-z][a-z0-9_]*\.sql$/;
const DB='DRVO_ERP_STAGING';
const FILE='/etc/drvo-erp-db-automation/staging-db-automation.env';
const MAX_INPUT=4*1024*1024;
const BACKUP_DIR='/var/opt/mssql/data';

function validatePayload(payload, expectedSha){
  if(!payload || typeof payload!=='object' || Array.isArray(payload) ||
      payload.format!=='drvo-erp-sql-v1' || payload.sha!==expectedSha ||
      !SHA.test(expectedSha) || !Array.isArray(payload.migrations) ||
      payload.migrations.length<1 || payload.migrations.length>64) {
    throw new Error('Invalid SQL payload identity');
  }
  let sum=0;
  const migrations=payload.migrations.map((m,i)=>{
    if(!m || typeof m!=='object' || Array.isArray(m) ||
        typeof m.name!=='string' || typeof m.sql!=='string' ||
        typeof m.sha256!=='string') throw new Error('Malformed SQL migration');
    const match=NAME.exec(m.name);
    if(!match || Number(match[1])!==i+1 || !HASH.test(m.sha256)) {
      throw new Error('SQL file numbering/hash rejected');
    }
    const body=Buffer.from(m.sql,'utf8');
    sum+=body.length;
    if(body.length===0 || body.length>200000 || sum>3*1024*1024 ||
       /^\s*GO\s*$/im.test(m.sql) ||
       crypto.createHash('sha256').update(body).digest('hex')!==m.sha256) {
      throw new Error('SQL migration content/hash invalid');
    }
    return {name:m.name,sql:m.sql,sha256:m.sha256};
  });
  return migrations;
}
function readCredential(){
  const st=fs.lstatSync(FILE);
  if(!st.isFile() || st.isSymbolicLink() || st.uid!==0 ||
      (st.mode & 0o007)!==0 || (st.mode & 0o020)!==0) {
    throw new Error('Migration credentials permissions are unsafe');
  }
  const env=Object.fromEntries(fs.readFileSync(FILE,'utf8').split(/\r?\n/)
    .filter(Boolean).map(line=>{
      const i=line.indexOf('=');
      if(i<1) throw new Error('Invalid migration secret line');
      return [line.slice(0,i),line.slice(i+1)];
    }));
  if(env.SQL_HOST!=='127.0.0.1' || env.SQL_PORT!=='1433' ||
      env.SQL_DATABASE!==DB || env.SQL_USER!=='drvo_erp_stage_migrator' ||
      !env.SQL_PASSWORD || env.SQL_PASSWORD.length<12) {
    throw new Error('Migration login not restricted to DRVO staging');
  }
  return {server:env.SQL_HOST,port:1433,user:env.SQL_USER,password:env.SQL_PASSWORD,
    database:DB,connectionTimeout:5000,requestTimeout:120000,
    options:{encrypt:true,trustServerCertificate:true},pool:{min:0,max:2}};
}
async function readStdin(){
  const chunks=[];let total=0;
  for await(const chunk of process.stdin){
    total+=chunk.length;
    if(total>MAX_INPUT) throw new Error('SQL payload too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function run(pool,migrations,sha,{backup=true}={}){
  assert.ok(SHA.test(sha));
  const who=await pool.request().query(`
    SELECT DB_NAME() AS Db,
      IS_SRVROLEMEMBER('sysadmin') AS Sysadmin,
      IS_SRVROLEMEMBER('dbcreator') AS Dbcreator,
      IS_ROLEMEMBER('db_owner') AS DbOwner,
      IS_ROLEMEMBER('db_ddladmin') AS Ddl,
      IS_ROLEMEMBER('db_backupoperator') AS BackupRole
  `);
  const info=who.recordset[0];
  if(info.Db!==DB || Number(info.Sysadmin)!==0 ||
      Number(info.Dbcreator)!==0 || Number(info.DbOwner)!==0 ||
      Number(info.Ddl)!==1 || Number(info.BackupRole)!==1){
    throw new Error('SQL migration principal has unexpected privilege scope');
  }
  const history=await pool.request().query(`
    SELECT MigrationId,Checksum FROM core.SchemaMigration ORDER BY MigrationId
  `);
  const applied=history.recordset;
  if(applied.length>migrations.length) throw new Error('Database history newer than GitHub payload');
  for(let i=0;i<applied.length;i++){
    if(applied[i].MigrationId!==migrations[i].name ||
       applied[i].Checksum!==migrations[i].sha256) {
      throw new Error('Migration history drift detected at index '+(i+1));
    }
  }
  if(applied.length===migrations.length){
    console.log('DRVO DB MIGRATION NOOP: all '+applied.length+' checksums match');
    return {pending:0,backupFile:null};
  }
  let backupFile=null;
  if(backup){
    const suffix=crypto.randomBytes(8).toString('hex');
    backupFile=BACKUP_DIR+'/drvo_erp_stage_auto_'+sha.slice(0,12)+'_'+suffix+'.bak';
    await pool.request().batch(`BACKUP DATABASE [DRVO_ERP_STAGING]
      TO DISK=N'${backupFile}' WITH COPY_ONLY,CHECKSUM,INIT`);
    console.log('PASS: pre-migration COPY_ONLY checksum backup: '+backupFile);
    // RESTORE VERIFYONLY or a full restore requires privileges not granted to this principal.
    // The operator can perform independent restore drills without granting dbcreator.
  }
  let changed=0;
  for(const migration of migrations){
    const tx=new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try{
      const locked=await tx.request().query(`
        DECLARE @result INT;
        EXEC @result=sys.sp_getapplock
          @Resource=N'drvo-erp-k4-schema-migrations',
          @LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=20000;
        SELECT @result AS result;
      `);
      if(Number(locked.recordset[0].result)<0) throw new Error('Migration lock unavailable');
      const existing=await tx.request().input('name',sql.NVarChar(160),migration.name)
        .query('SELECT Checksum FROM core.SchemaMigration WHERE MigrationId=@name');
      if(existing.recordset.length){
        if(existing.recordset[0].Checksum!==migration.sha256)
          throw new Error('Migration checksum conflict: '+migration.name);
        await tx.commit();
        console.log('UNCHANGED: '+migration.name);
        continue;
      }
      await tx.request().batch(migration.sql);
      await tx.request()
        .input('name',sql.NVarChar(160),migration.name)
        .input('sha',sql.Char(64),migration.sha256)
        .query('INSERT INTO core.SchemaMigration(MigrationId,Checksum) VALUES(@name,@sha)');
      await tx.commit();
      changed++;
      console.log('APPLIED: '+migration.name);
    }catch(error){
      await tx.rollback().catch(()=>{});
      throw error;
    }
  }
  const verify=await pool.request().query(
    'SELECT MigrationId,Checksum FROM core.SchemaMigration ORDER BY MigrationId'
  );
  if(verify.recordset.length!==migrations.length ||
      verify.recordset.some((item,i)=>
        item.MigrationId!==migrations[i].name || item.Checksum!==migrations[i].sha256)){
    throw new Error('Post-migration checksum audit failed');
  }
  console.log('DRVO DB MIGRATION PASS: '+changed+' applied; '+migrations.length+' total; commit '+sha);
  return {pending:changed,backupFile};
}
async function main(){
  const sha=process.argv[2];
  if(!SHA.test(sha||'')) throw new Error('Expected reviewed commit SHA');
  const payload=await readStdin();
  const migrations=validatePayload(payload,sha);
  const cfg=readCredential();
  const pool=new sql.ConnectionPool(cfg);
  await pool.connect();
  try{await run(pool,migrations,sha);}
  finally{await pool.close();}
}
if(require.main===module){
  main().catch(error=>{
    // Never echo SQL password, environment, connection strings or request bodies.
    console.error('DRVO DB MIGRATION FAILED:',error instanceof Error?
      String(error.message).slice(0,230):'Unknown migration error');
    process.exitCode=1;
  });
}
module.exports={validatePayload,run,readCredential};

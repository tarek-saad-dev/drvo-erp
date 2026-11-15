'use strict';
// Run ONLY on a trusted local operator machine/VPS after configuring a restricted
// read-only DB user. Does not run GitHub-hosted or request secrets in chat.
// Print no passwords, host tokens or user PII.
const assert=require('node:assert/strict');
const sql=require('../../apps/api/node_modules/mssql');
const {manifest,migrationReadiness}=require('./migration-readiness.cjs');
async function main(){
 assert.equal(process.env.DRVO_DEV_PRIMARY_READONLY,'YES',
  'Explicit DRVO dev database read-only inspection required');
 assert.equal(process.env.DRVO_DEV_SQL_HOST,'127.0.0.1','Localhost only');
 assert.equal(process.env.DRVO_DEV_SQL_PORT,'1433','Expected SQL port 1433');
 const database=process.env.DRVO_DEV_SQL_DATABASE;
 assert.ok(typeof database==='string'&&/^DRVO_ERP_(STAGING|DEV|DEVELOPMENT)$/.test(database),
  'Explicit allowlisted DRVO dev database name required');
 const user=process.env.DRVO_DEV_SQL_USER,password=process.env.DRVO_DEV_SQL_PASSWORD;
 assert.ok(typeof user==='string'&&user.length>0&&typeof password==='string'&&password.length>=12,
  'Use a separate restricted DB reader; never commit/share credentials');
 const pool=new sql.ConnectionPool({
  server:'127.0.0.1',port:1433,database,user,password,
  options:{encrypt:true,trustServerCertificate:true},
  connectionTimeout:5000,requestTimeout:15000,pool:{min:0,max:1},
 });
 try{
  await pool.connect();
  const identity=await pool.query(
   "SELECT DB_NAME() AS db,IS_SRVROLEMEMBER('sysadmin') AS sysadmin,"+
   "IS_ROLEMEMBER('db_owner') AS owner,IS_ROLEMEMBER('db_ddladmin') AS ddl");
  const row=identity.recordset[0];
  assert.equal(row.db,database,'Unexpected DB target');
  assert.deepEqual([Number(row.sysadmin),Number(row.owner),Number(row.ddl)],[0,0,0],
   'Must use unprivileged reader for preflight');
  const history=await pool.request().query(
   'SELECT MigrationId,Checksum FROM core.SchemaMigration ORDER BY MigrationId');
  const report=migrationReadiness(history.recordset,manifest());
  console.log(JSON.stringify({
   database,stage:report.stage,applied:report.appliedCount,
   pending:report.pending,backupRestorableVerified:false,
   safeToApply:false,primaryDatabaseModified:false,
   next:'Independently verified restorable backup, explicit operator authorization and exact SQL apply needed',
  },null,2));
 }finally{await pool.close().catch(()=>{});}
}
main().catch(error=>{
 // Never print underlying SQL connection details, tokens, or credentials.
 const safe=error instanceof Error && /migration|checksum|history|Unexpected DB|reader|allowlisted|Localhost|port 1433/i.test(error.message)?
  error.message:'DRVO primary-dev read-only preflight unavailable; no migration attempted';
 console.error(safe);process.exitCode=1;
});

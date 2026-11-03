'use strict';
// Non-root operator health check: never print SQL password or secret content.
// Called only by the one-time installer, after the root-owned receiver is pinned.
const assert=require('node:assert/strict');
const sql=require('mssql');
const {readCredential}=require('./receive-sql.cjs');

async function main(){
  assert.equal(process.getuid?.(),Number(process.env.DRVO_EXPECT_DB_UID),
    'Expected the restricted drvoerp-dbdeploy user');
  const config=readCredential();
  const pool=new sql.ConnectionPool(config);
  await pool.connect();
  try{
    const r=await pool.query(`
      SELECT DB_NAME() AS [db], IS_ROLEMEMBER('db_ddladmin') AS [ddl],
        IS_ROLEMEMBER('db_backupoperator') AS [backup],
        IS_ROLEMEMBER('db_owner') AS [owner],
        IS_SRVROLEMEMBER('sysadmin') AS [admin]`);
    const p=r.recordset[0];
    assert.equal(p.db,'DRVO_ERP_STAGING');
    assert.equal(Number(p.ddl),1);
    assert.equal(Number(p.backup),1);
    assert.equal(Number(p.owner),0);
    assert.equal(Number(p.admin),0);
    const history=await pool.query('SELECT MigrationId FROM core.SchemaMigration');
    assert.ok(history.recordset.some(x=>x.MigrationId==='002_identity_sessions_and_roles.sql'));
    console.log('PASS: dedicated non-root SSH user can read SQL secret and access migrated DRVO staging');
  }finally{await pool.close();}
}
if(require.main===module){
  main().catch(()=>{
    console.error('Restricted staging database identity verification failed');
    process.exitCode=1;
  });
}
module.exports={main};

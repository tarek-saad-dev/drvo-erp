'use strict';
// Runs EXACT K5A operator SQL cutover in an isolated GitHub SQL Server container.
// Must never be run on VPS. No production credentials.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const sql=require('../../apps/api/node_modules/mssql');
const {applyMigrations}=require('../k4-db/migrate.cjs');

async function run(){
  assert.equal(process.getuid?.(),0);
  assert.equal(process.env.GITHUB_ACTIONS,'true');
  assert.equal(process.env.K5_SQL_DISPOSABLE,'YES');
  assert.equal(process.env.K5_TEST_PORT,'14335');
  assert.ok(process.env.SQL_TEST_SA_PASSWORD?.length>=12);
  const appPass='DrvoK5Ci!'+crypto.randomBytes(24).toString('hex');
  const cfg={server:'127.0.0.1',port:14335,user:'sa',
    password:process.env.SQL_TEST_SA_PASSWORD,
    options:{encrypt:true,trustServerCertificate:true}};
  let master,db;
  for(let n=0;n<45;n++){
    try{
      master=new sql.ConnectionPool({...cfg,database:'master'});
      await master.connect();await master.query('SELECT 1');break;
    }catch(e){
      await master?.close().catch(()=>{});
      if(n===44)throw e;
      await new Promise(r=>setTimeout(r,3000));
    }
  }
  try{
    await master.query('CREATE DATABASE [DRVO_ERP_STAGING]');
    await master.query(`CREATE LOGIN [drvo_erp_stage_app] WITH PASSWORD=N'${appPass}',
      CHECK_POLICY=ON,CHECK_EXPIRATION=OFF`);
    db=new sql.ConnectionPool({...cfg,database:'DRVO_ERP_STAGING'});
    await db.connect();
    assert.deepEqual((await applyMigrations(db,undefined,1)).map(x=>x.status),['applied']);
    await db.query(`CREATE USER [drvo_erp_stage_app] FOR LOGIN [drvo_erp_stage_app];
      GRANT CONNECT TO [drvo_erp_stage_app];
      GRANT SELECT ON OBJECT::core.SchemaMigration TO [drvo_erp_stage_app]`);
    fs.mkdirSync('/etc/drvo-erp',{recursive:true,mode:0o700});
    const file='/etc/drvo-erp/staging-sql.env';
    fs.writeFileSync(file,[
      'DRVO_SQL_HOST=127.0.0.1','DRVO_SQL_PORT=1433',
      'DRVO_SQL_DATABASE=DRVO_ERP_STAGING','DRVO_SQL_USER=drvo_erp_stage_app',
      'DRVO_SQL_PASSWORD='+appPass,'',
    ].join('\n'),{mode:0o600});
    fs.chmodSync(file,0o600);
    process.env.DRVO_K5_ADMIN_LOGIN='sa';
    process.env.DRVO_K5_ADMIN_PASSWORD=process.env.SQL_TEST_SA_PASSWORD;
    process.env.DRVO_K5_OPERATOR_APPLY='YES';
    try{
      await require('../../ops/staging/k5a-sql-apply.cjs').main();
      console.log('K5A EXACT SQL OPERATOR SCRIPT ON DISPOSABLE CI: PASS');
    }finally{
      delete process.env.DRVO_K5_ADMIN_LOGIN;
      delete process.env.DRVO_K5_ADMIN_PASSWORD;
      delete process.env.DRVO_K5_OPERATOR_APPLY;
      fs.rmSync(file,{force:true});
    }
  }finally{
    await db?.close().catch(()=>{});
    await master?.close().catch(()=>{});
  }
}
run().catch(err=>{
  console.error('K5A operator proof FAILED:',err instanceof Error?err.message.slice(0,250):'unknown');
  process.exitCode=1;
});

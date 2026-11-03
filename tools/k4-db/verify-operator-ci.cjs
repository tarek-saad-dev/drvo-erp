'use strict';
// Execute the *exact* guarded K4B SQL operator cutover against ephemeral
// GitHub Actions SQL Server only. Never runs against the VPS.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const sql = require('../../apps/api/node_modules/mssql');
const { main } = require('../../ops/staging/k4b-sql-cutover.cjs');

async function run() {
  assert.equal(process.getuid?.(), 0);
  assert.equal(process.env.GITHUB_ACTIONS, 'true');
  assert.equal(process.env.DRVO_K4_TARGET, 'ci');
  assert.equal(process.env.DRVO_K4_DISPOSABLE, 'YES');
  assert.equal(process.env.SQL_TEST_PORT, '14334');
  assert.ok(process.env.SQL_TEST_SA_PASSWORD, 'Disposable SA password not set');
  const password = 'DrvoK4Ci!' + crypto.randomBytes(24).toString('hex');
  const admin = new sql.ConnectionPool({
    server:'127.0.0.1',port:14334,user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
    database:'master',options:{encrypt:true,trustServerCertificate:true},
  });
  await admin.connect();
  let stage;
  try {
    await admin.query(`CREATE LOGIN [drvo_erp_stage_app]
      WITH PASSWORD=N'${password}', CHECK_POLICY=ON, CHECK_EXPIRATION=OFF`);
    stage = new sql.ConnectionPool({
      server:'127.0.0.1',port:14334,user:'sa',password:process.env.SQL_TEST_SA_PASSWORD,
      database:'DRVO_ERP_STAGING',options:{encrypt:true,trustServerCertificate:true},
    });
    await stage.connect();
    await stage.query(`CREATE USER [drvo_erp_stage_app] FOR LOGIN [drvo_erp_stage_app];
      GRANT CONNECT TO [drvo_erp_stage_app]`);
  } finally {
    await stage?.close();
    await admin.close();
  }
  const file='/etc/drvo-erp/staging-sql.env';
  fs.mkdirSync('/etc/drvo-erp',{recursive:true,mode:0o700});
  fs.writeFileSync(file,[
    'DRVO_SQL_HOST=127.0.0.1','DRVO_SQL_PORT=1433',
    'DRVO_SQL_DATABASE=DRVO_ERP_STAGING','DRVO_SQL_USER=drvo_erp_stage_app',
    'DRVO_SQL_PASSWORD='+password,'',
  ].join('\n'),{mode:0o600});
  fs.chmodSync(file,0o600);
  process.env.DRVO_K4B_EXECUTE='YES';
  process.env.DRVO_K4_ADMIN_LOGIN='sa';
  process.env.DRVO_K4_ADMIN_PASSWORD=process.env.SQL_TEST_SA_PASSWORD;
  try {
    await main();
    console.log('K4B EXACT STAGING SQL OPERATOR SCRIPT ON DISPOSABLE CI: PASS');
  } finally {
    delete process.env.DRVO_K4B_EXECUTE;
    delete process.env.DRVO_K4_ADMIN_LOGIN;
    delete process.env.DRVO_K4_ADMIN_PASSWORD;
    fs.rmSync(file,{force:true});
  }
}
run().catch((err)=>{
  console.error('K4B disposable operator verification FAILED:',
    err instanceof Error?err.message.slice(0,240):'unknown');
  process.exitCode=1;
});

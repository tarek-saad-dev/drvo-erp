'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  MIGRATIONS,PRIVATE_TABLES,NO_DIRECT_TABLE_PERMISSIONS,PUBLIC_PROCEDURES,parseEnv,
  noDirectTablePermissions,rootBundleSafe,
  sameSecret,readinessChecks,dbConfig,
}=require('./check-staging-readiness.cjs');

const secret='ac'.repeat(32);
const mockOperator={
  DRVO_K5_OPERATOR_APPROVAL_ENABLED:'YES',
  DRVO_K5_MAIL_ENABLED:'YES',DRVO_K5_MAIL_PROVIDER:'resend',
  DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com',
  DRVO_K5_VERIFICATION_HMAC_KEY:secret,
  DRVO_K5_RESEND_API_KEY:'re_'+'f'.repeat(32),
  DRVO_K5_FROM_EMAIL:'verify@drvotech.com',
};
const mockApi={
  NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'3311',
  DRVO_K5_TRUST_NGINX_REAL_IP:'YES',
  DRVO_K5_MAIL_ENABLED:'YES',DRVO_K5_MAIL_PROVIDER:'resend',
  DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com',
  DRVO_K5_VERIFICATION_HMAC_KEY:secret,
  DRVO_K5_RESEND_API_KEY:'re_'+'f'.repeat(32),
  DRVO_K5_FROM_EMAIL:'verify@drvotech.com',
  DRVO_SQL_ENABLED:'YES',DRVO_SQL_HOST:'127.0.0.1',
  DRVO_SQL_PORT:'1433',DRVO_SQL_DATABASE:'DRVO_ERP_STAGING',
  DRVO_SQL_USER:'drvo_erp_stage_app',DRVO_SQL_PASSWORD:'not-a-real-ci-password',
};
const mockWeb={NODE_ENV:'production',PORT:'3310'};
const mockMigrator={
  SQL_HOST:'127.0.0.1',SQL_PORT:'1433',
  SQL_DATABASE:'DRVO_ERP_STAGING',SQL_USER:'drvo_erp_stage_migrator',
  SQL_PASSWORD:'not-a-real-ci-password',
};
function badLabels(a=mockOperator,b=mockApi,c=mockWeb,d=mockMigrator){
  return readinessChecks(a,b,c,d).filter(x=>!x[1]).map(x=>x[0]);
}
test('normal proposed LOCAL prereqs pass, without implying external readiness',()=>{
  assert.deepEqual(badLabels(),[]);
  assert.equal(MIGRATIONS.length,9);
  assert.equal(PRIVATE_TABLES.length,6);
  assert.equal(PUBLIC_PROCEDURES.length,5);
});
test('strict environment parser does not execute file contents or accept duplicates',()=>{
  const data=parseEnv('DRVO_K5_MAIL_ENABLED=YES\nDRVO_K5_RESEND_API_KEY=re_placeholder\n# comment\n');
  assert.equal(data.DRVO_K5_MAIL_ENABLED,'YES');
  assert.equal(data.DRVO_K5_RESEND_API_KEY,'re_placeholder');
  assert.throws(()=>parseEnv('SAFE_KEY=value\nSAFE_KEY=evil\n'));
  assert.throws(()=>parseEnv('export SAFE_KEY=YES\n'));
  assert.throws(()=>parseEnv('SAFE_KEY=value\nBAD CMD=$(whoami)\n'));
  assert.throws(()=>parseEnv('SAFE_KEY=value\nORPHAN_LINE\n'));
  assert.throws(()=>parseEnv('SAFE_KEY=a\n'.repeat(10000)));
  const proc=parseEnv('NODE_ENV=production\0DRVO_SQL_ENABLED=YES\0','\0');
  assert.equal(proc.NODE_ENV,'production');
  assert.equal(proc.DRVO_SQL_ENABLED,'YES');
});
test('both missing and divergent HMAC fail closed and never compare secret text',()=>{
  assert.equal(sameSecret(secret,secret),true);
  assert.equal(sameSecret(secret.toUpperCase(),secret),true);
  assert.equal(sameSecret('00'.repeat(32),secret),false);
  assert.equal(sameSecret('ab'.repeat(31),secret),false);
  assert.equal(sameSecret(secret,'bd'.repeat(32)),false);
  assert.ok(badLabels(mockOperator,{...mockApi,
    DRVO_K5_VERIFICATION_HMAC_KEY:'bd'.repeat(32)}).some(x=>x.includes('verification secret')));
});
test('the public API + Web feature flags must remain closed',()=>{
  for(const gate of ['DRVO_K5_AUTH_ENABLED','DRVO_K5_OWNER_BOOTSTRAP_ENABLED',
    'DRVO_K5_VERIFY_API_ENABLED','DRVO_K5_INVITATIONS_ENABLED',
    'DRVO_K5_ROLE_ADMIN_ENABLED']){
    assert.ok(badLabels(mockOperator,{...mockApi,[gate]:'YES'})
      .some(x=>x.includes('flags remain OFF')),gate);
  }
  for(const gate of ['DRVO_K5_WEB_ENABLED','DRVO_K5_VERIFY_UI_ENABLED']){
    assert.ok(badLabels(mockOperator,mockApi,{...mockWeb,[gate]:'YES'})
      .some(x=>x.includes('flags remain OFF')),gate);
  }
});
test('malformed provider config, drifted origin, missing nginx trust fail',()=>{
  assert.ok(badLabels({...mockOperator,DRVO_K5_RESEND_API_KEY:'bad'}).length);
  assert.ok(badLabels(mockOperator,{...mockApi,DRVO_K5_ORIGIN:'https://wrong.test'}).length);
  assert.ok(badLabels(mockOperator,{...mockApi,DRVO_K5_TRUST_NGINX_REAL_IP:'NO'}).length);
  assert.ok(badLabels(mockOperator,mockApi,{...mockWeb,NODE_ENV:'development'}).length);
  assert.ok(badLabels(mockOperator,{...mockApi,DRVO_K5_FROM_EMAIL:'other@drvotech.com'}).length);
});
test('strict separate SQL staging principal required and no production DB is accepted',()=>{
  assert.ok(badLabels(mockOperator,{...mockApi,DRVO_SQL_USER:'sa'}).length);
  assert.ok(badLabels(mockOperator,mockApi,mockWeb,
    {...mockMigrator,SQL_DATABASE:'Casher'}).length);
  assert.ok(badLabels(mockOperator,{...mockApi,DRVO_SQL_HOST:'public-db.test'}).length);
  const config=dbConfig('drvo_erp_stage_app','test-secret');
  assert.equal(config.server,'127.0.0.1');
  assert.equal(config.database,'DRVO_ERP_STAGING');
  assert.equal(config.options.encrypt,true);
  assert.equal(config.user,'drvo_erp_stage_app');
});

test('runtime onboarding tables must deny ALL direct DML and control, not just SELECT',()=>{
  const denied=Object.fromEntries(NO_DIRECT_TABLE_PERMISSIONS.map(p=>[p,0]));
  assert.equal(noDirectTablePermissions(denied),true);
  for(const permission of NO_DIRECT_TABLE_PERMISSIONS){
    assert.equal(noDirectTablePermissions({...denied,[permission]:1}),false,
      permission+' grant must block readiness');
    assert.equal(noDirectTablePermissions({...denied,[permission]:null}),false,
      permission+' NULL metadata must fail closed');
    const missing={...denied};delete missing[permission];
    assert.equal(noDirectTablePermissions(missing),false);
  }
  assert.equal(noDirectTablePermissions(null),false);
  assert.equal(noDirectTablePermissions({}),false);
});

test('root execution cannot trust the mutable checkout as its operator bundle',()=>{
  assert.equal(rootBundleSafe(),false);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  claimApprovedOwner,
}=require('../dist/identity/owner-bootstrap.js');
const {generateOpaqueVerificationToken}=require('../dist/identity/verification-crypto.js');

const key='9e'.repeat(32);
const input={
  email:'approved@example.test',
  token:generateOpaqueVerificationToken(),
  newPassword:'Secure Unique Password 2026!',
};
const inaccessible={get connected(){throw Error('database must not be used')}};

test('internal Owner claim is disabled unless both feature flags are enabled',async()=>{
  for(const env of [
    {}, {DRVO_K5_OWNER_BOOTSTRAP_ENABLED:'YES'},
    {DRVO_K5_AUTH_ENABLED:'YES'},
    {DRVO_K5_OWNER_BOOTSTRAP_ENABLED:'yes',DRVO_K5_AUTH_ENABLED:'YES'},
  ]) {
    await assert.rejects(()=>claimApprovedOwner(inaccessible,input,env),
      /Owner bootstrap is not enabled/);
  }
});

test('Owner claim denies absent HMAC key, malformed token and weak password before SQL',async()=>{
  const good={
    DRVO_K5_OWNER_BOOTSTRAP_ENABLED:'YES',
    DRVO_K5_AUTH_ENABLED:'YES',
    DRVO_K5_VERIFICATION_HMAC_KEY:key,
  };
  await assert.rejects(()=>claimApprovedOwner(inaccessible,input,
    {...good,DRVO_K5_VERIFICATION_HMAC_KEY:undefined}),/invalid or expired/);
  await assert.rejects(()=>claimApprovedOwner(inaccessible,
    {...input,token:'not-a-real-token'},good),/invalid or expired/);
  await assert.rejects(()=>claimApprovedOwner(inaccessible,
    {...input,email:'bad@domain'},good),/invalid or expired/);
  await assert.rejects(()=>claimApprovedOwner(inaccessible,
    {...input,newPassword:'123'},good),/invalid or expired/);
});

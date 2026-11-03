'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {
  normalizeVerificationEmail,loadVerificationSecret,
  verificationEmailDigest,generateOpaqueVerificationToken,
  verificationTokenDigest,matchesVerificationDigest,
}=require('../dist/identity/verification-crypto.js');

const secret=loadVerificationSecret('ab'.repeat(32));
const other=loadVerificationSecret('cd'.repeat(32));

test('email normalization is stable and same account identity cannot be duplicated by case/outer spaces',()=>{
  assert.equal(normalizeVerificationEmail('  Owner.Test+1@Example.COM '),
    'owner.test+1@example.com');
  assert.equal(
    verificationEmailDigest(' Owner.Test+1@Example.COM ',secret),
    verificationEmailDigest('owner.test+1@example.com',secret),
  );
  assert.notEqual(
    verificationEmailDigest('owner.test+1@example.com',secret),
    verificationEmailDigest('owner.test@example.com',secret),
  );
  assert.equal(verificationEmailDigest('owner@example.com',secret).length,64);
});

test('invalid email forms fail closed instead of accepting ambiguous or Unicode equivalents',()=>{
  for(const email of [
    null, 42, '', '@example.com', 'abc@', 'abc@@example.com',
    '..a@example.com','a..b@example.com','a.@example.com',
    '.a@example.com', 'a@-example.com','a@example-.com',
    'a@example', 'a@x.c','someone@exa_mple.com','x@exämple.com',
    'a@'+'long'.repeat(100)+'.com',
  ]){
    assert.throws(()=>normalizeVerificationEmail(email));
  }
});

test('secret is mandatory, exactly 32 bytes, and cannot use all-zero defaults',()=>{
  for(const value of [undefined,'','00'.repeat(32),'cd'.repeat(31),'cd'.repeat(33),'somepassword','GG'.repeat(32)]){
    assert.throws(()=>loadVerificationSecret(value));
  }
  assert.equal(secret.length,32);
});

test('email digest is keyed; the same email is not a public SHA256 address hash',()=>{
  const addr='owner@example.com';
  assert.notEqual(verificationEmailDigest(addr,secret),
    crypto.createHash('sha256').update(addr).digest('hex'));
  assert.notEqual(verificationEmailDigest(addr,secret),
    verificationEmailDigest(addr,other));
});

test('generated one-time bearer token is 256-bit strong and valid base64url',()=>{
  const tokens=Array.from({length:100},()=>generateOpaqueVerificationToken());
  assert.equal(new Set(tokens).size,100);
  for(const token of tokens){
    assert.match(token,/^[A-Za-z0-9_-]{43}$/);
    assert.equal(Buffer.from(token,'base64url').length,32);
  }
});

test('digest is purpose-bound to prevent cross-use of a bootstrap token',()=>{
  const token=generateOpaqueVerificationToken();
  const a=verificationTokenDigest(token,'OWNER_BOOTSTRAP',secret);
  const b=verificationTokenDigest(token,'ACCOUNT_INVITE',secret);
  const c=verificationTokenDigest(token,'ACCOUNT_RECOVERY',secret);
  assert.notEqual(a,b);
  assert.notEqual(a,c);
  assert.notEqual(b,c);
  assert.equal(verificationTokenDigest(token,'OWNER_BOOTSTRAP',secret),a);
  assert.notEqual(verificationTokenDigest(token,'OWNER_BOOTSTRAP',other),a);
  assert.notEqual(a,crypto.createHash('sha256').update(token).digest('hex'));
});

test('invalid tokens, purposes and bad hash types always fail closed',()=>{
  const token=generateOpaqueVerificationToken();
  const good=verificationTokenDigest(token,'ACCOUNT_INVITE',secret);
  for(const t of ['short','a'.repeat(300),'a'.repeat(43),'a'.repeat(42)+'=','',null,123]){
    if(t==='a'.repeat(43)) continue;
    assert.throws(()=>verificationTokenDigest(t,'ACCOUNT_INVITE',secret));
  }
  assert.throws(()=>verificationTokenDigest(token,'OWNER',secret));
  assert.throws(()=>verificationTokenDigest(token,'ACCOUNT_INVITE',Buffer.alloc(31)));
  for(const bad of ['',null,32,'g'.repeat(64),'x'.repeat(64),'aa'.repeat(31),good.toUpperCase()]){
    assert.equal(matchesVerificationDigest(good,bad),false);
  }
});

test('constant time hash compare matches expected digest and rejects a different digest',()=>{
  const token=generateOpaqueVerificationToken();
  const value=verificationTokenDigest(token,'ACCOUNT_INVITE',secret);
  const wrong=verificationTokenDigest(generateOpaqueVerificationToken(),'ACCOUNT_INVITE',secret);
  assert.equal(matchesVerificationDigest(value,value),true);
  assert.equal(matchesVerificationDigest(value,wrong),false);
});

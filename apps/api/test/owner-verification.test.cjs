'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  trustedClientAddress,verificationThrottleKeys,consumeVerificationAttempt,
}=require('../dist/identity/owner-verification-throttle.js');
const {OwnerVerificationService}=
  require('../dist/identity/owner-verification.service.js');
const {OwnerVerificationController}=
  require('../dist/identity/owner-verification.controller.js');

const key='c4'.repeat(32);
const secret=Buffer.from(key,'hex');
const remote=(addr,realIp)=>({
  socket:{remoteAddress:addr},
  headers: realIp===undefined?{}:{'x-real-ip':realIp},
});
const env={DRVO_K5_TRUST_NGINX_REAL_IP:'YES'};

test('proxy IP is accepted only from loopback with replaced X-Real-IP header',()=>{
  assert.equal(trustedClientAddress(remote('127.0.0.1','196.200.1.10'),env),'196.200.1.10');
  assert.equal(trustedClientAddress(remote('::1','2001:db8::8'),env),'2001:db8::8');
  for(const source of [
    remote('196.200.1.10','200.0.0.1'),
    remote('127.0.0.1','1.2.3.4, 9.8.7.6'),
    remote('127.0.0.1','bad-ip'),
    remote('127.0.0.1',null),
    remote('127.0.0.1'),
  ]) assert.equal(trustedClientAddress(source,env),null);
  assert.equal(trustedClientAddress(remote('196.200.1.10','9.9.9.9'),{}),'196.200.1.10');
});

test('keyed SQL throttle identifiers never contain raw email or IP',()=>{
  const a=verificationThrottleKeys('196.200.1.10','owner@example.test',secret);
  const b=verificationThrottleKeys('196.200.1.10','owner@example.test',secret);
  const c=verificationThrottleKeys('196.200.1.11','owner@example.test',secret);
  assert.deepEqual(a,b);
  assert.equal(a.length,2);
  assert.equal(a.every(x=>/^[0-9a-f]{64}$/.test(x.key)),true);
  assert.notDeepEqual(a,c);
  assert.equal(a.some(x=>x.key.includes('owner@example.test')||x.key.includes('196.200.1.10')),false);
  assert.deepEqual(verificationThrottleKeys('196.200.1.10',null,secret).length,1);
});

test('entire Owner verification remains disabled before any SQL is opened',async()=>{
  const old=process.env;
  const db={getInternalPool(){throw Error('SQL opened unexpectedly')}};
  try{
    process.env={};
    const service=new OwnerVerificationService(db);
    await assert.rejects(()=>service.complete({},remote('127.0.0.1')),/not enabled/);
    process.env={
      DRVO_K5_AUTH_ENABLED:'YES',DRVO_K5_OWNER_BOOTSTRAP_ENABLED:'YES',
      DRVO_K5_VERIFY_API_ENABLED:'NO',
    };
    await assert.rejects(()=>service.complete({},remote('127.0.0.1')),/not enabled/);
  }finally{process.env=old;}
});

test('POST is same origin and strict JSON, always no-store',async()=>{
  const old=process.env.DRVO_K5_ORIGIN;
  try{
    process.env.DRVO_K5_ORIGIN='https://erp-stage.drvotech.com';
    const controller=new OwnerVerificationController({
      complete:async()=>({verified:true}),
    });
    const response={headers:{},setHeader(k,v){this.headers[k]=v;}};
    const req=remote('127.0.0.1');
    for(const origin of [undefined,'https://evil.test','http://erp-stage.drvotech.com']){
      await assert.rejects(()=>controller.redeem(origin,'application/json',req,{},response));
    }
    await assert.rejects(()=>controller.redeem(
      'https://erp-stage.drvotech.com','text/plain',req,{},response));
    assert.deepEqual(await controller.redeem(
      'https://erp-stage.drvotech.com','application/json',req,{},response),{verified:true});
    assert.equal(response.headers['Cache-Control'],'no-store');
    assert.equal(response.headers['Referrer-Policy'],'no-referrer');
  }finally{
    if(old===undefined)delete process.env.DRVO_K5_ORIGIN;
    else process.env.DRVO_K5_ORIGIN=old;
  }
});

test('missing proxy identity fails closed instead of doing unthrottled SQL',async()=>{
  await assert.rejects(()=>consumeVerificationAttempt({},
    null,'owner@example.test',key),/unavailable/);
});

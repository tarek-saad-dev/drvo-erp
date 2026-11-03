'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {VerificationMailer}=require('../dist/identity/verification-mailer.js');
const {generateOpaqueVerificationToken}=require('../dist/identity/verification-crypto.js');

const oldFetch=global.fetch;
const vars=[
  'DRVO_K5_MAIL_ENABLED','DRVO_K5_MAIL_PROVIDER','DRVO_K5_RESEND_API_KEY',
  'DRVO_K5_FROM_EMAIL','DRVO_K5_ORIGIN',
];
const originals=Object.fromEntries(vars.map(key=>[key,process.env[key]]));

function reset(){
  for(const [key,value] of Object.entries(originals)){
    if(value===undefined) delete process.env[key];
    else process.env[key]=value;
  }
  global.fetch=oldFetch;
}
function enabled(){
  process.env.DRVO_K5_MAIL_ENABLED='YES';
  process.env.DRVO_K5_MAIL_PROVIDER='resend';
  process.env.DRVO_K5_RESEND_API_KEY='re_'+'a'.repeat(40);
  process.env.DRVO_K5_FROM_EMAIL='notices@drvotech.com';
  process.env.DRVO_K5_ORIGIN='https://erp-stage.drvotech.com';
}
function notice(){
  return {purpose:'ACCOUNT_INVITE',email:' Recipient@Example.COM ',
    token:generateOpaqueVerificationToken(),challengeId:randomUUID()};
}

test('no HTTP call when mail delivery is disabled by default',async()=>{
  try {
    delete process.env.DRVO_K5_MAIL_ENABLED;
    enabled();
    delete process.env.DRVO_K5_MAIL_ENABLED;
    global.fetch=async()=>{throw Error('fetch must never run')};
    await assert.rejects(()=>new VerificationMailer().send(notice()),/unavailable/);
  }finally{reset();}
});

test('requires provider, secret, sender and HTTPS origin before calling external provider',async()=>{
  try {
    enabled();
    global.fetch=async()=>{throw Error('not expected')};
    for(const key of ['DRVO_K5_MAIL_PROVIDER','DRVO_K5_RESEND_API_KEY',
      'DRVO_K5_FROM_EMAIL','DRVO_K5_ORIGIN']){
      const value=process.env[key];
      delete process.env[key];
      await assert.rejects(()=>new VerificationMailer().send(notice()),/unavailable/);
      process.env[key]=value;
    }
    process.env.DRVO_K5_ORIGIN='http://127.0.0.1:3000';
    await assert.rejects(()=>new VerificationMailer().send(notice()),/unavailable/);
  }finally{reset();}
});

test('provider request uses fixed API endpoint, normalized address and idempotency',async()=>{
  try{
    enabled();
    const input=notice();
    const sent=[];
    global.fetch=async(url,init)=>{
      sent.push({url,init});
      return {ok:true};
    };
    assert.deepEqual(await new VerificationMailer().send(input),{accepted:true});
    assert.equal(sent.length,1);
    assert.equal(sent[0].url,'https://api.resend.com/emails');
    assert.equal(sent[0].init.method,'POST');
    assert.equal(sent[0].init.headers.Authorization,
      'Bearer '+process.env.DRVO_K5_RESEND_API_KEY);
    assert.equal(sent[0].init.headers['Idempotency-Key'],
      'drvo-k5d-'+input.challengeId.toLowerCase());
    const mail=JSON.parse(sent[0].init.body);
    assert.equal(mail.from,'notices@drvotech.com');
    assert.deepEqual(mail.to,['recipient@example.com']);
    assert.equal(mail.text.includes('/verify-email#token='+input.token),true);
    assert.equal(mail.text.includes('/verify-email?token='),false);
    assert.equal('html' in mail,false);
  }finally{reset();}
});

test('errors do not leak API secret, provider bodies or token',async()=>{
  try{
    enabled();
    const input=notice();
    global.fetch=async()=>({ok:false,status:401,
      text:async()=>process.env.DRVO_K5_RESEND_API_KEY});
    await assert.rejects(()=>new VerificationMailer().send(input),err=>{
      assert.equal(err.message.includes(process.env.DRVO_K5_RESEND_API_KEY),false);
      assert.equal(err.message.includes(input.token),false);
      return true;
    });
    global.fetch=async()=>{throw Error('token '+input.token+' or secret '+process.env.DRVO_K5_RESEND_API_KEY)};
    await assert.rejects(()=>new VerificationMailer().send(input),/unavailable/);
  }finally{reset();}
});

test('never sends invalid purpose, challenge id, token or email',async()=>{
  try{
    enabled();
    global.fetch=async()=>{throw Error('fetch must not occur')};
    const base=notice();
    for(const change of [
      {purpose:'ACCOUNT_RECOVERY'}, {purpose:'OWNER'},
      {challengeId:'unsafe'}, {token:'short'},
      {email:'bad@domain'}, {email:'bad\r\nBcc: foo@bar.com'},
    ]){
      await assert.rejects(()=>new VerificationMailer().send({...base,...change}),/unavailable/);
    }
  }finally{reset();}
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {persistScopedBranchInvitation,acceptScopedBranchInvitation,BranchInvitationService}=
  require('../dist/identity/branch-invitation.service.js');
const {BranchInvitationController}=
  require('../dist/identity/branch-invitation.controller.js');

const actor={
  tenantId:'11111111-1111-1111-1111-111111111111',
  accountId:'22222222-2222-2222-2222-222222222222',
  username:'owner',sessionVersion:1,mustChangePassword:false,
};
const business='33333333-3333-3333-3333-333333333333';
const branch='44444444-4444-4444-4444-444444444444';
const role='55555555-5555-5555-5555-555555555555';
const token='A'.repeat(43);
const secret='ae'.repeat(32);
const unavailable={request(){throw Error('SQL unexpectedly accessed')}};

test('invalid roles, session and email are rejected before DB writes',async()=>{
  const call=(patch={})=>persistScopedBranchInvitation(
    unavailable,patch.actor||actor,patch.session||token,
    patch.business||business,patch.branch||branch,
    patch.email===undefined?'staff@example.test':patch.email,
    patch.role||role,secret);
  await assert.rejects(()=>call({role:'OWNER'}));
  await assert.rejects(()=>call({session:'short'}));
  await assert.rejects(()=>call({business:'../foreign'}));
  await assert.rejects(()=>call({actor:{...actor,mustChangePassword:true}}));
  await assert.rejects(()=>call({email:'bad@domain'}));
});

test('account invitation acceptance is gated before SQL, refuses invalid usernames and proof',async()=>{
  const input={
    email:'staff@example.test',token,username:'employee.staff',
    newPassword:'Long Unique Password 2026!!',
  };
  await assert.rejects(()=>acceptScopedBranchInvitation(unavailable,input,{}),
    /not enabled/);
  const env={
    DRVO_K5_AUTH_ENABLED:'YES',
    DRVO_K5_INVITATIONS_ENABLED:'YES',
    DRVO_K5_VERIFY_API_ENABLED:'YES',
    DRVO_K5_VERIFICATION_HMAC_KEY:secret,
  };
  await assert.rejects(()=>acceptScopedBranchInvitation(unavailable,
    {...input,username:'bad account'},env),/invalid or expired/);
  await assert.rejects(()=>acceptScopedBranchInvitation(unavailable,
    {...input,token:'short'},env),/invalid or expired/);
});

test('owner/manager invitation issuance route validates Origin and exact request fields',async()=>{
  const old=process.env.DRVO_K5_ORIGIN;
  const fakeIdentity={actorFromToken:async()=>actor};
  const fakeService={issue:async()=>({accepted:true})};
  const controller=new BranchInvitationController(fakeIdentity,fakeService);
  const req={headers:{cookie:'__Host-drvo-session='+token}};
  const res={setHeader(){}};
  try{
    process.env.DRVO_K5_ORIGIN='https://erp-stage.drvotech.com';
    const invoke=(origin,body)=>controller.issue(origin,req,res,business,branch,body);
    await assert.rejects(()=>invoke('https://evil.example',
      {email:'staff@example.test',roleId:role}));
    await assert.rejects(()=>invoke('https://erp-stage.drvotech.com',
      {email:'staff@example.test',roleId:role,tenantId:actor.tenantId}));
    assert.deepEqual(await invoke('https://erp-stage.drvotech.com',
      {email:'staff@example.test',roleId:role}),{accepted:true});
  }finally{
    if(old===undefined)delete process.env.DRVO_K5_ORIGIN;
    else process.env.DRVO_K5_ORIGIN=old;
  }
});

test('invitation mailer remains disabled by default',async()=>{
  const db={getInternalPool(){throw Error('SQL must not be used')}};
  const service=new BranchInvitationService(db);
  const old=process.env.DRVO_K5_INVITATIONS_ENABLED;
  try{
    delete process.env.DRVO_K5_INVITATIONS_ENABLED;
    await assert.rejects(()=>service.issue(actor,token,business,branch,
      'staff@example.test',role),/not enabled/);
  }finally{
    if(old===undefined)delete process.env.DRVO_K5_INVITATIONS_ENABLED;
    else process.env.DRVO_K5_INVITATIONS_ENABLED=old;
  }
});

test('invitation listing and revocation are both off by default',async()=>{
  const db={getInternalPool(){throw Error('SQL must never be opened')}};
  const service=new BranchInvitationService(db);
  const oldAuth=process.env.DRVO_K5_AUTH_ENABLED;
  const oldInvite=process.env.DRVO_K5_INVITATIONS_ENABLED;
  try{
    delete process.env.DRVO_K5_INVITATIONS_ENABLED;
    process.env.DRVO_K5_AUTH_ENABLED='YES';
    await assert.rejects(()=>service.list(actor,token,business,branch),/not enabled/);
    await assert.rejects(()=>service.revoke(actor,token,business,branch,role),/not enabled/);
  }finally{
    if(oldInvite===undefined)delete process.env.DRVO_K5_INVITATIONS_ENABLED;
    else process.env.DRVO_K5_INVITATIONS_ENABLED=oldInvite;
    if(oldAuth===undefined)delete process.env.DRVO_K5_AUTH_ENABLED;
    else process.env.DRVO_K5_AUTH_ENABLED=oldAuth;
  }
});

test('invitation revocation route forbids foreign origin and unexpected payload',async()=>{
  const old=process.env.DRVO_K5_ORIGIN;
  const svc={
    list:async()=>({invitations:[]}),
    revoke:async()=>({revoked:true}),
  };
  const controller=new BranchInvitationController({actorFromToken:async()=>actor},svc);
  const req={headers:{cookie:'__Host-drvo-session='+token}};
  const res={setHeader(){}};
  try{
    process.env.DRVO_K5_ORIGIN='https://erp-stage.drvotech.com';
    await assert.rejects(()=>controller.revoke(
      'https://wrong.test',req,res,business,branch,role,{}));
    await assert.rejects(()=>controller.revoke(
      'https://erp-stage.drvotech.com',req,res,business,branch,role,{roleId:role}));
    assert.deepEqual(await controller.list(req,res,business,branch),{invitations:[]});
    assert.deepEqual(await controller.revoke(
      'https://erp-stage.drvotech.com',req,res,business,branch,role,{}),{revoked:true});
  }finally{
    if(old===undefined)delete process.env.DRVO_K5_ORIGIN;
    else process.env.DRVO_K5_ORIGIN=old;
  }
});

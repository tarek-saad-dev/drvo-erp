"use strict";
// CU-04 CRM follow-up desk (SQL034): validation, tenant isolation, SQL error mapping.
// Unit level with a fake pool: NO SQL Server was run for these tests.
const test=require("node:test");
const assert=require("node:assert/strict");
const {CustomerFollowUpService}=require("../dist/customers/customer-follow-up.service");
const {CustomerFollowUpController}=require("../dist/customers/customer-follow-up.controller");
const GUID=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const actor={tenantId:GUID(1),accountId:GUID(2),username:"unit",sessionVersion:1,mustChangePassword:false};
const token="A".repeat(43);
const future=days=>new Date(Math.ceil((Date.now()+days*86400000)/60000)*60000).toISOString();
function on(env){const old={};for(const [k,v] of Object.entries(env)){old[k]=process.env[k];process.env[k]=v;}
 return ()=>{for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}};}
const enable=()=>on({DRVO_CUSTOMERS_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES"});
function fakePool(handler){
 const calls=[];
 return {calls,getInternalPool(){return {request(){
  const inputs={};
  const req={input(name,_type,value){inputs[name]=value;return req;},
   async execute(procedure){calls.push({procedure,inputs});return handler(procedure,inputs);}};
  return req;
 }};}};
}
const noSql={getInternalPool(){throw Error("database access must not occur");}};
const sqlRow=(o={})=>({customerId:GUID(10),displayName:"CI Customer",phoneE164:"+201000000001",
 phoneMissing:false,profileMissing:false,birthDateMissing:false,addressMissing:false,
 sourceMissing:false,incomplete:false,hasNotes:false,consentState:"ACTIVE",lastAttemptAtUtc:null,
 lastChannel:null,lastOutcome:null,followUpDueUtc:null,followUpDue:false,attemptCount:0,...o});

test("follow-up desk disabled by default and never touches SQL",async()=>{
 const old=process.env.DRVO_CUSTOMERS_ENABLED;
 try{
  delete process.env.DRVO_CUSTOMERS_ENABLED;
  const svc=new CustomerFollowUpService(noSql);
  await assert.rejects(()=>svc.queue(actor,token,GUID(3),GUID(4),"ALL"),e=>e.getStatus?.()===503);
  await assert.rejects(()=>svc.attempts(actor,token,GUID(3),GUID(4),GUID(5)),e=>e.getStatus?.()===503);
  await assert.rejects(()=>svc.logAttempt(actor,token,GUID(3),GUID(4),GUID(8),GUID(5),
   {channel:"CALL",outcome:"REACHED"}),e=>e.getStatus?.()===503);
 }finally{if(old===undefined)delete process.env.DRVO_CUSTOMERS_ENABLED;else process.env.DRVO_CUSTOMERS_ENABLED=old;}
});

test("scope is rejected before SQL: spoofed tenant/ids/token, password-change sessions",async()=>{
 const restore=enable();
 try{
  const svc=new CustomerFollowUpService(noSql);
  const body={channel:"CALL",outcome:"REACHED"};
  for(const a of [{...actor,tenantId:"spoof"},{...actor,mustChangePassword:true},{...actor,sessionVersion:0}]){
   await assert.rejects(()=>svc.queue(a,token,GUID(3),GUID(4),"ALL"),e=>e.getStatus?.()===404);
   await assert.rejects(()=>svc.logAttempt(a,token,GUID(3),GUID(4),GUID(8),GUID(5),body),e=>e.getStatus?.()===404);
  }
  await assert.rejects(()=>svc.queue(actor,"bad",GUID(3),GUID(4),"ALL"),e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.queue(actor,token,"spoof",GUID(4),"ALL"),e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.attempts(actor,token,GUID(3),GUID(4),"bad"),e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.logAttempt(actor,token,GUID(3),GUID(4),"bad",GUID(5),body),e=>e.getStatus?.()===400);
 }finally{restore();}
});

test("queue filter and logAttempt reject forged/invalid payloads before SQL",async()=>{
 const restore=enable();
 try{
  const svc=new CustomerFollowUpService(noSql);
  for(const f of ["dormant","inactive","NEW","all"])
   await assert.rejects(()=>svc.queue(actor,token,GUID(3),GUID(4),f),e=>e.getStatus?.()===400,f);
  const bad=[
   {tenantId:GUID(1),channel:"CALL",outcome:"REACHED"},
   {channel:"SMS",outcome:"REACHED"},{channel:"CALL",outcome:"BUSY"},
   {channel:"CALL"},{outcome:"REACHED"},null,[],"x",
   {channel:"CALL",outcome:"CALL_BACK_LATER"},
   {channel:"CALL",outcome:"WRONG_NUMBER",followUpDueUtc:future(2)},
   {channel:"CALL",outcome:"REACHED",followUpDueUtc:"2026-11-20T12:00:30.000Z"},
   {channel:"CALL",outcome:"REACHED",note:"N".repeat(301)},
  ];
  for(const body of bad)
   await assert.rejects(()=>svc.logAttempt(actor,token,GUID(3),GUID(4),GUID(8),GUID(5),body),
    e=>e.getStatus?.()===400,JSON.stringify(body));
 }finally{restore();}
});

test("queue binds Tenant/Business/Branch from session+path and calls SQL034",async()=>{
 const restore=enable();
 try{
  const pool=fakePool(()=>({recordset:[sqlRow({incomplete:true})]}));
  const out=await new CustomerFollowUpService(pool).queue(actor,token,GUID(3),GUID(4),"INCOMPLETE");
  assert.equal(out.mode,"NONPOSTING_CRM_FOLLOW_UP_ONLY");
  assert.equal(out.messagingSent,false);
  assert.equal(out.dormantEvidence,"UNAVAILABLE_NO_POSTED_SALES");
  assert.equal(out.filter,"INCOMPLETE");
  assert.equal(out.rows[0].reasons.includes("INCOMPLETE_PROFILE"),true);
  const c=pool.calls[0];
  assert.equal(c.procedure,"core.ReadCustomerFollowUpQueue");
  assert.equal(c.inputs.TenantId,actor.tenantId);
  assert.equal(c.inputs.BusinessId,GUID(3));
  assert.equal(c.inputs.BranchId,GUID(4));
  assert.equal(c.inputs.Filter,"INCOMPLETE");
  assert.match(c.inputs.TokenHash,/^[0-9a-f]{64}$/);
 }finally{restore();}
});

test("logAttempt binds scope, idempotency key and maps SQL034 consent/conflict guards",async()=>{
 const restore=enable();
 try{
  const due=future(3);
  const pool=fakePool(()=>({recordset:[{id:GUID(9),created:true}]}));
  const out=await new CustomerFollowUpService(pool).logAttempt(actor,token,GUID(3),GUID(4),GUID(8),GUID(5),
   {channel:"CALL",outcome:"CALL_BACK_LATER",note:"  later  ",followUpDueUtc:due});
  assert.deepEqual(out,{id:GUID(9),created:true});
  const c=pool.calls[0];
  assert.equal(c.procedure,"core.LogCustomerContactAttempt");
  assert.equal(c.inputs.ClientRequestId,GUID(8));
  assert.equal(c.inputs.CustomerId,GUID(5));
  assert.equal(c.inputs.Channel,"CALL");
  assert.equal(c.inputs.Outcome,"CALL_BACK_LATER");
  assert.equal(c.inputs.Note,"later");
  assert.equal(c.inputs.FollowUpDueUtc.toISOString(),due);
  const expected={51131:404,51132:400,51133:409,51134:409,50000:503};
  for(const [number,status] of Object.entries(expected)){
   const svc=new CustomerFollowUpService(fakePool(()=>{throw Object.assign(Error("sql"),{number:Number(number)});}));
   await assert.rejects(()=>svc.logAttempt(actor,token,GUID(3),GUID(4),GUID(8),GUID(5),
    {channel:"CALL",outcome:"REACHED"}),e=>e.getStatus?.()===status,String(number));
  }
 }finally{restore();}
});

test("follow-up write endpoints reject foreign Origin before identity lookup",async()=>{
 const restore=on({DRVO_CUSTOMERS_ENABLED:"YES",DRVO_K5_AUTH_ENABLED:"YES",
  DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com"});
 try{
  const writer=new CustomerFollowUpController(
   {actorFromToken(){throw Error("must not authenticate");}},
   {logAttempt(){throw Error("must not write");},queue(){throw Error("must not read");},
    attempts(){throw Error("must not read");}},
  );
  await assert.rejects(()=>writer.log("https://attacker.invalid",GUID(8),
   {headers:{}},{setHeader(){}},GUID(3),GUID(4),GUID(5),{channel:"CALL",outcome:"REACHED"}),
   e=>e.getStatus?.()===401);
 }finally{restore();}
});

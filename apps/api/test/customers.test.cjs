const test=require("node:test");
const assert=require("node:assert/strict");
const {CustomersService}=require("../dist/customers/customers.service");
const GUID=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const actor={tenantId:GUID(1),accountId:GUID(2),username:"unit",sessionVersion:1,mustChangePassword:false};
const token="A".repeat(43);
test("Customers disabled by default, no SQL touched",async()=>{
 const old=process.env.DRVO_CUSTOMERS_ENABLED;
 try{
  delete process.env.DRVO_CUSTOMERS_ENABLED;
  const service=new CustomersService({getInternalPool(){throw Error("must not connect");}});
  await assert.rejects(()=>service.list(actor,token,GUID(3),GUID(4)),
   e=>e.getStatus?.()===503);
  await assert.rejects(()=>service.search(actor,token,GUID(3),GUID(4),"ahmed"),
   e=>e.getStatus?.()===503);
 }finally{if(old===undefined)delete process.env.DRVO_CUSTOMERS_ENABLED;
  else process.env.DRVO_CUSTOMERS_ENABLED=old;}
});
test("Customers strict input, no arbitrary Tenant or uncontrolled PII",async()=>{
 const old=process.env.DRVO_CUSTOMERS_ENABLED,oldAuth=process.env.DRVO_K5_AUTH_ENABLED;
 process.env.DRVO_CUSTOMERS_ENABLED="YES";process.env.DRVO_K5_AUTH_ENABLED="YES";
 try{
  const service=new CustomersService({getInternalPool(){throw Error("must not connect");}});
  const bodies=[
   {displayName:"Alice",tenantId:GUID(4)},
   {displayName:"Alice",phoneE164:"010123"},
   {displayName:" Alice"},
   {displayName:""},
   {displayName:"Alice",phoneE164:"+0"},
   {displayName:"A".repeat(161)},
  ];
  for(const body of bodies){
   await assert.rejects(()=>service.create(actor,token,GUID(3),GUID(4),GUID(5),body),
    e=>e.getStatus?.()===400);
  }
  await assert.rejects(()=>service.create(actor,token,GUID(3),GUID(4),"not-guid",{displayName:"Alice"}),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.list({...actor,mustChangePassword:true},token,GUID(3),GUID(4)),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>service.list(actor,token,"malformed",GUID(4)),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>service.search(actor,token,GUID(3),GUID(4),""),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.search(actor,token,GUID(3),GUID(4),null),
   e=>e.getStatus?.()===400);
 }finally{
  for(const [key,val] of [["DRVO_CUSTOMERS_ENABLED",old],["DRVO_K5_AUTH_ENABLED",oldAuth]]){
   if(val===undefined)delete process.env[key];else process.env[key]=val;
  }
 }
});
test("search invokes SearchCustomers with query and phone digits",async()=>{
 const old=process.env.DRVO_CUSTOMERS_ENABLED,oldAuth=process.env.DRVO_K5_AUTH_ENABLED;
 process.env.DRVO_CUSTOMERS_ENABLED="YES";process.env.DRVO_K5_AUTH_ENABLED="YES";
 try{
  let executed="";
  const inputs={};
  const service=new CustomersService({
   getInternalPool(){
    return {request(){
     const chain={
      input(name,_type,value){inputs[name]=value;return chain;},
      async execute(proc){executed=proc;return {recordset:[
       {customerId:GUID(9),displayName:"أحمد",phoneE164:"+201011112222",isActive:true},
      ]};},
     };
     return chain;
    }};
   },
  });
  const result=await service.search(actor,token,GUID(3),GUID(4),"01011112222");
  assert.equal(executed,"core.SearchCustomers");
  assert.equal(inputs.Query,"01011112222");
  assert.equal(inputs.PhoneDigits,"201011112222");
  assert.equal(result.searchScope,"BUSINESS");
  assert.equal(result.limit,20);
  assert.equal(result.customers.length,1);
  assert.equal(result.customers[0].displayName,"أحمد");
 }finally{
  for(const [key,val] of [["DRVO_CUSTOMERS_ENABLED",old],["DRVO_K5_AUTH_ENABLED",oldAuth]]){
   if(val===undefined)delete process.env[key];else process.env[key]=val;
  }
 }
});
test("create maps phoneConflict to ConflictException with existing id",async()=>{
 const old=process.env.DRVO_CUSTOMERS_ENABLED,oldAuth=process.env.DRVO_K5_AUTH_ENABLED;
 process.env.DRVO_CUSTOMERS_ENABLED="YES";process.env.DRVO_K5_AUTH_ENABLED="YES";
 try{
  const existing=GUID(9);
  const service=new CustomersService({
   getInternalPool(){
    return {request(){
     const chain={
      input(){return chain;},
      async execute(){return {recordset:[
       {id:existing,created:false,existingCustomerId:existing,phoneConflict:true},
      ]};},
     };
     return chain;
    }};
   },
  });
  await assert.rejects(
   ()=>service.create(actor,token,GUID(3),GUID(4),GUID(5),
    {displayName:"Dup",phoneE164:"+201012345678"}),
   e=>{
    assert.equal(e.getStatus?.(),409);
    assert.equal(e.getResponse?.().code,"CUSTOMER_PHONE_EXISTS");
    assert.equal(e.getResponse?.().existingCustomerId,existing);
    return true;
   });
 }finally{
  for(const [key,val] of [["DRVO_CUSTOMERS_ENABLED",old],["DRVO_K5_AUTH_ENABLED",oldAuth]]){
   if(val===undefined)delete process.env[key];else process.env[key]=val;
  }
 }
});

function withCustomersEnv(fn){
 const old=process.env.DRVO_CUSTOMERS_ENABLED,oldAuth=process.env.DRVO_K5_AUTH_ENABLED;
 process.env.DRVO_CUSTOMERS_ENABLED="YES";process.env.DRVO_K5_AUTH_ENABLED="YES";
 return Promise.resolve().then(fn).finally(()=>{
  for(const [key,val] of [["DRVO_CUSTOMERS_ENABLED",old],["DRVO_K5_AUTH_ENABLED",oldAuth]]){
   if(val===undefined)delete process.env[key];else process.env[key]=val;
  }
 });
}
function recordingService(recordset){
 const calls={proc:"",inputs:{}};
 const service=new CustomersService({getInternalPool(){
  return {request(){
   const chain={
    input(name,_type,value){calls.inputs[name]=value;return chain;},
    async execute(proc){calls.proc=proc;return {recordset};},
   };
   return chain;
  }};
 }});
 return {service,calls};
}
const profileRow=(over={})=>({customerId:GUID(9),displayName:"Ahmed",phoneE164:"+201012345678",
 profileExists:true,birthDate:"1990-01-01",address:"Cairo",notes:null,cameFrom:"instagram",
 cameFromDetails:null,referralCode:null,offersConsentActive:false,offersConsentedAtUtc:null,
 offersConsentEvidence:null,offersConsentRevokedAtUtc:null,updatedAtUtc:null,...over});

test("profile disabled by default and never connects",async()=>{
 const old=process.env.DRVO_CUSTOMERS_ENABLED;
 try{
  delete process.env.DRVO_CUSTOMERS_ENABLED;
  const service=new CustomersService({getInternalPool(){throw Error("must not connect");}});
  await assert.rejects(()=>service.getProfile(actor,token,GUID(3),GUID(4),GUID(9)),
   e=>e.getStatus?.()===503);
  await assert.rejects(()=>service.upsertProfile(actor,token,GUID(3),GUID(4),GUID(9),{}),
   e=>e.getStatus?.()===503);
 }finally{if(old===undefined)delete process.env.DRVO_CUSTOMERS_ENABLED;
  else process.env.DRVO_CUSTOMERS_ENABLED=old;}
});
test("profile write strict input: source rules, DOB, consent action, forged scope",async()=>{
 await withCustomersEnv(async()=>{
  const service=new CustomersService({getInternalPool(){throw Error("must not connect");}});
  const bad=[
   {tenantId:GUID(4)},
   {customerId:GUID(8)},
   {cameFrom:"legacy_made_up"},
   {cameFrom:"word_of_mouth"},
   {cameFrom:"word_of_mouth",cameFromDetails:"  "},
   {cameFrom:"referral_code"},
   {cameFromDetails:"orphan detail"},
   {referralCode:"ORPHAN"},
   {birthDate:"1990-13-01"},{birthDate:"1990-02-30"},{birthDate:"90-01-01"},
   {birthDate:"1899-12-31"},{birthDate:"2999-01-01"},{birthDate:19900101},
   {address:"A".repeat(201)},{notes:"N".repeat(501)},{address:42},
   {notes:"bad\u0000byte"},
   {offersConsentAction:"YES"},{offersConsentAction:true},
   {whatsappOffersConsentConfirmed:true},
  ];
  for(const body of bad){
   await assert.rejects(()=>service.upsertProfile(actor,token,GUID(3),GUID(4),GUID(9),body),
    e=>e.getStatus?.()===400,JSON.stringify(body));
  }
  for(const body of [null,[],"x",7]){
   await assert.rejects(()=>service.upsertProfile(actor,token,GUID(3),GUID(4),GUID(9),body),
    e=>e.getStatus?.()===400);
  }
  await assert.rejects(()=>service.upsertProfile(actor,token,GUID(3),GUID(4),"nope",{}),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>service.getProfile(actor,token,GUID(3),GUID(4),"nope"),
   e=>e.getStatus?.()===404);
  await assert.rejects(()=>service.getProfile({...actor,mustChangePassword:true},
   token,GUID(3),GUID(4),GUID(9)),e=>e.getStatus?.()===404);
 });
});
test("profile upsert passes normalized Cashier source fields and never implies consent",async()=>{
 await withCustomersEnv(async()=>{
  const {service,calls}=recordingService([profileRow()]);
  const view=await service.upsertProfile(actor,token,GUID(3),GUID(4),GUID(9),{
   birthDate:"1990-01-01",address:"  Cairo  ",notes:"  VIP\nprefers morning ",
   cameFrom:"instagram",cameFromDetails:"stale detail",referralCode:"STALE",
  });
  assert.equal(calls.proc,"core.UpsertCustomerProfile");
  assert.equal(calls.inputs.CustomerId,GUID(9));
  assert.equal(calls.inputs.BirthDate,"1990-01-01");
  assert.equal(calls.inputs.Address,"Cairo");
  assert.equal(calls.inputs.Notes,"VIP\nprefers morning");
  assert.equal(calls.inputs.CameFrom,"instagram");
  assert.equal(calls.inputs.CameFromDetails,null);
  assert.equal(calls.inputs.ReferralCode,null);
  assert.equal(calls.inputs.ConsentAction,null,"omitted action must stay NULL (no implied consent)");
  assert.equal(view.offersConsentActive,false);
  assert.equal(view.incomplete,false);
 });
});
test("explicit GRANT/REVOKE consent action reaches SQL; empty profile has no source",async()=>{
 await withCustomersEnv(async()=>{
  for(const action of ["GRANT","REVOKE"]){
   const {service,calls}=recordingService([profileRow({
    offersConsentActive:action==="GRANT",
    offersConsentedAtUtc:new Date("2026-11-20T10:00:00Z"),
    offersConsentEvidence:"STAFF_CONFIRMED_CUSTOMER_WHATSAPP_OFFERS"})]);
   const view=await service.upsertProfile(actor,token,GUID(3),GUID(4),GUID(9),
    {offersConsentAction:action});
   assert.equal(calls.inputs.ConsentAction,action);
   assert.equal(calls.inputs.CameFrom,null);
   assert.equal(view.offersConsentedAtUtc,"2026-11-20T10:00:00.000Z");
   assert.equal(view.offersConsentEvidence,"STAFF_CONFIRMED_CUSTOMER_WHATSAPP_OFFERS");
  }
 });
});
test("getProfile maps incomplete flag, SQL 51131 -> 404 and 51132 -> 400",async()=>{
 await withCustomersEnv(async()=>{
  const {service,calls}=recordingService([profileRow({
   profileExists:false,birthDate:null,address:null,cameFrom:null})]);
  const view=await service.getProfile(actor,token,GUID(3),GUID(4),GUID(9));
  assert.equal(calls.proc,"core.ReadCustomerProfile");
  assert.equal(view.profileExists,false);
  assert.equal(view.incomplete,true);
  for(const [number,status] of [[51131,404],[51132,400],[51133,409],[50000,503]]){
   const failing=new CustomersService({getInternalPool(){
    return {request(){const c={input(){return c;},
     async execute(){throw Object.assign(Error("sql"),{number});}};return c;}};
   }});
   await assert.rejects(()=>failing.upsertProfile(actor,token,GUID(3),GUID(4),GUID(9),{}),
    e=>e.getStatus?.()===status,String(number));
  }
 });
});

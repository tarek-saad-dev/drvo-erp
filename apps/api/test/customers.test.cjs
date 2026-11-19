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

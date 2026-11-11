const test=require("node:test");
const assert=require("node:assert/strict");
const { CatalogService }=require("../dist/catalog/catalog.service");
const { CatalogController }=require("../dist/catalog/catalog.controller");
const id=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const actor={tenantId:id(1),accountId:id(2),username:"unit",sessionVersion:1,mustChangePassword:false};
const token="A".repeat(43);

test("Catalog disabled by default before database access",async()=>{
 const old=process.env.DRVO_CATALOG_ENABLED;
 try{
  delete process.env.DRVO_CATALOG_ENABLED;
  const service=new CatalogService({getInternalPool(){throw Error("must not query");}});
  await assert.rejects(()=>service.list(actor,token,id(3),id(4)),e=>e.getStatus?.()===503);
  await assert.rejects(()=>service.addCategory(actor,token,id(3),id(4),id(5),{displayName:"Hair"}),
    e=>e.getStatus?.()===503);
 }finally{if(old===undefined)delete process.env.DRVO_CATALOG_ENABLED;
  else process.env.DRVO_CATALOG_ENABLED=old;}
});

test("Invalid request fields and untrusted IDs cannot reach SQL",async()=>{
 const previousAuth=process.env.DRVO_K5_AUTH_ENABLED;
 const previous=process.env.DRVO_CATALOG_ENABLED;
 process.env.DRVO_K5_AUTH_ENABLED="YES";process.env.DRVO_CATALOG_ENABLED="YES";
 try{
  const service=new CatalogService({getInternalPool(){throw Error("must not query");}});
  for(const body of [
    {displayName:"Name",tenantId:id(7)}, {displayName:" Name"},
    {displayName:""}, {displayName:"x".repeat(101)}, {name:"wrong"},
  ])await assert.rejects(()=>service.addCategory(actor,token,id(3),id(4),id(5),body),
    e=>e.getStatus?.()===400);
  for(const body of [
    {kind:"SERVICE",displayName:"Hair",currency:"EGP",priceMinor:-1,durationMinutes:30},
    {kind:"SERVICE",displayName:"Hair",currency:"EGP",priceMinor:100,durationMinutes:null},
    {kind:"PRODUCT",displayName:"Cream",currency:"EGP",priceMinor:100,durationMinutes:30},
    {kind:"PRODUCT",displayName:"Cream",currency:"egp",priceMinor:100},
    {kind:"PRODUCT",displayName:"Cream",currency:"EGP",priceMinor:1.5},
    {kind:"PRODUCT",displayName:"Cream",currency:"EGP",priceMinor:1,scope:id(7)},
  ])await assert.rejects(()=>service.addOffering(actor,token,id(3),id(4),id(5),body),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.list({...actor,tenantId:"client-spoof"},token,id(3),id(4)),
    e=>e.getStatus?.()===404);
  await assert.rejects(()=>service.list(actor,token,"spoof",id(4)),e=>e.getStatus?.()===404);
  await assert.rejects(()=>service.list(actor,"invalid",id(3),id(4)),e=>e.getStatus?.()===404);
 }finally{
  if(previousAuth===undefined)delete process.env.DRVO_K5_AUTH_ENABLED;
  else process.env.DRVO_K5_AUTH_ENABLED=previousAuth;
  if(previous===undefined)delete process.env.DRVO_CATALOG_ENABLED;
  else process.env.DRVO_CATALOG_ENABLED=previous;
 }
});

test("Controller blocks invalid Origin before session/SQL access",async()=>{
 const previousAuth=process.env.DRVO_K5_AUTH_ENABLED;
 const previous=process.env.DRVO_CATALOG_ENABLED;
 const prevOrigin=process.env.DRVO_K5_ORIGIN;
 process.env.DRVO_K5_AUTH_ENABLED="YES";
 process.env.DRVO_CATALOG_ENABLED="YES";
 process.env.DRVO_K5_ORIGIN="https://erp-stage.drvotech.com";
 try{
  const control=new CatalogController(
    {actorFromToken(){throw Error("auth should not be reached");}},
    {addCategory(){throw Error("SQL should not be reached");}}
  );
  await assert.rejects(()=>control.addCategory("https://attacker.example",id(6),
    {headers:{}},{setHeader(){}},id(3),id(4),{displayName:"Hair"}),
    e=>e.getStatus?.()===401);
 }finally{
  for(const [key,value] of [
    ["DRVO_K5_AUTH_ENABLED",previousAuth],
    ["DRVO_CATALOG_ENABLED",previous],
    ["DRVO_K5_ORIGIN",prevOrigin],
  ]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});

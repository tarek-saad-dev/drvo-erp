const test=require("node:test");
const assert=require("node:assert/strict");
const {parsePosDraftInput,PosDraftsService}=require("../dist/pos-drafts/pos-drafts.service");
const {PosDraftsController}=require("../dist/pos-drafts/pos-drafts.controller");
const ID=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,mustChangePassword:false,username:"test"};
const token="A".repeat(43);
const good={lines:[{offeringId:ID(7),quantity:2}]};
function vars(values){
 const old={};for(const [k,v] of Object.entries(values)){old[k]=process.env[k];process.env[k]=v;}
 return()=>{for(const [k,v] of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;}}
}
test("POS draft defaults OFF and never reads SQL",async()=>{
 const old=process.env.DRVO_POS_DRAFTS_ENABLED;delete process.env.DRVO_POS_DRAFTS_ENABLED;
 try{
  const svc=new PosDraftsService({getInternalPool(){throw Error("SQL must stay OFF");}});
  await assert.rejects(()=>svc.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
  await assert.rejects(()=>svc.create(actor,token,ID(3),ID(4),ID(8),good),e=>e.getStatus?.()===503);
 }finally{if(old!==undefined)process.env.DRVO_POS_DRAFTS_ENABLED=old;}
});
test("POS draft exact DTO and SHA256 normalized lines, denies client financial and Tenant fields",()=>{
 const parsed=parsePosDraftInput(good);
 assert.equal(parsed.lines.length,1);assert.match(parsed.hash,/^[0-9a-f]{64}$/);
 assert.equal(parsed.json,JSON.stringify(good.lines));
 for(const input of [
  {...good,tenantId:ID(1)}, {...good,priceMinor:0},
  {lines:[{...good.lines[0],discountMinor:20}]},{lines:[{...good.lines[0],quantity:0}]},
  {lines:[{...good.lines[0],quantity:1.2}]},{lines:[{offeringId:"wrong",quantity:2}]},
  {lines:[...good.lines,...good.lines]}, {lines:[]},{lines:"no"}, null,
 ])assert.throws(()=>parsePosDraftInput(input),e=>e.getStatus?.()===400);
});
test("Invalid actor/scope/retry key denied before database is touched",async()=>{
 const restore=vars({DRVO_K5_AUTH_ENABLED:"YES",DRVO_CATALOG_ENABLED:"YES",
  DRVO_POS_DRAFTS_ENABLED:"YES"});
 try{
  const svc=new PosDraftsService({getInternalPool(){throw Error("No SQL");}});
  await assert.rejects(()=>svc.create(actor,token,ID(3),ID(4),"not-guid",good),e=>e.getStatus?.()===400);
  for(const a of [{...actor,tenantId:"spoof"},{...actor,sessionVersion:0},
   {...actor,mustChangePassword:true}]){
   await assert.rejects(()=>svc.list(a,token,ID(3),ID(4)),e=>e.getStatus?.()===404);
  }
  await assert.rejects(()=>svc.list(actor,"bad",ID(3),ID(4)),e=>e.getStatus?.()===404);
 }finally{restore();}
});
test("Draft POST rejects forged origin before auth and SQL",async()=>{
 const restore=vars({DRVO_K5_AUTH_ENABLED:"YES",DRVO_CATALOG_ENABLED:"YES",
  DRVO_POS_DRAFTS_ENABLED:"YES",DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com"});
 try{
  const ctrl=new PosDraftsController({actorFromToken(){throw Error("auth accessed");}},
   {create(){throw Error("save accessed");}});
  await assert.rejects(()=>ctrl.create("https://attacker.example",ID(9),
   {headers:{}},{setHeader(){}},ID(3),ID(4),good),e=>e.getStatus?.()===401);
 }finally{restore();}
});

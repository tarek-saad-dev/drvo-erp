const test = require("node:test");
const assert = require("node:assert/strict");
const { computeListPricePreview, PosPreviewService } = require("../dist/pos-preview/pos-preview.service");
const { PosPreviewController } = require("../dist/pos-preview/pos-preview.controller");
const ID = n => String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const ITEM = (id, priceMinor, currency="EGP", active=true) => ({
  offeringId: ID(id), categoryId: null, kind: "SERVICE", displayName: "Service",
  priceMinor, currency, durationMinutes: 30, isActive: active,
});
const lines = entries => ({lines: entries.map(([n, quantity]) => ({offeringId: ID(n), quantity}))});
function setEnv(values) {
  const old = Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));
  for(const [k,v] of Object.entries(values)) process.env[k]=v;
  return ()=>{for(const [k,v] of Object.entries(old)) {if(v===undefined)delete process.env[k];else process.env[k]=v;}};
}

test("Server preview recomputes Catalog list prices with integer minor units and never posts",()=>{
  const result=computeListPricePreview([ITEM(1,12501),ITEM(2,999)], lines([[1,2],[2,3]]));
  assert.equal(result.listPriceSubtotalMinor, 27_999);
});
test("Preview rejects injected amount, discount, tenant and extra fields",()=>{
  for(const value of [
    {...lines([[1,1]]), priceMinor:0}, {lines:[{offeringId:ID(1),quantity:1,unitPriceMinor:0}]},
    {lines:[{offeringId:ID(1),quantity:1,tenantId:ID(3)}]},
    {lines:[{offeringId:ID(1),quantity:1,discountMinor:10}]},
    {lines:[], tenantId:ID(3)}, {lines:[]}, {lines:"test"},
  ]) assert.throws(()=>computeListPricePreview([ITEM(1,100)],value),e=>e.getStatus?.()===400);
});
test("Duplicate, inactive, foreign and unsafe items never return money",()=>{
  const items=[ITEM(1,100),ITEM(2,200,"USD"),ITEM(3,100,"EGP",false),
    ITEM(4,100,"JPY"),ITEM(5,9_000_000_000_000)];
  for (const input of [lines([[1,1],[1,1]]), lines([[1,21]]),
    lines([[3,1]]),lines([[9,1]]),lines([[1,1],[2,1]]),
    lines([[4,1]]),lines([[5,2]])]) {
    assert.throws(()=>computeListPricePreview(items,input));
  }
});
test("API/service disabled by default before authentication or data access",async()=>{
  const old=process.env.DRVO_POS_PREVIEW_ENABLED;
  delete process.env.DRVO_POS_PREVIEW_ENABLED;
  try{
    const controller=new PosPreviewController({actorFromToken(){throw Error("auth touched");}}, {});
    await assert.rejects(()=>controller.offerings({headers:{}},{setHeader(){}},ID(2),ID(3)),
      e=>e.getStatus?.()===503);
    const service=new PosPreviewService({list(){throw Error("SQL touched");}});
    await assert.rejects(()=>service.checkout({}, "", ID(2), ID(3),lines([[1,1]])),
      e=>e.getStatus?.()===503);
  }finally{if(old===undefined)delete process.env.DRVO_POS_PREVIEW_ENABLED;else process.env.DRVO_POS_PREVIEW_ENABLED=old;}
});
test("Origin guard denies cross-site POST before loading actor",async()=>{
  const restore=setEnv({DRVO_K5_AUTH_ENABLED:"YES",DRVO_CATALOG_ENABLED:"YES",
    DRVO_POS_PREVIEW_ENABLED:"YES",DRVO_K5_ORIGIN:"https://erp-stage.drvotech.com"});
  try {
    const controller=new PosPreviewController({actorFromToken(){throw Error("not allowed");}}, {});
    await assert.rejects(()=>controller.checkout("https://attacker.example",
      {headers:{}},{setHeader(){}},ID(2),ID(3),lines([[1,1]])), e=>e.getStatus?.()===401);
  }finally{restore();}
});
test("Service always uses trusted scoped catalog for read and writes nothing",async()=>{
  const restore=setEnv({DRVO_K5_AUTH_ENABLED:"YES",DRVO_CATALOG_ENABLED:"YES",
    DRVO_POS_PREVIEW_ENABLED:"YES"});
  let calls=0;
  const actor={tenantId:ID(1)};
  const cat={list(a,t,b,br){calls++;assert.equal(a,actor);assert.equal(t,"secret");
    assert.equal(b,ID(2));assert.equal(br,ID(3));return Promise.resolve({offerings:[ITEM(1,300)]});}};
  try{
    const service=new PosPreviewService(cat);
    const got=await service.checkout(actor,"secret",ID(2),ID(3),lines([[1,2]]));
    assert.equal(got.listPriceSubtotalMinor,600); assert.equal(got.persisted,false);
    assert.equal(calls,1);
  }finally{restore();}
});

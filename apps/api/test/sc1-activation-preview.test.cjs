const test=require("node:test");
const assert=require("node:assert/strict");
const {ActivationPreviewService}=require("../dist/modules/activation-preview.service");
const {ActivationPreviewController}=require("../dist/modules/activation-preview.controller");
const id=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const actor={tenantId:id(1),accountId:id(2),username:"unit",sessionVersion:1,mustChangePassword:false};

test("SC1 private preview is disabled by default before auth/SQL",async()=>{
 const saved=process.env.DRVO_SC1_PREVIEW_READ_ENABLED;
 try{
  delete process.env.DRVO_SC1_PREVIEW_READ_ENABLED;
  const svc=new ActivationPreviewService({readAuthorizedBranch(){throw Error("DB touched");}});
  const ctrl=new ActivationPreviewController({actorFromToken(){throw Error("auth touched");}},svc);
  await assert.rejects(()=>svc.preview(actor,id(3),id(4),"Booking"),e=>e.getStatus?.()===503);
  await assert.rejects(()=>ctrl.preview({headers:{}},{setHeader(){}},id(3),id(4),"Booking"),
    e=>e.getStatus?.()===503);
 }finally{
  if(saved===undefined)delete process.env.DRVO_SC1_PREVIEW_READ_ENABLED;
  else process.env.DRVO_SC1_PREVIEW_READ_ENABLED=saved;
 }
});
test("SC1 validates current Business scope and returns UNQUOTABLE only",async()=>{
 const auth=process.env.DRVO_K5_AUTH_ENABLED,sc1=process.env.DRVO_SC1_PREVIEW_READ_ENABLED;
 process.env.DRVO_K5_AUTH_ENABLED="YES";
 process.env.DRVO_SC1_PREVIEW_READ_ENABLED="YES";
 try{
  let checked=0;
  const service=new ActivationPreviewService({
   readAuthorizedBranch(a,b,br,action){
    assert.deepEqual([a.tenantId,b,br,action],
      [actor.tenantId,id(3),id(4),"branch.read"]);checked++;
   },
  });
  const result=await service.preview(actor,id(3),id(4),"Booking");
  assert.equal(checked,1);
  assert.equal(result.status,"UNQUOTABLE");
  assert.equal(result.approvable,false);
  assert.equal(result.moduleKey,"Booking");
  assert.equal("quote" in result,false);
  assert.equal("activation" in result,false);
  assert.equal(result.reasonCodes.length,4);
  await assert.rejects(()=>service.preview(actor,id(3),id(4),"../../Other"),e=>e.getStatus?.()===400);
  await assert.rejects(()=>service.preview({...actor,mustChangePassword:true},id(3),id(4),"Booking"),
    e=>e.getStatus?.()===404);
  const denied=new ActivationPreviewService({readAuthorizedBranch(){
    const err=new Error("not found");err.getStatus=()=>404;throw err;
  }});
  await assert.rejects(()=>denied.preview(actor,id(3),id(4),"Booking"),
    e=>e.getStatus?.()===404);
 }finally{
  if(auth===undefined)delete process.env.DRVO_K5_AUTH_ENABLED;
  else process.env.DRVO_K5_AUTH_ENABLED=auth;
  if(sc1===undefined)delete process.env.DRVO_SC1_PREVIEW_READ_ENABLED;
  else process.env.DRVO_SC1_PREVIEW_READ_ENABLED=sc1;
 }
});

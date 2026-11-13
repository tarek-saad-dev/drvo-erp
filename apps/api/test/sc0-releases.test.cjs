const test=require("node:test");
const assert=require("node:assert/strict");
const {ReleaseCatalogService}=require("../dist/modules/release-catalog.service");
const {ReleaseCatalogController}=require("../dist/modules/release-catalog.controller");
const guid=n=>String(n).padStart(8,"0")+"-0000-4000-8000-000000000001";
const actor={tenantId:guid(1),accountId:guid(2),username:"unit",
  sessionVersion:1,mustChangePassword:false};
test("SC0 release endpoint OFF by default without DB/auth reads",async()=>{
 const old=process.env.DRVO_SC0_RELEASE_READ_ENABLED;
 try{
  delete process.env.DRVO_SC0_RELEASE_READ_ENABLED;
  const svc=new ReleaseCatalogService({readAuthorizedBranch(){throw Error("called");}});
  await assert.rejects(()=>svc.list(actor,guid(3),guid(4)),e=>e.getStatus?.()===503);
  const controller=new ReleaseCatalogController({actorFromToken(){throw Error("called");}},svc);
  await assert.rejects(()=>controller.list({headers:{}},{setHeader(){}},guid(3),guid(4)),
    e=>e.getStatus?.()===503);
 }finally{
  if(old===undefined)delete process.env.DRVO_SC0_RELEASE_READ_ENABLED;
  else process.env.DRVO_SC0_RELEASE_READ_ENABLED=old;
 }
});
test("SC0 read-only API verifies Business/Branch and returns NO released claims",async()=>{
 const prevK5=process.env.DRVO_K5_AUTH_ENABLED;
 const prev=process.env.DRVO_SC0_RELEASE_READ_ENABLED;
 process.env.DRVO_K5_AUTH_ENABLED="YES";
 process.env.DRVO_SC0_RELEASE_READ_ENABLED="YES";
 try{
  let checked=0;
  const svc=new ReleaseCatalogService({
   readAuthorizedBranch(a,b,br,action){
    assert.equal(a.tenantId,actor.tenantId);
    assert.equal(b,guid(3));assert.equal(br,guid(4));
    assert.equal(action,"branch.read");checked++;
   },
  });
  assert.deepEqual(await svc.list(actor,guid(3),guid(4)),
    {releases:[],status:"NO_VERIFIED_RELEASES"});
  assert.equal(checked,1);
  const denied=new ReleaseCatalogService({readAuthorizedBranch(){
   const e=new Error("not found");e.getStatus=()=>404;throw e;
  }});
  await assert.rejects(()=>denied.list(actor,guid(3),guid(4)),e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.list({...actor,mustChangePassword:true},guid(3),guid(4)),
   e=>e.getStatus?.()===404);
 }finally{
  if(prevK5===undefined)delete process.env.DRVO_K5_AUTH_ENABLED;
  else process.env.DRVO_K5_AUTH_ENABLED=prevK5;
  if(prev===undefined)delete process.env.DRVO_SC0_RELEASE_READ_ENABLED;
  else process.env.DRVO_SC0_RELEASE_READ_ENABLED=prev;
 }
});

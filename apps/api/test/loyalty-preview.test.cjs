'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {LoyaltyService}=require('../dist/loyalty/loyalty.service');
const {LoyaltyController}=require('../dist/loyalty/loyalty.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'unit',mustChangePassword:false};
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
const ENABLED={DRVO_LOYALTY_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'};
function identity(calls,deny=false){
 return {async readAuthorizedBranch(a,b,br,action){
  calls.push([b,br,action]);
  if(deny){const e=new Error('denied');e.getStatus=()=>404;throw e;}
  return {tenantId:a.tenantId,businessId:b,branchId:br,branchName:'x'};
 }};
}
const status=e=>e.getStatus?.();

test('Loyalty is disabled by default, before auth, session or body parsing',async()=>{
 await withEnv({DRVO_LOYALTY_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const svc=new LoyaltyService({readAuthorizedBranch(){throw Error('authz touched');}});
  await assert.rejects(()=>svc.config(actor,ID(3),ID(4)),e=>status(e)===503);
  await assert.rejects(()=>svc.previewRedeem(actor,ID(3),ID(4),{}),e=>status(e)===503);
  const ctrl=new LoyaltyController({actorFromToken(){throw Error('auth touched');}},svc);
  const res={setHeader(){}};
  await assert.rejects(()=>ctrl.config({headers:{}},res,ID(3),ID(4)),e=>status(e)===503);
  for(const m of ['rewards','redeem','adjust','reverseSale','validateConfig'])
   await assert.rejects(()=>ctrl[m]('https://x.example',{headers:{}},res,ID(3),ID(4),{}),e=>status(e)===503,m);
 });
});

test('cross-site preview POST is denied before session resolution',async()=>{
 await withEnv({...ENABLED,DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new LoyaltyController({actorFromToken(){throw Error('auth touched');}},{});
  for(const m of ['rewards','redeem','adjust','reverseSale','validateConfig']){
   await assert.rejects(()=>ctrl[m]('https://evil.example',{headers:{}},{setHeader(){}},ID(3),ID(4),{}),
    e=>status(e)===401,m);
   await assert.rejects(()=>ctrl[m](undefined,{headers:{}},{setHeader(){}},ID(3),ID(4),{}),
    e=>status(e)===401,m);
  }
 });
});

test('scope: invalid UUIDs and unauthorized branches fail before any preview math',async()=>{
 await withEnv(ENABLED,async()=>{
  const calls=[];
  const svc=new LoyaltyService(identity(calls));
  await assert.rejects(()=>svc.config(actor,'x',ID(4)),e=>status(e)===404);
  await assert.rejects(()=>svc.config({...actor,mustChangePassword:true},ID(3),ID(4)),e=>status(e)===404);
  assert.equal(calls.length,0);
  const denied=new LoyaltyService(identity([],true));
  await assert.rejects(()=>denied.previewAdjust(actor,ID(3),ID(4),
   {pointsBalance:10,pointsDelta:5,notes:'n'}),e=>status(e)===404);
  const ok=await svc.config(actor,ID(3),ID(4));
  assert.deepEqual(calls,[[ID(3),ID(4),'branch.read']]);
  assert.equal(ok.state,'UNPOSTED_LOYALTY_PREVIEW');assert.equal(ok.persisted,false);
  assert.equal(ok.financialPostingState,'NOT_AUTHORIZED');assert.equal(ok.messagingSend,'NOT_AUTHORIZED');
  assert.equal(ok.cutClubConfig.tiers.notifyOnUpgrade,false);
  assert.match(ok.earnRule,/NOT_PORTED/);
  assert.equal(ok.rewards.length,4);assert.deepEqual([...ok.tiers],['BRONZE','SILVER','GOLD','VIP']);
 });
});

test('rewards / redeem / adjust / reverse previews return unposted results',async()=>{
 await withEnv(ENABLED,async()=>{
  const svc=new LoyaltyService(identity([]));
  const rw=await svc.previewRewards(actor,ID(3),ID(4),{pointsBalance:450,tierCode:'SILVER'});
  assert.deepEqual(rw.rewards.map(r=>r.status),['available','available','locked','tier_locked']);
  assert.equal(rw.nextReward.id,3);assert.equal(rw.persisted,false);
  const red=await svc.previewRedeem(actor,ID(3),ID(4),
   {pointsBalance:450,tierCode:'SILVER',rewardId:2,confirm:true});
  assert.deepEqual([red.ok,red.pointsAfter,red.redemptionCode,red.persisted],[true,50,null,false]);
  const tier=await svc.previewRedeem(actor,ID(3),ID(4),
   {pointsBalance:5000,tierCode:'SILVER',rewardId:4,confirm:true});
  assert.equal(tier.issue,'TIER_TOO_LOW');
  const adj=await svc.previewAdjust(actor,ID(3),ID(4),{pointsBalance:10,pointsDelta:-11,notes:'n'});
  assert.deepEqual([adj.ok,adj.issue,adj.pointsAfter],[false,'INSUFFICIENT_POINTS',10]);
  const rev=await svc.previewReverseSale(actor,ID(3),ID(4),{pointsBalance:100,notes:'void',
   invoiceRows:[{movementType:'EARN_SALE',pointsDelta:40}]});
  assert.deepEqual([rev.ok,rev.pointsAfter,rev.financialPostingState],[true,60,'NOT_AUTHORIZED']);
  const cfg=await svc.validateConfig(actor,ID(3),ID(4),
   {cutClubConfig:JSON.parse(JSON.stringify((await svc.config(actor,ID(3),ID(4))).cutClubConfig))});
  assert.equal(cfg.persisted,false);assert.equal(cfg.cutClubConfig.tiers.notifyOnUpgrade,false);
 });
});

test('malformed Loyalty preview payloads fail 400',async()=>{
 await withEnv(ENABLED,async()=>{
  const svc=new LoyaltyService(identity([]));
  const bad=(p,body)=>assert.rejects(()=>svc[p](actor,ID(3),ID(4),body),e=>status(e)===400,p+JSON.stringify(body));
  const base={pointsBalance:100,tierCode:'BRONZE'};
  await bad('previewRewards',{...base,extra:1});
  await bad('previewRewards',{pointsBalance:100});
  await bad('previewRewards',{pointsBalance:1.5,tierCode:'BRONZE'});
  await bad('previewRewards',{pointsBalance:-1,tierCode:'BRONZE'});
  await bad('previewRewards',{pointsBalance:100,tierCode:'PLATINUM'});
  await bad('previewRewards',[]);await bad('previewRewards',null);
  await bad('previewRedeem',{...base,rewardId:1});
  await bad('previewRedeem',{...base,rewardId:1,confirm:true,branchId:ID(4)});
  await bad('previewRedeem',{pointsBalance:'100',tierCode:'BRONZE',rewardId:1,confirm:true});
  await bad('previewRedeem',{pointsBalance:100,tierCode:'x',rewardId:1,confirm:true});
  await bad('previewAdjust',{pointsBalance:100,pointsDelta:0,notes:'n'});
  await bad('previewAdjust',{pointsBalance:100,pointsDelta:5,notes:''});
  await bad('previewAdjust',{pointsBalance:100,pointsDelta:5,notes:'n',tenantId:ID(1)});
  await bad('previewAdjust',{pointsBalance:-5,pointsDelta:5,notes:'n'});
  await bad('previewReverseSale',{pointsBalance:1,notes:'n',invoiceRows:'x'});
  await bad('previewReverseSale',{pointsBalance:1,notes:'n',invoiceRows:Array(201).fill({movementType:'EARN_SALE',pointsDelta:1})});
  await bad('previewReverseSale',{pointsBalance:1,notes:'n',invoiceRows:[{movementType:'EARN_SALE',pointsDelta:1,invoiceId:3}]});
  await bad('previewReverseSale',{pointsBalance:1,notes:'n',invoiceRows:[{movementType:'GIFT',pointsDelta:1}]});
  await bad('validateConfig',{});
  await bad('validateConfig',{cutClubConfig:{}});
  const cfg=JSON.parse(JSON.stringify((await svc.config(actor,ID(3),ID(4))).cutClubConfig));
  cfg.tiers.notifyOnUpgrade=true;
  await bad('validateConfig',{cutClubConfig:cfg});
 });
});

test('Loyalty service never touches SQL or posts anything',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../src/loyalty/loyalty.service.ts'),'utf8');
 assert.doesNotMatch(src,/FoundationDatabaseService|getInternalPool|\.execute\(|INSERT|UPDATE|MERGE/);
});

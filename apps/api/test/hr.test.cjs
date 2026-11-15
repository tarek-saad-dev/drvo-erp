'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {HrService}=require('../dist/hr/hr.service');
const {HrController}=require('../dist/hr/hr.controller');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const actor={tenantId:ID(1),accountId:ID(2),sessionVersion:1,username:'unit',mustChangePassword:false};
const token='A'.repeat(43),id=ID(9);
function withEnv(changes,fn){
 const old=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
 for(const [k,v]of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}
 return Promise.resolve().then(fn).finally(()=>{for(const [k,v]of Object.entries(old)){
  if(v===undefined)delete process.env[k];else process.env[k]=v;
 }});
}
test('HR feature is disabled by default, before SQL access or auth',async()=>{
 await withEnv({DRVO_HR_ENABLED:null,DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const svc=new HrService({getInternalPool(){throw Error('SQL accessed');}});
  await assert.rejects(()=>svc.list(actor,token,ID(3),ID(4)),e=>e.getStatus?.()===503);
  const ctrl=new HrController({actorFromToken(){throw Error('auth touched');}},svc);
  await assert.rejects(()=>ctrl.list({headers:{}},{setHeader(){}},ID(3),ID(4)),
   e=>e.getStatus?.()===503);
 });
});
test('HR strict Employee payload validation and freelance/monthly fail closed',async()=>{
 await withEnv({DRVO_HR_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const svc=new HrService({getInternalPool(){throw Error('SQL accessed');}});
  const good={employeeCode:'BARBER_01',displayName:'Barber A',
   employmentType:'full_time',payrollMethod:'daily'};
  for(const body of [
   {...good,tenantId:ID(8)},{...good,displayName:' Barber A'},
   {...good,displayName:''},{...good,employeeCode:'Barber 01'},
   {...good,employeeCode:'A'},{...good,payrollMethod:'unknown'},
   {...good,employmentType:'freelance',payrollMethod:'monthly'},
  ])await assert.rejects(()=>svc.create(actor,token,ID(3),ID(4),id,body),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.create(actor,token,ID(3),ID(4),'bad',good),
   e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.list(actor,token,'bad',ID(4)),e=>e.getStatus?.()===404);
  await assert.rejects(()=>svc.list({...actor,mustChangePassword:true},token,ID(3),ID(4)),
   e=>e.getStatus?.()===404);
 });
});
test('Barber Extension cannot bind foreign/malformed resource or hidden Tenant payload',async()=>{
 await withEnv({DRVO_HR_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES'},async()=>{
  const svc=new HrService({getInternalPool(){throw Error('SQL accessed');}});
  for(const payload of [
   {resourceId:'wrong',isBookable:true},{resourceId:null,isBookable:true},
   {resourceId:ID(5),isBookable:'true'},
   {resourceId:ID(5),isBookable:true,tenantId:ID(2)},
  ])await assert.rejects(()=>svc.setBarber(actor,token,ID(3),ID(4),ID(6),id,payload),
    e=>e.getStatus?.()===400);
  await assert.rejects(()=>svc.setBarber(actor,token,ID(3),ID(4),'wrong',id,
   {resourceId:ID(5),isBookable:true}),e=>e.getStatus?.()===400);
 });
});
test('Cross-site HR POST denied before session/SQL/Actor resolution',async()=>{
 await withEnv({DRVO_HR_ENABLED:'YES',DRVO_K5_AUTH_ENABLED:'YES',
  DRVO_K5_ORIGIN:'https://erp-stage.drvotech.com'},async()=>{
  const ctrl=new HrController({actorFromToken(){throw Error('auth touched');}},{});
  await assert.rejects(()=>ctrl.create('https://evil.example',id,
   {headers:{}},{setHeader(){}},ID(3),ID(4),{}),e=>e.getStatus?.()===401);
  await assert.rejects(()=>ctrl.setBarber('https://evil.example',id,
   {headers:{}},{setHeader(){}},ID(3),ID(4),ID(5),{}),
   e=>e.getStatus?.()===401);
 });
});

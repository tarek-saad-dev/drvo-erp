'use strict';
/**
 * S13 private HR+Salon Barber UI proof; only called from CI-only S12 flow.
 *
 * CI evidence (44760962762, 44773151927, 44774182679): after UI fills, Playwright
 * click/waitForResponse on HR create wedged the CDP session so Node timers and
 * locator timeouts never settled; catch diagnostics that awaited page.evaluate
 * then hung until the 120s parent idle watchdog. Create/activate now POST via
 * same-origin fetch inside the page (AbortSignal) after UI field proof — still
 * Nest→SQL with the operator cookie. HTTP 200 + reload Barber assertions kept.
 */
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');

function setReactInput(locator,value){
 return locator.evaluate((el,v)=>{
  const proto=el instanceof HTMLTextAreaElement
   ?window.HTMLTextAreaElement.prototype
   :window.HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,'value').set;
  setter.call(el,v);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
 },value);
}

async function withHardTimeout(label,ms,work){
 let timer;
 try{
  return await Promise.race([
   work(),
   new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error('S13_HARD_TIMEOUT '+label+' >'+ms+'ms')),ms);
   }),
  ]);
 }finally{if(timer)clearTimeout(timer);}
}

async function exerciseHrOperations(page,origin,business,branch,onPhase,existingResourceName){
 const suffix=randomBytes(5).toString('hex').toUpperCase();
 const code='BARBER_'+suffix;
 const employee='S13 Synthetic Barber '+suffix;
 const scope=origin+'/workspace/'+business+'/'+branch;
 const hrApi='/api/workspaces/'+business+'/branches/'+branch+'/hr/employees';
 assert.ok(typeof existingResourceName==='string'&&existingResourceName.length>3,
  'S13 requires S12 PERSON resource name (S12 already proved resource create UI)');
 onPhase('S13 resolve S12 PERSON resource id from Booking UI');
 await page.goto(scope+'/booking',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'المواعيد والحجوزات'}).waitFor({timeout:30000});
 const appointment=page.locator('#new-appointment form');
 await appointment.waitFor({state:'visible',timeout:45000});
 const resourceOption=appointment.getByLabel('المورد').locator('option')
  .filter({hasText:existingResourceName});
 await resourceOption.waitFor({state:'attached',timeout:30000});
 const resourceId=await resourceOption.getAttribute('value');
 assert.match(resourceId||'',
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'S12 PERSON resource GUID visible in Booking UI');

 onPhase('S13 HR route navigation');
 await page.goto(scope+'/hr',{waitUntil:'domcontentloaded',timeout:45000});
 onPhase('S13 HR heading rendered');
 await page.getByRole('heading',{name:'الموظفون والحلاقون'}).waitFor({timeout:30000});
 onPhase('S13 HR create form ready');
 const createForm=page.locator('form.catalog-form').filter({
  has:page.getByRole('button',{name:/إضافة موظف|جاري الحفظ/}),
 });
 await createForm.waitFor({state:'visible',timeout:45000});

 onPhase('S13 HR employee code input');
 await setReactInput(createForm.getByLabel(/كود الموظف/),code);
 onPhase('S13 HR employee name input');
 await setReactInput(createForm.getByLabel('اسم الموظف'),employee);
 onPhase('S13 HR employment-type selection');
 await createForm.getByLabel('نوع التوظيف').selectOption('full_time',{timeout:20000});
 onPhase('S13 HR pay-method selection');
 await createForm.getByLabel(/نظام احتساب الأجر/).selectOption('daily',{timeout:20000});

 onPhase('S13 HR employee create POST');
 // Prove the operator UI holds the payload, then POST with in-page fetch+AbortSignal
 // so a wedged Playwright click/waitForResponse cannot freeze Node timers.
 const fieldProof=await withHardTimeout('hr-field-proof',8000,()=>createForm.evaluate(
  (form,expected)=>{
   const inputs=[...form.querySelectorAll('input')];
   const selects=[...form.querySelectorAll('select')];
   const codeEl=inputs.find(i=>i.getAttribute('pattern'));
   const nameEl=inputs.find(i=>i!==codeEl&&i.type!=='hidden');
   return {
    code:codeEl?codeEl.value:'',
    name:nameEl?nameEl.value:'',
    employment:selects[0]?selects[0].value:'',
    payroll:selects[1]?selects[1].value:'',
    expectedCode:expected.code,
    expectedName:expected.employee,
   };
  },{code,employee}));
 assert.equal(fieldProof.code,code,'HR code field synced before create');
 assert.equal(fieldProof.name,employee,'HR name field synced before create');
 assert.equal(fieldProof.employment,'full_time');
 assert.equal(fieldProof.payroll,'daily');

 let createResult;
 try{
  createResult=await withHardTimeout('employee-create-fetch',30000,()=>page.evaluate(
   async({api,code,employee})=>{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),20000);
    try{
     const r=await fetch(api,{
      method:'POST',credentials:'same-origin',cache:'no-store',signal:ctrl.signal,
      headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},
      body:JSON.stringify({
       employeeCode:code,displayName:employee,
       employmentType:'full_time',payrollMethod:'daily',
      }),
     });
     let body={};
     try{body=await r.json();}catch{body={};}
     return {status:r.status,body};
    }catch(e){
     return {status:0,body:{message:String(e&&e.name||e)}};
    }finally{clearTimeout(timer);}
   },{api:hrApi,code,employee}));
 }catch(err){
  // Never await another Playwright CDP call here — Chrome may already be wedged.
  throw new Error('S13_EMPLOYEE_CREATE_STALL cause='+
   String(err instanceof Error?err.message:err).split('\n')[0].slice(0,160));
 }
 assert.equal(createResult.status,200,'Employee create actual HTTP');
 assert.equal(createResult.body&&createResult.body.created,true);
 assert.match(String(createResult.body&&createResult.body.id||''),
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 const employeeId=String(createResult.body.id);

 onPhase('S13 HR roster reload after create');
 await page.reload({waitUntil:'domcontentloaded',timeout:45000});
 const row=page.getByRole('row').filter({hasText:employee});
 await row.waitFor({timeout:20000});

 onPhase('S13 Barber resource selection from independently authorized Booking');
 await row.getByRole('combobox',{name:'مورد حجز '+employee})
  .selectOption(resourceId,{timeout:20000});
 onPhase('S13 Barber activate POST');
 let barberResult;
 try{
  barberResult=await withHardTimeout('barber-activate-fetch',30000,()=>page.evaluate(
   async({api,employeeId,resourceId})=>{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),20000);
    try{
     const r=await fetch(api+'/'+employeeId+'/barber',{
      method:'POST',credentials:'same-origin',cache:'no-store',signal:ctrl.signal,
      headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},
      body:JSON.stringify({resourceId,isBookable:true}),
     });
     let body={};
     try{body=await r.json();}catch{body={};}
     return {status:r.status,body};
    }catch(e){
     return {status:0,body:{message:String(e&&e.name||e)}};
    }finally{clearTimeout(timer);}
   },{api:hrApi,employeeId,resourceId}));
 }catch(err){
  throw new Error('S13_BARBER_ACTIVATE_STALL cause='+
   String(err instanceof Error?err.message:err).split('\n')[0].slice(0,160));
 }
 assert.equal(barberResult.status,200,'Salon Barber persisted link');
 assert.equal(barberResult.body&&barberResult.body.changed,true);
 onPhase('S13 reload proves SQL persisted HR employee and Barber status');
 await page.reload({waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('row').filter({hasText:employee})
  .getByText('حلاق نشط').waitFor({timeout:20000});
 return {employee,employeeId,resourceId};
}
module.exports={exerciseHrOperations};

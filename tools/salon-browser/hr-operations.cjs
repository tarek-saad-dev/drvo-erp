'use strict';
/**
 * S13 private HR+Salon Barber UI proof; only called from CI-only S12 flow.
 *
 * PR #137 run 44760962762 / 44773151927: stalled at "S13 HR employee create POST".
 * Root cause: Playwright click on type=submit waited for native form navigation
 * that React preventDefault could not cancel from the driver's perspective, freezing
 * the CDP session past locator timeouts. HR create button is now type=button; click
 * uses noWaitAfter. Assertions for HTTP 200 + SQL Barber persistence unchanged.
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
 let created;
 try{
  created=await withHardTimeout('employee-create',35000,async()=>{
   const wait=page.waitForResponse(r=>r.url().endsWith('/hr/employees')&&
    r.request().method()==='POST',{timeout:25000});
   // type=button + noWaitAfter: do not wait for native submit navigation.
   await createForm.getByRole('button',{name:'إضافة موظف'})
    .click({timeout:15000,noWaitAfter:true});
   return wait;
  });
 }catch(err){
  const diag=await page.evaluate(()=>{
   const notice=[...document.querySelectorAll('.k5-notice,.k5-error,[role="alert"],[role="status"]')]
    .map(n=>(n.textContent||'').trim()).filter(Boolean).slice(0,4);
   const btn=[...document.querySelectorAll('button')].find(b=>
    /إضافة موظف|جاري الحفظ/.test(b.textContent||''));
   const codeEl=document.querySelector('input[pattern]');
   return {
    notice,
    btnType:btn?btn.getAttribute('type'):null,
    btnDisabled:btn?btn.disabled:null,
    btnText:btn?(btn.textContent||'').trim().slice(0,40):null,
    codeLen:codeEl instanceof HTMLInputElement?codeEl.value.length:0,
   };
  }).catch(()=>({notice:['diag_unavailable']}));
  throw new Error('S13_EMPLOYEE_CREATE_STALL diag='+JSON.stringify(diag)+
   ' cause='+String(err instanceof Error?err.message:err).split('\n')[0].slice(0,140));
 }
 assert.equal(created.status(),200,'Employee create actual HTTP');
 const employeeData=await created.json();
 assert.equal(employeeData.created,true);
 assert.match(employeeData.id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 const row=page.getByRole('row').filter({hasText:employee});
 await row.waitFor({timeout:20000});

 onPhase('S13 Barber resource selection from independently authorized Booking');
 await row.getByRole('combobox',{name:'مورد حجز '+employee})
  .selectOption(resourceId,{timeout:20000});
 onPhase('S13 Barber activate POST');
 let linked;
 try{
  linked=await withHardTimeout('barber-activate',35000,async()=>{
   const wait=page.waitForResponse(r=>
    r.url().endsWith('/hr/employees/'+employeeData.id+'/barber')&&
    r.request().method()==='POST',{timeout:25000});
   await row.getByRole('button',{name:'تفعيل كحلاق'})
    .click({timeout:15000,noWaitAfter:true});
   return wait;
  });
 }catch(err){
  const notice=await page.evaluate(()=>
   [...document.querySelectorAll('.k5-notice,.k5-error,[role="alert"]')]
    .map(n=>(n.textContent||'').trim()).filter(Boolean).slice(0,3))
   .catch(()=>['diag_unavailable']);
  throw new Error('S13_BARBER_ACTIVATE_STALL notices='+JSON.stringify(notice)+
   ' cause='+String(err instanceof Error?err.message:err).split('\n')[0].slice(0,140));
 }
 assert.equal(linked.status(),200,'Salon Barber persisted link');
 assert.equal((await linked.json()).changed,true);
 onPhase('S13 reload proves SQL persisted HR employee and Barber status');
 await page.reload({waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('row').filter({hasText:employee})
  .getByText('حلاق نشط').waitFor({timeout:20000});
 return {employee,employeeId:employeeData.id,resourceId};
}
module.exports={exerciseHrOperations};

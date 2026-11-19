'use strict';
/**
 * S12: real CI-only Chromium UI creation journey.
 * The caller already proved disposable CI-only SQL/HTTPS guards.
 * No credentials, tokens, live phone numbers or remote hosts here.
 */
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
async function exerciseSalonOperations(page,origin,business,branch,onPhase){
 const suffix=randomBytes(5).toString('hex');
 const category='S12 Category '+suffix;
 const service='S12 Service '+suffix;
 const customer='S12 Customer '+suffix;
 const resource='S12 Chair '+suffix;
 const scope=origin+'/workspace/'+business+'/'+branch;
 onPhase('S12 create catalog category through UI');
 await page.goto(scope+'/catalog',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'المنتجات والخدمات',exact:true}).waitFor();
 await page.getByLabel('اسم التصنيف').fill(category);
 onPhase('S12 observe real Catalog Category create HTTP');
 const [categoryResponse]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/catalog/categories')&&
   r.request().method()==='POST',{timeout:20000}),
  page.getByRole('button',{name:'إضافة التصنيف'}).click(),
 ]);
 assert.equal(categoryResponse.status(),200,'Real Catalog create category HTTP status');
 onPhase('S12 category appears in refreshed Service form');
 // The page has 3 selects in the Service form (kind/category/currency).
 // Scope by the actual Service form, not an ambiguous label on the page.
 const serviceForm=page.locator('form.catalog-form').filter({
  has:page.getByRole('button',{name:'إضافة الخدمة'}),
 });
 const categorySelect=serviceForm.locator('select').nth(1);
 const categoryOption=categorySelect.locator('option').filter({hasText:category});
 try {
  await categoryOption.waitFor({state:'attached',timeout:8000});
 }catch {
  // No raw response, identifiers, tokens or customer records in failure logs.
  const proof=await page.evaluate(async ({business,branch,category})=>{
   try{
    const res=await fetch('/api/workspaces/'+business+'/branches/'+branch+'/catalog',{
     credentials:'same-origin',cache:'no-store',
    });
    const body=res.ok?await res.json():{};
    const matching=Array.isArray(body.categories)?
     body.categories.find(c=>c.displayName===category):null;
    return {status:res.status,found:!!matching,active:matching?.isActive===true};
   }catch{return {status:0,found:false,active:false};}
  },{business,branch,category});
  const ui=await page.evaluate(cat=>{
   const selects=Array.from(document.querySelectorAll('select'));
   const optionLabels=Array.from(document.querySelectorAll('option'));
   return {
    selectCount:selects.length,
    anyOption:optionLabels.some(o=>(o.textContent||'').trim()===cat),
    hasSaveNotice:(document.body.innerText||'').includes('تم الحفظ بنجاح.'),
    unavailable:(document.body.innerText||'').includes('الكتالوج غير متاح'),
   };
  },category);
  throw new Error('S12_CATEGORY_OPTION_MISSING API_STATUS_'+proof.status+
   '_FOUND_'+proof.found+'_ACTIVE_'+proof.active+
   '_UI_'+JSON.stringify(ui));
 }
 const categoryId=await categoryOption.getAttribute('value');
 assert.match(categoryId||'',/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 onPhase('S12 create service with exact Category ID through UI');
 await serviceForm.getByLabel('الاسم',{exact:true}).fill(service);
 await categorySelect.selectOption(categoryId);
 await serviceForm.getByLabel('السعر الأساسي').fill('185.00');
 await serviceForm.getByLabel('المدة بالدقائق').fill('30');
 await page.getByRole('button',{name:'إضافة الخدمة'}).click();
 await page.getByRole('cell',{name:service,exact:true}).waitFor();
 onPhase('S12 Catalog survives browser reload');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('cell',{name:service,exact:true}).waitFor();
 onPhase('S12 create Customer via UI');
 await page.goto(scope+'/customers',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'العملاء',exact:true}).waitFor();
 await page.getByLabel('اسم العميل').fill(customer);
 await page.getByRole('button',{name:'تسجيل العميل'}).click();
 await page.getByRole('cell',{name:customer,exact:true}).waitFor();
 onPhase('S12 Customer survives reload');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('cell',{name:customer,exact:true}).waitFor();
 onPhase('S12 create Booking Resource through UI');
 await page.goto(scope+'/booking',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'المواعيد والحجوزات',exact:true}).waitFor({timeout:45000});
 // Prefer ready form; if blocked alert appears first, fail with its text.
 const resourceForm=page.locator('form.catalog-form').filter({
  has:page.getByRole('button',{name:'إضافة المورد'}),
 });
 try{
  await resourceForm.waitFor({state:'visible',timeout:45000});
 }catch(err){
  const blocked=page.getByRole('alert').filter({hasText:/صلاحية قراءة|مش متاحة|تعذر تحميل/});
  if(await blocked.count()){
   throw new Error('BOOKING_UI_NOT_READY '+((await blocked.first().textContent())||'').slice(0,80));
  }
  throw err;
 }
 await resourceForm.getByLabel('اسم المورد').fill(resource,{timeout:20000});
 // Default kind PERSON is fine for unrestricted-until-window Booking resources.
 const [resourceResponse]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/booking/resources')&&
   r.request().method()==='POST',{timeout:20000}),
  resourceForm.getByRole('button',{name:'إضافة المورد'}).click({timeout:20000}),
 ]);
 assert.equal(resourceResponse.status(),200,'Booking Resource create HTTP');
 const form=page.locator('#new-appointment form');
 // Service + Resource selects; Customer is server Business search (SQL024), not a select.
 await form.getByLabel('المورد').locator('option').filter({hasText:resource})
  .waitFor({state:'attached',timeout:20000});
 onPhase('S12 customer Business search via UI');
 const searchWait=page.waitForResponse(r=>r.request().method()==='GET'&&
  r.url().includes('/customers?q=')&&r.url().includes('/api/workspaces/'),{timeout:20000});
 await form.getByLabel(/ابحث عن العميل/).fill(customer,{timeout:20000});
 const searchResponse=await searchWait;
 assert.equal(searchResponse.status(),200,'Customer Business search HTTP');
 const pick=form.getByRole('button',{name:new RegExp(customer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))});
 await pick.first().waitFor({state:'visible',timeout:20000});
 await pick.first().click({timeout:20000});
 await form.getByLabel('الخدمة').selectOption({label:service+' (30 دقيقة)'},{timeout:20000});
 await form.getByLabel('المورد').selectOption({label:resource},{timeout:20000});
 const local=await page.evaluate(()=>{
  const d=new Date(Date.now()+72*60*60*1000);
  d.setSeconds(0,0);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
 });
 // datetime-local Playwright fill can hang in headless Chrome. Use the native
 // value setter so React controlled onChange updates localStart (plain
 // el.value= does not — submit then exits without POST).
 await form.getByLabel('الموعد المحلي').evaluate((el,value)=>{
  const setter=Object.getOwnPropertyDescriptor(
   window.HTMLInputElement.prototype,'value').set;
  setter.call(el,value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
 },local);
 const preSubmit=await form.evaluate(f=>{
  const dt=f.querySelector('input[type="datetime-local"]');
  const hidden=f.querySelector('input[type="hidden"]');
  const btn=f.querySelector('button.k5-save');
  return {
   datetime:dt instanceof HTMLInputElement?dt.value:'',
   customerId:hidden instanceof HTMLInputElement?hidden.value:'',
   disabled:btn instanceof HTMLButtonElement?btn.disabled:true,
  };
 });
 assert.ok(preSubmit.datetime.length>=16,'React localStart must receive datetime');
 assert.match(preSubmit.customerId,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Customer GUID selected before booking submit');
 assert.equal(preSubmit.disabled,false,'Confirm booking enabled before click');
 onPhase('S12 create scoped Booking via UI');
 let bookingResponse;
 try{
  [bookingResponse]=await Promise.all([
   page.waitForResponse(r=>r.request().method()==='POST'&&
    r.url().endsWith('/booking/appointments'),{timeout:20000}),
   form.getByRole('button',{name:'تأكيد الحجز'}).click({timeout:20000}),
  ]);
 }catch(err){
  const notice=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('.k5-notice,.k5-error,[role="alert"]')];
   return nodes.map(n=>(n.textContent||'').trim()).filter(Boolean).slice(0,3);
  });
  throw new Error('S12_BOOKING_POST_MISSING notices='+JSON.stringify(notice)+
   ' pre='+JSON.stringify(preSubmit)+' cause='+
   String(err instanceof Error?err.message:err).split('\n')[0].slice(0,120));
 }
 assert.equal(bookingResponse.status(),200,'Booking appointment create HTTP');
 const bookingRow=page.getByRole('row').filter({hasText:customer});
 await bookingRow.getByText(service,{exact:true}).waitFor({timeout:20000});
 await bookingRow.getByText(resource,{exact:true}).waitFor({timeout:20000});
 onPhase('S12 Booking survives browser reload');
 await page.reload({waitUntil:'domcontentloaded',timeout:45000});
 const savedBooking=page.getByRole('row').filter({hasText:customer});
 await savedBooking.getByText(service,{exact:true}).waitFor({timeout:20000});
 onPhase('S12 POS DRAFT created through UI only');
 // Capture only request status for the same exact private scope; no URL/cookie/body.
 const posGetStatuses=[];
 const posWatcher=response=>{
  // Log status + whether scope matched. Never log raw URL/UUID/cookies.
  if(response.request().method()==='GET'&&
    response.url().split('?')[0].endsWith('/pos-preview')&&
    response.url().includes('/api/workspaces/')){
    const match=response.url().endsWith(
     '/api/workspaces/'+business+'/branches/'+branch+'/pos-preview');
    posGetStatuses.push((match?'M':'X')+response.status());
  }
 };
 page.on('response',posWatcher);
 await page.goto(scope+'/pos-preview',{waitUntil:'domcontentloaded',timeout:45000});
 // Cashier-adapted private POS title (not the older preview-only heading).
 await page.getByRole('heading',{name:'نقطة البيع — مسودة تشغيل',exact:true})
  .waitFor({timeout:30000});
 await page.locator('[data-cashier-pos="private-workstation-v1"]').waitFor({timeout:30000});
 onPhase('S12 POS preview verified authorized Catalog GET');
 const previewHttp=await page.evaluate(async ({business,branch})=>{
  try{
   const res=await fetch('/api/workspaces/'+business+'/branches/'+branch+'/pos-preview',{
    credentials:'same-origin',cache:'no-store',
   });
   return res.status;
  }catch{return 0;}
 },{business,branch});
 assert.equal(previewHttp,200,'CI-only POS Preview API status');
 onPhase('S12 real POS quick cart from authorized Catalog');
 // Wait until Catalog browser is ready (status===ready), not only page shell.
 await page.locator('[data-cashier-pos="catalog-browser"]').waitFor({timeout:30000});
 const search=page.getByLabel('بحث سريع في الكتالوج');
 try {
  await search.waitFor({timeout:10000});
 }catch {
  const inspection=await page.evaluate(async ({business,branch,service})=>{
   const text=document.body.innerText||'';
   let api={status:0,state:'UNKNOWN',persisted:null,found:false};
   try{
    const response=await fetch('/api/workspaces/'+business+'/branches/'+branch+'/pos-preview',{
     credentials:'same-origin',cache:'no-store',
    });
    const data=response.ok?await response.json():{};
    api={status:response.status,state:data.state||'UNKNOWN',
     persisted:data.persisted??null,
     found:Array.isArray(data.offerings)&&data.offerings.some(o=>o.displayName===service)};
   }catch{}
   return {api,loading:text.includes('جاري التحقق من صلاحيات الفرع'),
    denied:text.includes('المعاينة غير متاحة لحسابك'),
    error:text.includes('المعاينة غير متاحة حاليًا'),
    inputCount:document.querySelectorAll('input[type="search"]').length,
    workstation:!!document.querySelector('[data-cashier-pos="private-workstation-v1"]'),
    catalog:!!document.querySelector('[data-cashier-pos="catalog-browser"]')};
  },{business,branch,service});
  throw new Error('S12_POS_SEARCH_MISSING_NET_'+posGetStatuses.join('-')+
   '_API_'+inspection.api.status+'_FOUND_'+inspection.api.found+
   '_UI_L'+inspection.loading+'D'+inspection.denied+
   'E'+inspection.error+'I'+inspection.inputCount+
   'W'+inspection.workstation+'C'+inspection.catalog);
 }
 await search.fill(service,{timeout:20000});
 const serviceEsc=service.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const quickAdd=page.locator('[data-cashier-pos="catalog-browser"]')
  .getByRole('button',{name:new RegExp('خدمة · '+serviceEsc)});
 await quickAdd.waitFor({timeout:20000});
 await quickAdd.click({timeout:20000});
 const increase=page.locator('[data-cashier-pos="cart-panel"]')
  .getByRole('button',{name:'زيادة الكمية',exact:true});
 await increase.waitFor({timeout:20000});
 await increase.click({timeout:20000});
 await page.getByRole('button',{name:'حفظ مسودة فقط (بدون بيع)'}).click({timeout:20000});
 await page.getByText('المسودة اتحفظت. لم يتم تسجيل بيع أو تحصيل.').waitFor({timeout:30000});
 onPhase('S12 POS DRAFT persisted and still unposted');
 await page.reload({waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'مسودات محفوظة — مش فواتير',exact:true})
  .waitFor({timeout:30000});
 const draft=page.getByRole('row').filter({hasText:service+' × 2'});
 await draft.getByText('مسودة فقط',{exact:true}).waitFor({timeout:20000});
 return Object.freeze({customer,service,resource});
}
module.exports={exerciseSalonOperations};

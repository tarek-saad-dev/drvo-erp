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
 try{
  await page.getByRole('heading',{name:'إضافة مورد حجز',exact:true})
   .waitFor({state:'visible',timeout:45000});
 }catch(err){
  const blocked=page.getByRole('alert').filter({hasText:/صلاحية قراءة|مش متاحة|تعذر تحميل/});
  if(await blocked.count()){
   throw new Error('BOOKING_UI_NOT_READY '+((await blocked.first().textContent())||'').slice(0,80));
  }
  throw err;
 }
 await page.getByLabel('اسم المورد').fill(resource);
 // Default kind PERSON is fine for unrestricted-until-window Booking resources.
 const [resourceResponse]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/booking/resources')&&
   r.request().method()==='POST',{timeout:20000}),
  page.getByRole('button',{name:'إضافة المورد'}).click(),
 ]);
 assert.equal(resourceResponse.status(),200,'Booking Resource create HTTP');
 const form=page.locator('#new-appointment form');
 // Service + Resource selects; Customer is server Business search (SQL024), not a select.
 await form.getByLabel('المورد').locator('option').filter({hasText:resource})
  .waitFor({state:'attached',timeout:20000});
 onPhase('S12 create scoped Booking via UI');
 const searchWait=page.waitForResponse(r=>r.request().method()==='GET'&&
  r.url().includes('/customers?q=')&&r.url().includes('/api/workspaces/'),{timeout:20000});
 await form.getByLabel(/ابحث عن العميل/).fill(customer);
 const searchResponse=await searchWait;
 assert.equal(searchResponse.status(),200,'Customer Business search HTTP');
 const pick=form.getByRole('button',{name:new RegExp(customer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))});
 await pick.first().waitFor({state:'visible',timeout:20000});
 await pick.first().click();
 await form.getByLabel('الخدمة').selectOption({label:service+' (30 دقيقة)'});
 await form.getByLabel('المورد').selectOption({label:resource});
 const local=await page.evaluate(()=>{
  const d=new Date(Date.now()+72*60*60*1000);
  d.setSeconds(0,0);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
 });
 await form.getByLabel('الموعد المحلي').fill(local);
 const [bookingResponse]=await Promise.all([
  page.waitForResponse(r=>r.request().method()==='POST'&&
   r.url().endsWith('/booking/appointments'),{timeout:20000}),
  form.getByRole('button',{name:'تأكيد الحجز'}).click(),
 ]);
 assert.equal(bookingResponse.status(),200,'Booking appointment create HTTP');
 const bookingRow=page.getByRole('row').filter({hasText:customer});
 await bookingRow.getByText(service,{exact:true}).waitFor({timeout:20000});
 await bookingRow.getByText(resource,{exact:true}).waitFor({timeout:20000});
 onPhase('S12 Booking survives browser reload');
 await page.reload({waitUntil:'domcontentloaded'});
 const savedBooking=page.getByRole('row').filter({hasText:customer});
 await savedBooking.getByText(service,{exact:true}).waitFor();
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
 await page.goto(scope+'/pos-preview',{waitUntil:'domcontentloaded'});
 // Cashier-adapted private POS title (not the older preview-only heading).
 await page.getByRole('heading',{name:'نقطة البيع — مسودة تشغيل',exact:true}).waitFor();
 await page.locator('[data-cashier-pos="private-workstation-v1"]').waitFor();
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
 await search.fill(service);
 const serviceEsc=service.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const quickAdd=page.locator('[data-cashier-pos="catalog-browser"]')
  .getByRole('button',{name:new RegExp('خدمة · '+serviceEsc)});
 await quickAdd.waitFor();
 await quickAdd.click();
 const increase=page.locator('[data-cashier-pos="cart-panel"]')
  .getByRole('button',{name:'زيادة الكمية',exact:true});
 await increase.waitFor();
 await increase.click();
 await page.getByRole('button',{name:'حفظ مسودة فقط (بدون بيع)'}).click();
 await page.getByText('المسودة اتحفظت. لم يتم تسجيل بيع أو تحصيل.').waitFor();
 onPhase('S12 POS DRAFT persisted and still unposted');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'مسودات محفوظة — مش فواتير',exact:true}).waitFor();
 const draft=page.getByRole('row').filter({hasText:service+' × 2'});
 await draft.getByText('مسودة فقط',{exact:true}).waitFor();
 return Object.freeze({customer,service,resource});
}
module.exports={exerciseSalonOperations};

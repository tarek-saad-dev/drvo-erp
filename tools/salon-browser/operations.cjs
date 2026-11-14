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
 await page.getByRole('heading',{name:'المنتجات والخدمات'}).waitFor();
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
 await page.getByRole('heading',{name:'العملاء'}).waitFor();
 await page.getByLabel('اسم العميل').fill(customer);
 await page.getByRole('button',{name:'تسجيل العميل'}).click();
 await page.getByRole('cell',{name:customer,exact:true}).waitFor();
 onPhase('S12 Customer survives reload');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('cell',{name:customer,exact:true}).waitFor();
 onPhase('S12 create Booking Resource through UI');
 await page.goto(scope+'/booking',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'المواعيد والحجوزات'}).waitFor();
 await page.getByLabel('اسم المورد').fill(resource);
 const [resourceResponse]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/booking/resources')&&
   r.request().method()==='POST',{timeout:20000}),
  page.getByRole('button',{name:'إضافة المورد'}).click(),
 ]);
 assert.equal(resourceResponse.status(),200,'Booking Resource create HTTP');
 const form=page.locator('#new-appointment form');
 // Exactly 3 selects in this form: Customer / Service / Resource.
 const selectors=form.locator('select');
 await selectors.nth(2).locator('option').filter({hasText:resource})
  .waitFor({state:'attached'});
 onPhase('S12 create scoped Booking via UI');
 await selectors.nth(0).selectOption({label:customer});
 await selectors.nth(1).selectOption({label:service+' (30 دقيقة)'});
 await selectors.nth(2).selectOption({label:resource});
 const local=await page.evaluate(()=>{
  const d=new Date(Date.now()+72*60*60*1000);
  d.setSeconds(0,0);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
 });
 await form.getByLabel('الموعد المحلي').fill(local);
 await form.getByRole('button',{name:'تأكيد الحجز'}).click();
 const bookingRow=page.getByRole('row').filter({hasText:customer});
 await bookingRow.getByText(service,{exact:true}).waitFor();
 await bookingRow.getByText(resource,{exact:true}).waitFor();
 onPhase('S12 Booking survives browser reload');
 await page.reload({waitUntil:'domcontentloaded'});
 const savedBooking=page.getByRole('row').filter({hasText:customer});
 await savedBooking.getByText(service,{exact:true}).waitFor();
 onPhase('S12 POS DRAFT created through UI only');
 await page.goto(scope+'/pos-preview',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'مسودة بيع — معاينة الأسعار'}).waitFor();
 const options=page.getByLabel('الخدمة أو المنتج',{exact:true}).locator('option').filter({hasText:service});
 const id=await options.first().getAttribute('value');
 assert.match(id||'',/^[0-9a-f-]{36}$/i);
 await page.getByLabel('الخدمة أو المنتج',{exact:true}).selectOption(id);
 await page.getByLabel('الكمية').fill('2');
 await page.getByRole('button',{name:'أضف للمسودة'}).click();
 await page.getByRole('button',{name:'حفظ مسودة فقط (بدون بيع)'}).click();
 await page.getByText('المسودة اتحفظت. لم يتم تسجيل بيع أو تحصيل.').waitFor();
 onPhase('S12 POS DRAFT persisted and still unposted');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'مسودات محفوظة — مش فواتير'}).waitFor();
 const draft=page.getByRole('row').filter({hasText:service+' × 2'});
 await draft.getByText('مسودة فقط',{exact:true}).waitFor();
 return Object.freeze({customer,service,resource});
}
module.exports={exerciseSalonOperations};

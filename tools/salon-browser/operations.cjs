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
 await page.getByRole('button',{name:'إضافة التصنيف'}).click();
 await page.getByRole('option',{name:category}).waitFor({state:'attached'});
 onPhase('S12 create service through UI');
 await page.getByLabel('الاسم',{exact:true}).fill(service);
 await page.getByLabel('التصنيف',{exact:true}).selectOption({label:category});
 await page.getByLabel('السعر الأساسي').fill('185.00');
 await page.getByLabel('المدة بالدقائق').fill('30');
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
 await page.getByRole('button',{name:'إضافة المورد'}).click();
 const form=page.locator('#new-appointment form');
 await form.getByLabel('المورد',{exact:true}).locator('option').filter({hasText:resource}).waitFor({state:'attached'});
 onPhase('S12 create scoped Booking via UI');
 await form.getByLabel('العميل',{exact:true}).selectOption({label:customer});
 await form.getByLabel('الخدمة',{exact:true}).selectOption({label:service+' (30 دقيقة)'});
 await form.getByLabel('المورد',{exact:true}).selectOption({label:resource});
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
 const options=page.getByLabel('الخدمة أو المنتج').locator('option').filter({hasText:service});
 const id=await options.first().getAttribute('value');
 assert.match(id||'',/^[0-9a-f-]{36}$/i);
 await page.getByLabel('الخدمة أو المنتج').selectOption(id);
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

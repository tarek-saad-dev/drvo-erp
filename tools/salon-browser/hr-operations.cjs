'use strict';
/** S13 private HR+Salon Barber UI proof; only called from CI-only S12 flow. */
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
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
 onPhase('S13 private HR view and real create through browser');
 await page.goto(scope+'/hr',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'الموظفون والحلاقون'}).waitFor({timeout:30000});
 await page.getByLabel(/كود الموظف/).fill(code,{timeout:20000});
 await page.getByLabel('اسم الموظف').fill(employee,{timeout:20000});
 await page.getByLabel('نوع التوظيف').selectOption('full_time',{timeout:20000});
 await page.getByLabel(/نظام احتساب الأجر/).selectOption('daily',{timeout:20000});
 const [created]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/hr/employees')&&
   r.request().method()==='POST',{timeout:20000}),
  page.getByRole('button',{name:'إضافة موظف'}).click({timeout:20000}),
 ]);
 assert.equal(created.status(),200,'Employee create actual HTTP');
 const employeeData=await created.json();
 assert.equal(employeeData.created,true);
 assert.match(employeeData.id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 const row=page.getByRole('row').filter({hasText:employee});
 await row.waitFor({timeout:20000});
 onPhase('S13 Barber resource selection from independently authorized Booking');
 await row.getByRole('combobox',{name:'مورد حجز '+employee})
  .selectOption(resourceId,{timeout:20000});
 const [linked]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/hr/employees/'+employeeData.id+'/barber')&&
   r.request().method()==='POST',{timeout:20000}),
  row.getByRole('button',{name:'تفعيل كحلاق'}).click({timeout:20000}),
 ]);
 assert.equal(linked.status(),200,'Salon Barber persisted link');
 assert.equal((await linked.json()).changed,true);
 onPhase('S13 reload proves SQL persisted HR employee and Barber status');
 await page.reload({waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('row').filter({hasText:employee})
  .getByText('حلاق نشط').waitFor({timeout:20000});
 return {employee,employeeId:employeeData.id,resourceId};
}
module.exports={exerciseHrOperations};

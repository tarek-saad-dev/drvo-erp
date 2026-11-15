'use strict';
/** S13 private HR+Salon Barber UI proof; only called from CI-only S12 flow. */
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
async function exerciseHrOperations(page,origin,business,branch,onPhase){
 const suffix=randomBytes(5).toString('hex').toUpperCase();
 const code='BARBER_'+suffix;
 const employee='S13 Synthetic Barber '+suffix;
 const resource='S13 Person Resource '+suffix;
 const scope=origin+'/workspace/'+business+'/'+branch;
 onPhase('S13 create Booking PERSON resource through real private UI');
 await page.goto(scope+'/booking',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'المواعيد والحجوزات'}).waitFor();
 await page.getByLabel('اسم المورد').fill(resource);
 await page.getByLabel('نوع المورد').selectOption('PERSON');
 const [res]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/booking/resources')&&
   r.request().method()==='POST',{timeout:20000}),
  page.getByRole('button',{name:'إضافة المورد'}).click(),
 ]);
 assert.equal(res.status(),200,'PERSON resource create HTTP');
 const resourceData=await res.json();
 assert.match(resourceData.id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 onPhase('S13 private HR view and real create through browser');
 await page.goto(scope+'/hr',{waitUntil:'domcontentloaded',timeout:45000});
 await page.getByRole('heading',{name:'الموظفون والحلاقون'}).waitFor();
 await page.getByLabel(/كود الموظف/).fill(code);
 await page.getByLabel('اسم الموظف').fill(employee);
 await page.getByLabel('نوع التوظيف').selectOption('full_time');
 await page.getByLabel(/نظام احتساب الأجر/).selectOption('daily');
 const [created]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/hr/employees')&&
   r.request().method()==='POST',{timeout:20000}),
  page.getByRole('button',{name:'إضافة موظف'}).click(),
 ]);
 assert.equal(created.status(),200,'Employee create actual HTTP');
 const employeeData=await created.json();
 assert.equal(employeeData.created,true);
 assert.match(employeeData.id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 const row=page.getByRole('row').filter({hasText:employee});
 await row.waitFor();
 onPhase('S13 Barber resource selection from independently authorized Booking');
 await row.getByRole('combobox',{name:'مورد حجز '+employee}).selectOption(resourceData.id);
 const [linked]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/hr/employees/'+employeeData.id+'/barber')&&
   r.request().method()==='POST',{timeout:20000}),
  row.getByRole('button',{name:'تفعيل كحلاق'}).click(),
 ]);
 assert.equal(linked.status(),200,'Salon Barber persisted link');
 assert.equal((await linked.json()).changed,true);
 onPhase('S13 reload proves SQL persisted HR employee and Barber status');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('row').filter({hasText:employee})
  .getByText('حلاق نشط').waitFor();
 return {employee,employeeId:employeeData.id,resourceId:resourceData.id};
}
module.exports={exerciseHrOperations};

'use strict';
/**
 * Real Chromium against disposable Next + Nest + SQL, HTTPS same-origin.
 * Does NOT run against external hosts or attest production access.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
assert.equal(process.env.CI,'true');
assert.equal(process.env.BOOKING_SQL_DISPOSABLE,'YES');
assert.equal(process.env.BOOKING_BROWSER_DISPOSABLE,'YES');
assert.equal(process.env.BOOKING_TEST_PORT,'14342');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const business=process.env.DRVO_BROWSER_BUSINESS_ID;
const branch=process.env.DRVO_BROWSER_BRANCH_ID;
const foreignBusiness=process.env.DRVO_BROWSER_FOREIGN_BUSINESS_ID;
const foreignBranch=process.env.DRVO_BROWSER_FOREIGN_BRANCH_ID;
const password=process.env.DRVO_BROWSER_SYNTHETIC_PASSWORD;
for(const id of [business,branch,foreignBusiness,foreignBranch])
 assert.ok(UUID.test(id),'Invalid disposable scope fixture');
assert.ok(typeof password==='string'&&password.length>=12);
const origin='https://drvo-ci.test';
const url=(b,br)=>origin+'/workspace/'+b+'/'+br+'/salon';
let phase='launch';
async function signIn(context,username){
 const page=await context.newPage();
 await page.goto(origin+'/sign-in',{waitUntil:'networkidle'});
 await page.getByLabel('اسم المستخدم').fill(username);
 await page.getByLabel('كلمة المرور').fill(password);
 await page.getByRole('button',{name:'تسجيل الدخول'}).click();
 await page.waitForURL('**/workspaces',{timeout:30000});
 await page.getByRole('heading',{name:'شركاتك وفروعك'}).waitFor();
 return page;
}
async function main(){
 let browser;
 try{
  browser=await chromium.launch({
   headless:true,
   executablePath:process.env.DRVO_BROWSER_CHROME_PATH,
   args:['--host-resolver-rules=MAP drvo-ci.test 127.0.0.1','--no-proxy-server'],
  });
  const privileged=await browser.newContext({ignoreHTTPSErrors:true});
  phase='privileged login';
  const operator=await signIn(privileged,'scheduler.booking.ci');
  phase='privileged salon overview';
  await operator.goto(url(business,branch),{waitUntil:'networkidle'});
  await operator.getByRole('heading',{name:'لوحة تشغيل الصالون'}).waitFor();
  await operator.getByText('CI Business · CI Branch').waitFor();
  await operator.getByText(/الحجوزات المعروضة:/).waitFor();
  await operator.getByText(/مسودات POS المعروضة:/).waitFor();
  assert.equal((await operator.getByText(/مسودات POS المعروضة:/).count()),1);
  phase='separate staff login';
  const restricted=await browser.newContext({ignoreHTTPSErrors:true});
  const staff=await signIn(restricted,'staff.read.booking.ci');
  phase='staff read only overview';
  await staff.goto(url(business,branch),{waitUntil:'networkidle'});
  await staff.getByRole('heading',{name:'لوحة تشغيل الصالون'}).waitFor();
  await staff.getByText(/الحجوزات المعروضة:/).waitFor();
  await staff.getByText('CI Business · CI Branch').waitFor();
  assert.equal((await staff.getByText(/مسودات POS المعروضة:/).count()),0);
  phase='staff POST rejected by actual Nest and SQL rights';
  const status=await staff.evaluate(async ids=>{
   const response=await fetch('/api/workspaces/'+ids.b+'/branches/'+ids.br+
    '/booking/resources',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json',
       'Idempotency-Key':crypto.randomUUID()},
      body:JSON.stringify({displayName:'Read only denied',kind:'CHAIR'}),
   });
   return response.status;
  },{b:business,br:branch});
  assert.equal(status,404);
  phase='cross tenant Salon Overview denial';
  await staff.goto(url(foreignBusiness,foreignBranch),{waitUntil:'networkidle'});
  await staff.getByRole('alert').filter({
   hasText:'مش مسموح بعرض لوحة الصالون لهذا الفرع.',
  }).waitFor();
  assert.equal((await staff.getByText('CI Business · CI Branch').count()),0);
  phase='anonymous session denial';
  const anonymous=await browser.newContext({ignoreHTTPSErrors:true});
  const guest=await anonymous.newPage();
  await guest.goto(url(business,branch),{waitUntil:'networkidle'});
  await guest.waitForURL('**/sign-in',{timeout:30000});
  console.log('PASS: real disposable HTTPS browser + Next + K5 + Nest + SQL scoped Operator/Staff');
 }finally{
  await browser?.close();
 }
}
main().catch(()=>{console.error('FAIL: disposable browser phase: '+phase);
 process.exitCode=1;});

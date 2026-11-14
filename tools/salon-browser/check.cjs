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
let diagnosticPage=null;
async function signIn(context,username){
 const page=await context.newPage();
 phase='sign-in page navigation';
 await page.goto(origin+'/sign-in',{waitUntil:'domcontentloaded',timeout:45000});
 phase='form fields';
 await page.getByLabel('اسم المستخدم').fill(username);
 await page.getByLabel('كلمة المرور').fill(password);
 phase='POST /api/auth/login response';
 const [loginResponse]=await Promise.all([
  page.waitForResponse(r=>r.url().endsWith('/api/auth/login'),{timeout:20000}),
  page.getByRole('button',{name:'تسجيل الدخول'}).click(),
 ]);
 const status=loginResponse.status();
 if(status!==200)throw new Error('LOGIN_HTTP_STATUS_'+status);
 phase='post-login /workspaces navigation';
 await page.waitForURL('**/workspaces',{timeout:20000});
 phase='workspaces heading';
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
  diagnosticPage=operator;
  phase='privileged salon navigate';
  await operator.goto(url(business,branch),{waitUntil:'domcontentloaded',timeout:45000});
  phase='privileged salon heading';
  await operator.getByRole('heading',{name:'لوحة تشغيل الصالون'}).waitFor();
  phase='privileged SQL-backed branch label';
  await operator.getByText('CI Business · CI Branch').waitFor();
  phase='privileged SQL-backed booking count';
  await operator.getByText(/الحجوزات المعروضة:/).waitFor();
  phase='privileged independently authorized POS count';
  await operator.getByText(/مسودات POS المعروضة:/).waitFor();
  assert.equal((await operator.getByText(/مسودات POS المعروضة:/).count()),1);
  phase='separate staff login';
  const restricted=await browser.newContext({ignoreHTTPSErrors:true});
  const staff=await signIn(restricted,'staff.read.booking.ci');
  phase='staff salon navigate';
  await staff.goto(url(business,branch),{waitUntil:'domcontentloaded',timeout:45000});
  phase='staff salon heading';
  await staff.getByRole('heading',{name:'لوحة تشغيل الصالون'}).waitFor();
  phase='staff SQL booking count';
  await staff.getByText(/الحجوزات المعروضة:/).waitFor();
  phase='staff SQL branch label';
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
  await staff.goto(url(foreignBusiness,foreignBranch),{waitUntil:'domcontentloaded',timeout:45000});
  await staff.getByRole('alert').filter({
   hasText:'مش مسموح بعرض لوحة الصالون لهذا الفرع.',
  }).waitFor();
  assert.equal((await staff.getByText('CI Business · CI Branch').count()),0);
  phase='anonymous session denial';
  const anonymous=await browser.newContext({ignoreHTTPSErrors:true});
  const guest=await anonymous.newPage();
  await guest.goto(url(business,branch),{waitUntil:'domcontentloaded',timeout:45000});
  await guest.waitForURL('**/sign-in',{timeout:30000});
  console.log('PASS: real disposable HTTPS browser + Next + K5 + Nest + SQL scoped Operator/Staff');
 }catch(error){
  if(diagnosticPage&&!diagnosticPage.isClosed()){
   // Diagnostics are only status codes and booleans; NEVER log SQL, cookies or PII.
   try{
    const status=await diagnosticPage.evaluate(async ids=>{
     const path='/api/workspaces/'+ids.b+'/branches/'+ids.br;
     const urls=['/api/auth/me','/api/auth/workspaces',path,
      path+'/booking',path+'/customers',path+'/catalog',path+'/pos-drafts'];
     const codes=await Promise.all(urls.map(async u=>{
      try{return (await fetch(u,{credentials:'same-origin',cache:'no-store'})).status;}
      catch{return 0;}
     }));
     const w=await fetch('/api/auth/workspaces',{credentials:'same-origin'});
     const data=w.ok?await w.json():null;
     return {codes,workspaceCount:Array.isArray(data?.workspaces)?
      data.workspaces.length:-1,
      scopePresent:!!data?.workspaces?.some(x=>
       x.businessId===ids.b&&x.branchId===ids.br)};
    },{b:business,br:branch});
    const denied=await diagnosticPage.getByText(
     'مش مسموح بعرض لوحة الصالون لهذا الفرع.').count();
    const unavailable=await diagnosticPage.getByText(
     'تعذر تحميل اللوحة. حاول مرة تانية.').count();
    console.error('CI_SAFE_OVERVIEW_DIAGNOSTIC '+JSON.stringify({
     ...status,denied:denied>0,unavailable:unavailable>0}));
   }catch{console.error('CI_SAFE_OVERVIEW_DIAGNOSTIC unavailable');}
  }
  throw error;
 }finally{
  await browser?.close();
 }
}
main().catch(error=>{
 const safe=String(error instanceof Error?error.message:'Unknown failure').split('\n')[0].slice(0,160);
 console.error('FAIL: disposable browser phase: '+phase+'; '+safe);
 process.exitCode=1;
});

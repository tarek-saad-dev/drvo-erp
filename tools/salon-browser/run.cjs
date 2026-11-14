'use strict';
/** Parent-side CI-only browser integration run, called from disposable Booking SQL proof. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const {setTimeout:delay}=require('node:timers/promises');
function start(args,options={}){
 const child=spawn(process.execPath,args,{
  ...options,stdio:['ignore','ignore','ignore'],
 });
 return child;
}
async function waitForWeb(){
 for(let i=0;i<100;i++){
  try{
   const r=await fetch('http://127.0.0.1:3100/health',{
    signal:AbortSignal.timeout(1200),
   });
   if(r.ok)return;
  }catch{}
  await delay(350);
 }
 throw new Error('Disposable Next web did not become healthy');
}
async function waitForGateway(){
 for(let i=0;i<70;i++){
  const ok=await new Promise(resolve=>{
   const c=net.connect({host:'127.0.0.1',port:443});
   c.once('connect',()=>{c.destroy();resolve(true);});
   c.once('error',()=>resolve(false));
   c.setTimeout(1000,()=>{c.destroy();resolve(false);});
  });
  if(ok)return;
  await delay(300);
 }
 throw new Error('Disposable HTTPS gateway unavailable');
}
async function childCheck(env){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tools/salon-browser/check.cjs'],{
   env,stdio:['ignore','pipe','pipe'],
  });
  let stdout='',stderr='';
  child.stdout.on('data',data=>{stdout=(stdout+String(data)).slice(-600);});
  child.stderr.on('data',data=>{stderr=(stderr+String(data)).slice(-600);});
  child.once('error',()=>reject(new Error('Chromium check process start failed')));
  child.once('exit',code=>{
   if(code===0&&stdout.includes('PASS: real disposable HTTPS browser'))
    resolve();
   else reject(new Error('Chromium check failed: '+
    (stderr.match(/FAIL: disposable browser phase:[^\n]{1,210}/)?.[0]||'UNKNOWN')));
  });
 });
}
async function runBrowser(scope){
 assert.equal(process.env.CI,'true');
 assert.equal(process.env.BOOKING_BROWSER_DISPOSABLE,'YES');
 assert.equal(process.env.BOOKING_SQL_DISPOSABLE,'YES');
 assert.equal(process.env.BOOKING_TEST_PORT,'14342');
 const env={...process.env,
  DRVO_BROWSER_BUSINESS_ID:scope.business,
  DRVO_BROWSER_BRANCH_ID:scope.branch,
  DRVO_BROWSER_FOREIGN_BUSINESS_ID:scope.foreignBusiness,
  DRVO_BROWSER_FOREIGN_BRANCH_ID:scope.foreignBranch,
  DRVO_BROWSER_SYNTHETIC_PASSWORD:scope.password,
 };
 // Private flags are only enabled inside the throwaway Next process.
 const web=start(['node_modules/next/dist/bin/next','start',
  '--hostname','127.0.0.1','--port','3100'],{
  cwd:'apps/web',
  env:{...env,DRVO_K5_WEB_ENABLED:'YES',DRVO_BOOKING_WEB_ENABLED:'YES',
   DRVO_CUSTOMERS_WEB_ENABLED:'YES',DRVO_CATALOG_WEB_ENABLED:'YES',
   DRVO_POS_DRAFTS_WEB_ENABLED:'YES',DRVO_POS_PREVIEW_WEB_ENABLED:'YES'},
 });
 let gateway;
 try{
  await waitForWeb();
  gateway=start(['tools/salon-browser/loopback-gateway.cjs'],{env});
  await waitForGateway();
  await childCheck(env);
 }finally{
  gateway?.kill('SIGTERM');
  web.kill('SIGTERM');
 }
}
module.exports={runBrowser};

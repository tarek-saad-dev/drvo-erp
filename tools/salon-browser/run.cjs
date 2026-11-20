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
 // Hard ceiling covers S12 operator journey + S13 HR/Barber UI. Fail closed
 // well under the 45m workflow budget so SQL diagnostics still run.
 const MAX_MS=12*60*1000;
 // A stalled Chromium action must not consume the full 12-minute CI budget.
 const MAX_PHASE_IDLE_MS=120*1000;
 const fs=require('node:fs');
 const path=require('node:path');
 const heartbeat=path.join(process.env.RUNNER_TEMP||require('node:os').tmpdir(),
  'drvo-s12-phase.txt');
 try{fs.writeFileSync(heartbeat,'boot','utf8');}catch{}
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tools/salon-browser/check.cjs'],{
   env:{...env,DRVO_BROWSER_HEARTBEAT_FILE:heartbeat},
   stdio:['ignore','pipe','pipe'],
  });
  let stdout='',stderr='',settled=false;
  let lastPhase='boot',lastPhaseChangedAt=Date.now();
  const finish=(fn,arg)=>{
   if(settled)return;
   settled=true;clearTimeout(timer);clearInterval(phaseWatchdog);
   try{child.kill('SIGKILL');}catch{}
   fn(arg);
  };
  const phaseWatchdog=setInterval(()=>{
   if(settled)return;
   let observed=lastPhase;
   try{observed=fs.readFileSync(heartbeat,'utf8').trim().slice(0,120)||observed;}catch{}
   if(observed!==lastPhase){lastPhase=observed;lastPhaseChangedAt=Date.now();}
   if(Date.now()-lastPhaseChangedAt>MAX_PHASE_IDLE_MS){
    finish(reject,new Error('Chromium phase stalled > '+MAX_PHASE_IDLE_MS+
     'ms lastPhase='+lastPhase));
   }
  },5000);
  const timer=setTimeout(()=>{
   let last='unread';
   try{last=fs.readFileSync(heartbeat,'utf8').trim().slice(0,120);}catch{}
   finish(reject,new Error('Chromium check exceeded '+MAX_MS+
    'ms hard ceiling lastPhase='+last));
  },MAX_MS);
  child.stdout.on('data',data=>{stdout=(stdout+String(data)).slice(-1200);});
  child.stderr.on('data',data=>{
   const chunk=String(data);
   stderr=(stderr+chunk).slice(-2400);
   // Surface phase breadcrumbs in the workflow log (no PII/secrets).
   for(const line of chunk.split('\n')){
    if(line.startsWith('S12_PHASE ')||line.startsWith('FAIL:'))
     console.error(line.slice(0,160));
   }
  });
  child.once('error',()=>finish(reject,new Error('Chromium check process start failed')));
  child.once('exit',code=>{
   if(code===0&&stdout.includes('PASS: real disposable HTTPS browser'))
    finish(resolve);
   else {
    const codes=stderr.match(/CI_SAFE_OVERVIEW_DIAGNOSTIC [^\n]{1,280}/)?.[0]||'';
    const phase=stderr.match(/FAIL: disposable browser phase:[^\n]{1,180}/)?.[0]||
     stderr.match(/S12_PHASE [^\n]{1,120}/)?.[0]||'UNKNOWN';
    finish(reject,new Error('Chromium check failed: '+phase+' '+codes));
   }
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
   DRVO_POS_DRAFTS_WEB_ENABLED:'YES',DRVO_POS_PREVIEW_WEB_ENABLED:'YES',DRVO_HR_WEB_ENABLED:'YES'},
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

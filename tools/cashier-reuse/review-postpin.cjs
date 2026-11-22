'use strict';
// Read-only Cashier post-pin review. No API, DB, or feature activation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
function owner(p){
 if(/cut-club|wallet|loyalty|member|referral|client\/profile/i.test(p))return 'CRM_LOYALTY';
 if(/auth|otp|session/i.test(p))return 'IDENTITY_SECURITY_REVIEW';
 if(/db\/|scripts\/drvo|schema|migration/i.test(p))return 'SQL_SCHEMA_REVIEW';
 if(/booking|appointment/i.test(p))return 'BOOKING';
 if(/inventory|purchase/i.test(p))return 'INVENTORY';
 if(/messag|drvowa/i.test(p))return 'MESSAGING';
 return 'CROSS_MODULE_REVIEW';
}
function analyze(baseline,ledger,delta){
 assert.equal(delta.schema,'drvo.cashier.postpin-path-review.v1');
 assert.equal(delta.repository,'tarek-saad-dev/casher');
 assert.equal(baseline.sourceRevision,delta.fromRevision,'baseline revision mismatch');
 assert.equal(ledger.sourceRevision,delta.fromRevision,'ledger revision mismatch');
 assert.match(delta.toRevision,/^[0-9a-f]{40}$/);
 assert.notEqual(delta.fromRevision,delta.toRevision,'not a newer source');
 assert.ok(Array.isArray(delta.files)&&delta.files.length>0,'empty diff');
 const original=new Map(baseline.files.map(f=>[f.path,f.blob]));
 const linked=new Map();
 for(const w of ledger.workflows){
  for(const val of w['SourcePaths+BlobSHA']||[]){
   if(typeof val!=='string'||!val.includes('#'))continue;
   const p=val.slice(0,val.indexOf('#'));
   if(!linked.has(p))linked.set(p,[]);
   linked.get(p).push(w.ID);
  }
 }
 const seen=new Set();
 const changes=delta.files.map(f=>{
  assert.ok(typeof f.path==='string'&&f.path.length>0,'invalid source path');
  assert.ok(!seen.has(f.path),'duplicate diff path: '+f.path);
  seen.add(f.path);
  assert.ok(['added','modified','removed','renamed'].includes(f.status),'bad change type');
  assert.equal(f.review,'OPEN','no assumed source-review completion');
  if(f.status!=='removed')assert.match(f.blob,/^[0-9a-f]{40}$/);
  if(f.status==='modified'&&original.has(f.path))
   assert.notEqual(original.get(f.path),f.blob,'unchanged modified blob');
  if(f.status==='added')assert.ok(!original.has(f.path),'added path already present');
  return {path:f.path,status:f.status,blob:f.blob,previousBlob:original.get(f.path)||null,
   ownerCandidate:owner(f.path),linkedLegacyWorkflowIds:linked.get(f.path)||[],
   needsSourceReview:true,needsDRVOProof:true};
 });
 return {
  oldRevision:delta.fromRevision,currentCashierHead:delta.toRevision,
  postPinCommits:delta.commits.length,changedFiles:changes.length,
  oldRuntimeFiles:baseline.runtimeFiles,oldLedgerWorkflows:ledger.workflows.length,
  linkedChangedFiles:changes.filter(x=>x.linkedLegacyWorkflowIds.length).length,
  remainingReviewQueue:changes.length,portComplete:false,pilotVerified:false,
  note:'This is a source-diff review queue, not an exhaustive action inventory or DRVO parity evidence.',
  changes,
 };
}
if(require.main===module){
 const report=analyze(read('tools/cashier-reuse/cashier-source-baseline-2026-11-19.json'),
  read('tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json'),
  read('tools/cashier-reuse/cashier-postpin-path-review-2026-11-22.json'));
 console.log(JSON.stringify(report,null,2));
}
module.exports={analyze,owner};

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const manifest=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const REQUIRED=[
 'ID','SourceSHA','SourcePaths+BlobSHA','OriginalScreen','UserAction','AuthRole',
 'TenantBusinessBranchScope','Preconditions','Reads','Writes','Effects',
 'FailureAndRaceCases','OwnedModule','SalonExtension','TargetPaths','UIProof',
 'DomainTest','SQLHTTPTest','BrowserProof','DataProof','PilotProof','Status',
 'Blocker','NextAction',
];
const STATUS=new Set([
 'SOURCE_IDENTIFIED','PORTING','SOURCE_TESTED','DRVO_CI_PASS',
 'PRIVATE_BROWSER_VERIFIED','PILOT_VERIFIED','BLOCKED',
]);

test('workflow ledger exposes mandatory columns and status vocabulary',()=>{
 assert.equal(ledger.schema,'drvo.cashier.workflow-ledger.v1');
 assert.equal(ledger.sourceRevision,'046bf19b0d5833a07fe4b2891cbf3032d03b7cef');
 assert.deepEqual(ledger.columns,REQUIRED);
 assert.ok(Array.isArray(ledger.workflows)&&ledger.workflows.length>=40);
 for(const s of ledger.statusVocabulary)assert.ok(STATUS.has(s));
});

test('every workflow row has required fields and honest non-complete statuses',()=>{
 const seen=new Set();
 const runtime=new Map(manifest.files.map(f=>[f.path,f.blob]));
 let rowsWithBlobEvidence=0;
 for(const row of ledger.workflows){
  for(const col of REQUIRED)assert.ok(Object.prototype.hasOwnProperty.call(row,col),
   row.ID+' missing '+col);
  assert.equal(seen.has(row.ID),false,'duplicate workflow id '+row.ID);
  seen.add(row.ID);
  assert.ok(STATUS.has(row.Status),row.ID+' invalid status '+row.Status);
  assert.notEqual(row.Status,'PILOT_VERIFIED');
  assert.notEqual(row.Status,'PRIVATE_BROWSER_VERIFIED');
  assert.ok(Array.isArray(row['SourcePaths+BlobSHA']));
  let rowHasBlob=false;
  for(const entry of row['SourcePaths+BlobSHA']){
   const hashIdx=entry.indexOf('#');
   const p=hashIdx===-1?entry:entry.slice(0,hashIdx);
   const blob=hashIdx===-1?null:entry.slice(hashIdx+1);
   if(p.includes('*')||p.startsWith('tools/'))continue;
   assert.ok(runtime.has(p)||p.endsWith('.json'),
    row.ID+' source path not in locked runtime inventory: '+p);
   assert.ok(blob,row.ID+' Cashier source path missing immutable #blobsha: '+entry);
   assert.match(blob,/^[0-9a-f]{40}$/,row.ID+' invalid blob sha: '+blob);
   if(runtime.has(p)){
    assert.equal(blob,runtime.get(p),
     row.ID+' blob mismatch for '+p+': ledger='+blob+' baseline='+runtime.get(p));
    rowHasBlob=true;
   }
  }
  if(rowHasBlob)rowsWithBlobEvidence++;
  const proofOpen=['UIProof','BrowserProof','DataProof','PilotProof']
   .filter(k=>row[k]==='OPEN').length;
  if(row.Status==='PORTING'||row.Status==='SOURCE_IDENTIFIED'||row.Status==='BLOCKED'){
   assert.ok(proofOpen>0||row.ID==='PR0-SOURCE-LOCK',
    row.ID+' cannot claim closed proofs while incomplete');
  }
 }
 assert.ok(rowsWithBlobEvidence>=100,
  'expected >=100 rows with path#blob evidence, got '+rowsWithBlobEvidence);
 assert.ok(seen.has('CU-01'));
 assert.ok(seen.has('CU-02'));
 assert.ok(seen.has('POS-01'));
 assert.ok(seen.has('PR0-SOURCE-LOCK'));
 assert.ok(seen.has('SYS-08'));
 assert.ok(seen.has('HR-13'));
 assert.ok(seen.has('TR-10'));
});

'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {browserReviewMatrix}=require('../tools/salon-pilot/browser-matrix.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Owner/Staff browser matrix lists conditional positive and negative scope assertions',()=>{
 const plan=browserReviewMatrix();
 assert.equal(plan.mode,'REVIEW_ONLY_SYNTHETIC_CASE_DEFINITIONS_NOT_EXECUTED');
 assert.equal(plan.authenticatedBrowserTestsExecuted,false);
 assert.equal(plan.independentOperatorApprovalRequired,true);
 assert.ok(plan.requiredBeforeExecution.some(x=>x.includes('K5F')));
 assert.ok(plan.requiredBeforeExecution.some(x=>x.includes('ADR-032')));
 const ids=plan.cases.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const expected of ['DENY_FOREIGN_TENANT','DENY_FOREIGN_BRANCH','DENY_INDEPENDENT_POS','DENY_BAD_ORIGIN','HTTP_409_CONFLICT','DRAFT_NOT_POSTED','HTTP_200_IF_GRANTED']){
  assert.ok(plan.cases.some(x=>x.expected===expected),expected);
 }
 for(const key of ['canConnectToLiveVps','canApplySql','canEnableK5','canInviteUsers','canEnableModules','canPostSale'])
  assert.equal(plan[key],false,key);
 assert.deepEqual(Object.keys(plan.paths).sort(),['booking','bookingWindows','posDrafts','salon']);
});
test('matrix is inert and portable; public demo and private K5 route gates are not modified',()=>{
 const tool=read('tools/salon-pilot/browser-matrix.cjs');
 assert.doesNotMatch(tool,/require\(['"](?:mssql|node:http|node:https|node:net|node:child_process|ssh2|playwright|puppeteer)['"]\)/);
 assert.doesNotMatch(tool,/fetch\s*\(|process\.env\./);
 const privatePage=read('apps/web/src/app/workspace/[businessId]/[branchId]/booking/page.tsx');
 assert.match(privatePage,/DRVO_K5_WEB_ENABLED !== "YES"/);
 assert.match(privatePage,/DRVO_BOOKING_WEB_ENABLED !== "YES"/);
 assert.match(privatePage,/notFound\(\)/);
 const cli=spawnSync(process.execPath,['tools/salon-pilot/browser-matrix.cjs','--matrix'],{cwd:root,encoding:'utf8'});
 assert.equal(cli.status,0,cli.stderr);
 const plan=JSON.parse(cli.stdout);
 assert.equal(plan.authenticatedBrowserTestsExecuted,false);
 assert.equal(plan.cases.length,14);
 const invalid=spawnSync(process.execPath,['tools/salon-pilot/browser-matrix.cjs','--execute'],{cwd:root,encoding:'utf8'});
 assert.equal(invalid.status,1);
 assert.doesNotMatch(invalid.stderr,/token|password|private key/i);
});

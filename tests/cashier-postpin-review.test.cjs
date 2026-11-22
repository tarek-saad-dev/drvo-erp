'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../tools/cashier-reuse/review-postpin.cjs');
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const delta=require('../tools/cashier-reuse/cashier-postpin-path-review-2026-11-22.json');
test('all 6 new Cashier commits and 42 source changes form a fail-closed review queue',()=>{
 const out=analyze(baseline,ledger,delta);
 assert.equal(out.postPinCommits,6);
 assert.equal(out.changedFiles,42);
 assert.equal(out.remainingReviewQueue,42);
 assert.equal(out.oldRuntimeFiles,2174);
 assert.ok(out.oldLedgerWorkflows>=100);
 assert.equal(out.portComplete,false);
 assert.equal(out.pilotVerified,false);
 assert.ok(out.changes.every(c=>c.needsSourceReview&&c.needsDRVOProof));
 assert.ok(out.changes.some(c=>c.path==='src/app/api/public/cut-club/wallet/route.ts'));
 assert.ok(out.changes.some(c=>c.path==='db/drvo-migrations/026-cut-club-member-wallet/schema.sql'));
});
test('never upgrade a changed path to reviewed based on an existing ledger/manifest',()=>{
 assert.throws(()=>analyze({...baseline,sourceRevision:'f'.repeat(40)},ledger,delta),/baseline revision mismatch/);
 assert.throws(()=>analyze(baseline,ledger,{...delta,files:[...delta.files,delta.files[0]]}),/duplicate diff path/);
 assert.throws(()=>analyze(baseline,ledger,{...delta,files:[{...delta.files[0],review:'DONE'}]}),/no assumed source-review completion/);
 assert.throws(()=>analyze(baseline,{...ledger,sourceRevision:'f'.repeat(40)},delta),/ledger revision mismatch/);
});

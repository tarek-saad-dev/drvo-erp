'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('private Operations route gated by K5 and operations feature switch',()=>{
 const page=read('operations/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_OPERATIONS_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});
test('Operations UI never claims financial posting authorization',()=>{
 const client=read('operations/operations-client.tsx');
 for(const token of ['NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY','NOT_POSTED','GATED',
  'NOT_AUTHORIZED','Idempotency-Key','forceCloseShifts'])
  assert.ok(client.includes(token),'Required: '+token);
 assert.doesNotMatch(client,/localStorage|sessionStorage|\/api\/ledger|POSTED_SALE/);
});
test('private Treasury ops route gated separately from cash counts',()=>{
 const page=read('treasury/ops/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_TREASURY_OPS_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});
test('Treasury ops UI gates GL and requires open day/shift context',()=>{
 const client=read('treasury/treasury-ops-client.tsx');
 for(const token of ['NONPOSTING_TREASURY_MOVEMENTS_AND_RECON_ONLY','GATED',
  'NO_SETTLEMENT','COMPUTED_FROM_MOVEMENTS_ONLY','Idempotency-Key','GL GATED'])
  assert.ok(client.includes(token),'Required: '+token);
 assert.doesNotMatch(client,/localStorage|sessionStorage|\/api\/ledger/);
});
test('workspace launcher requires scoped GET for ops and treasury ops tiles',()=>{
 const home=read('workspace-home-client.tsx');
 const page=read('page.tsx');
 assert.match(home,/if\(operationsWebEnabled\)/);
 assert.match(home,/if\(treasuryOpsWebEnabled\)/);
 assert.match(home,/setCanViewOperations\(operationsResult\.ok\)/);
 assert.match(home,/setCanViewTreasuryOps\(treasuryOpsResult\.ok\)/);
 assert.match(page,/operationsWebEnabled=\{process\.env\.DRVO_OPERATIONS_WEB_ENABLED==="YES"\}/);
 assert.match(page,/treasuryOpsWebEnabled=\{process\.env\.DRVO_TREASURY_OPS_WEB_ENABLED==="YES"\}/);
});

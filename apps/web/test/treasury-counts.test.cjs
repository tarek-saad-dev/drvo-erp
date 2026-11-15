'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('private Treasury route gated by K5 and treasury-only feature switch',()=>{
 const page=read('treasury/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_TREASURY_COUNTS_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});
test('Treasury UI exposes count observations rather than fabricated balances or postings',()=>{
 const client=read('treasury/treasury-client.tsx');
 for(const token of ['NONPOSTING_PHYSICAL_CASH_COUNTS_ONLY','NOT_COMPUTED',
  'NOT_PERFORMED','NO_SETTLEMENT','NOT_POSTED','Idempotency-Key',
  'crypto.randomUUID()'])
  assert.ok(client.includes(token),'Required: '+token);
 assert.match(client,/credentials:"same-origin"/);
 assert.match(client,/cache:"no-store"/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|IndexedDB|CashMove|paidSale|\/api\/ledger/);
});
test('workspace tile requires server flag plus scoped GET result before showing',()=>{
 const home=read('workspace-home-client.tsx');
 const page=read('page.tsx');
 assert.match(home,/if\(treasuryWebEnabled\)/);
 assert.match(home,/setCanViewTreasury\(treasuryResult\.ok\)/);
 assert.match(home,/treasuryWebEnabled&&canViewTreasury/);
 assert.match(page,/treasuryWebEnabled=\{process\.env\.DRVO_TREASURY_COUNTS_WEB_ENABLED==="YES"\}/);
});

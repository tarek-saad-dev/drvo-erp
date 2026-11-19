'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const lock=require('../tools/cashier-reuse/cashier-source-lock-2026-11-19.json');
const delta=require('../tools/cashier-reuse/cashier-source-delta-2026-11-19.json');
const manifest=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const all=require('../tools/cashier-reuse/cashier-all-source-blobs-2026-11-19.json');
const prev=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-17.json');
const REV='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const PREV='bc9c03fff86074872590ad0fd3525f9a4e416958';

test('2026-11-19 Cashier source lock records immutable SHA and prior pin',()=>{
 assert.equal(lock.schema,'drvo.cashier.source-lock.v1');
 assert.equal(lock.sourceRevision,REV);
 assert.equal(lock.previousRevision,PREV);
 assert.equal(manifest.sourceRevision,REV);
 assert.equal(all.sourceRevision,REV);
 assert.equal(delta.fromRevision,PREV);
 assert.equal(delta.toRevision,REV);
 assert.equal(prev.sourceRevision,PREV,'historical pin must remain intact');
});

test('new inventory covers whole repo and runtime with blob provenance',()=>{
 assert.equal(all.files,4296);
 assert.equal(all.blobs.length,4296);
 assert.equal(manifest.runtimeFiles,2174);
 assert.equal(manifest.files.length,2174);
 assert.equal(manifest.defaultMigrationStatus,'UNVERIFIED');
 const blobs=new Map(all.blobs.map(([p,sha])=>[p,sha]));
 const seen=new Set();
 for(const file of manifest.files){
  assert.ok(/^src\/.+\.tsx?$/.test(file.path));
  assert.ok(!/__tests__|\.test\.|\.spec\./.test(file.path));
  assert.ok(/^[0-9a-f]{40}$/.test(file.blob));
  assert.equal(blobs.get(file.path),file.blob);
  assert.equal(seen.has(file.path),false);seen.add(file.path);
 }
});

test('delta vs previous pin does not silently remove critical Cashier paths',()=>{
 assert.equal(delta.criticalPathsRetained,true);
 assert.equal(delta.counts.removed,0);
 assert.equal(delta.counts.added,5);
 assert.ok(delta.counts.changed>=1);
 const paths=new Set(manifest.files.map(f=>f.path));
 for(const p of [
  'src/app/income/pos/page.tsx',
  'src/components/pos/CustomerSearch.tsx',
  'src/components/pos/QuickCustomerModal.tsx',
  'src/components/pos/CartPanel.tsx',
  'src/hooks/useSaleState.ts',
  'src/lib/sales/service-line-totals.ts',
  'src/apps/pos/application/createSale.ts',
  'src/apps/treasury/internal/postMovement.ts',
  'src/apps/booking/application/convertBooking.ts',
  'src/app/api/customers/route.ts',
 ])assert.ok(paths.has(p),'critical runtime path missing from new lock: '+p);
 for(const gone of delta.removed){
  assert.fail('unexpected removed Cashier source path: '+gone.path);
 }
});

test('source lock is not a fake full-parity badge',()=>{
 assert.ok(!Object.prototype.hasOwnProperty.call(lock,'fullyMigrated'));
 assert.ok(!Object.prototype.hasOwnProperty.call(manifest,'live'));
 assert.equal(manifest.defaultMigrationStatus,'UNVERIFIED');
});

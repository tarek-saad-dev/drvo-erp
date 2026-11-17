'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const manifest=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-17.json');
const REV='bc9c03fff86074872590ad0fd3525f9a4e416958';
test('Cashier latest exact-source baseline includes ALL discovered runtime source, API and pages',()=>{
 assert.equal(manifest.schema,'drvo.cashier.source-baseline.v1');
 assert.equal(manifest.repo,'tarek-saad-dev/casher');
 assert.equal(manifest.sourceRevision,REV);
 assert.equal(manifest.totalRepositoryBlobs,4291);
 assert.equal(manifest.runtimeFiles,2168);
 assert.equal(manifest.byKind.API_ROUTE,496);
 assert.equal(manifest.byKind.PAGE,128);
 assert.equal(manifest.defaultMigrationStatus,'UNVERIFIED');
 assert.equal(manifest.files.length,manifest.runtimeFiles);
});
test('every source file has immutable Git blob provenance and a review owner candidate',()=>{
 const seen=new Set(),groups={},owners={};
 for(const file of manifest.files){
  assert.ok(typeof file.path==='string'&&/^src\/.+\.tsx?$/.test(file.path));
  assert.ok(/^[0-9a-f]{40}$/.test(file.blob));
  assert.ok(typeof file.kind==='string'&&file.kind.length>=4);
  assert.ok(typeof file.ownerCandidate==='string'&&file.ownerCandidate.length>=3);
  assert.equal(seen.has(file.path),false,'duplicate source '+file.path);seen.add(file.path);
  groups[file.kind]=(groups[file.kind]||0)+1;
  owners[file.ownerCandidate]=(owners[file.ownerCandidate]||0)+1;
 }
 assert.deepEqual(groups,manifest.byKind);
 assert.deepEqual(owners,manifest.byOwner);
 assert.ok(manifest.byOwner.CROSS_MODULE_REVIEW>0,'ambiguities must never be silently dropped');
});
test('critical existing Cashier full-journey source paths remain tracked',()=>{
 const paths=new Set(manifest.files.map(x=>x.path));
 for(const p of [
  'src/app/income/pos/page.tsx',
  'src/hooks/useSaleState.ts',
  'src/lib/sales/service-line-totals.ts',
  'src/components/pos/PosInvoicePanel.tsx',
  'src/components/pos/CartPanel.tsx',
  'src/components/pos/QuickActionsBar.tsx',
  'src/apps/pos/application/createSale.ts',
  'src/apps/pos/application/updateSale.ts',
  'src/apps/pos/application/deleteSale.ts',
  'src/apps/treasury/internal/postMovement.ts',
  'src/apps/booking/application/convertBooking.ts',
  'src/components/hr/DailyPayrollPanel.tsx',
  'src/lib/pos/groomPackageCart.ts',
 ])assert.ok(paths.has(p),'untracked Cashier source path: '+p);
});
test('source inventory is not a fictional DRVO parity/prod deployment badge',()=>{
 assert.equal(manifest.defaultMigrationStatus,'UNVERIFIED');
 assert.ok(!Object.prototype.hasOwnProperty.call(manifest,'fullyMigrated'));
 assert.ok(!Object.prototype.hasOwnProperty.call(manifest,'live'));
});

test('whole Cashier repository is pinned, including SQL, tests, docs and platform apps',()=>{
 const all=require('../tools/cashier-reuse/cashier-all-source-blobs-2026-11-17.json');
 assert.equal(all.sourceRevision,REV);
 assert.equal(all.files,4291);
 assert.equal(all.sourceComplete,true);
 assert.equal(all.blobs.length,all.files);
 const blobs=new Map();
 for(const [path,sha,size] of all.blobs){
  assert.ok(typeof path==='string'&&path.length>0);
  assert.ok(/^[0-9a-f]{40}$/.test(sha));
  assert.ok(size===null||(Number.isSafeInteger(size)&&size>=0));
  assert.equal(blobs.has(path),false,'Duplicate original Cashier file '+path);
  blobs.set(path,sha);
 }
 for(const file of manifest.files){
  assert.equal(blobs.get(file.path),file.blob,
   'Runtime inventory must preserve original repo Git blob for '+file.path);
 }
 for(const mandatory of [
  'src/apps/pos/application/createSale.ts',
  'src/apps/booking/application/convertBooking.ts',
  'src/apps/treasury/internal/postMovement.ts',
  'src/app/income/pos/page.tsx',
  'db/migrations/add-drvo-007-treasury-movement-registry.sql',
  'db/migrations/add-daily-payroll-dual-cashmove.sql',
  'db/migrations/create-booking-slot-claims.sql',
 ])
  assert.ok(blobs.has(mandatory),'Missing authoritative supporting source '+mandatory);
});

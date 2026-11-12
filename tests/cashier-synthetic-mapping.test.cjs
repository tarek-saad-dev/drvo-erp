const test=require('node:test');
const assert=require('node:assert/strict');
const {makeSyntheticMapPlan}=require('../tools/cashier-reuse/synthetic-map-plan.cjs');
const guid=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const good=()=>({
  datasetId:'SYN-CUT-PILOT-A',
  destination:{tenantId:guid(1),businessId:guid(2)},
  branches:[
    {sourceBranchKey:'SYN-BRANCH-01',tenantId:guid(1),businessId:guid(2),branchId:guid(3)},
    {sourceBranchKey:'SYN-BRANCH-02',tenantId:guid(1),businessId:guid(2),branchId:guid(4)},
  ],
  rows:[
    {legacyTable:'TblClient',legacyId:101,sourceBranchKey:'SYN-BRANCH-01',targetId:guid(11)},
    {legacyTable:'TblPro',legacyId:55,sourceBranchKey:'SYN-BRANCH-02',targetId:guid(12)},
  ],
});
test('CU-2: deterministic synthetic plan, explicit branch ancestry and zero writes',()=>{
  const a=makeSyntheticMapPlan(good()),b=makeSyntheticMapPlan({...good(),rows:good().rows.reverse()});
  assert.equal(a.mode,'SYNTHETIC_DRY_RUN_ONLY');assert.equal(a.writes,0);
  assert.equal(a.count,2);assert.equal(a.digest,b.digest);
  assert.deepEqual(a.items.map(x=>x.targetEntity),['CUSTOMER','CATALOG_OFFERING']);
  assert.equal(a.items[0].tenantId,guid(1));
  assert.equal(a.items[0].businessId,guid(2));
  assert.equal(a.items[1].verifiedBranchId,guid(4));
  assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.items)&&Object.isFrozen(a.items[0]));
});
test('CU-2: unknown branch, forged Tenant or Business cannot be mapped',()=>{
  for(const mutation of [
    p=>{p.branches[0].tenantId=guid(99);},
    p=>{p.branches[0].businessId=guid(99);},
    p=>{p.rows[0].sourceBranchKey='SYN-BRANCH-99';},
    p=>{p.rows[0].sourceBranchKey='../../Cut';},
    p=>{p.branches[1].sourceBranchKey=p.branches[0].sourceBranchKey;},
    p=>{p.rows[0].tenantId=guid(99);},
  ]){const x=good();mutation(x);assert.throws(()=>makeSyntheticMapPlan(x),TypeError);}
});
test('CU-2: duplicated legacy source, destination collision and invalid entity all deny',()=>{
  for(const mutation of [
    p=>{p.rows.push({...p.rows[0]});},
    p=>{p.rows[1].targetId=p.rows[0].targetId;p.rows[1].legacyTable='TblClient';},
    p=>{p.rows[0].legacyTable='TblEmp';},
    p=>{p.rows[0].legacyId=0;},
    p=>{p.rows[0].legacyId=1.1;},
    p=>{p.rows[0].targetId='not-an-id';},
  ]){const x=good();mutation(x);assert.throws(()=>makeSyntheticMapPlan(x),TypeError);}
});
test('CU-2: reject PII, connection strings, non synthetic IDs and malformed input',()=>{
  for(const mutation of [
    p=>{p.rows[0].name='Real person';},
    p=>{p.rows[0].phone='+201111111111';},
    p=>{p.sourceConnectionString='Server=legacy';},
    p=>{p.datasetId='CashierProduction';},
    p=>{p.rows=[];},
  ]){const x=good();mutation(x);assert.throws(()=>makeSyntheticMapPlan(x),TypeError);}
});

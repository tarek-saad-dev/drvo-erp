'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {CURRENT_K5F_PREFIX,sourceManifest,compareHistoryToSource}=require('../tools/staging-readiness/manifest-plan.cjs');
const source=sourceManifest();
const prefix=source.slice(0,9).map(x=>({name:x.name,checksum:x.checksum}));
const evidence=(rows)=>({database:'DRVO_ERP_STAGING',rows});
test('staging source manifest enumerates exactly 001–017, with original 001–009 K5F prefix',()=>{
 assert.equal(source.length,17);assert.equal(CURRENT_K5F_PREFIX.length,9);
 assert.deepEqual(source.slice(0,9).map(x=>x.name),[...CURRENT_K5F_PREFIX]);
 assert.equal(source[13].name,'014_branch_pos_drafts.sql');
 assert.equal(source[14].name,'015_booking_appointment_lifecycle.sql');
 assert.equal(source[15].name,'016_resource_dated_availability.sql');
 assert.equal(source[16].name,'017_booking_resource_window_close.sql');
});
test('all valid simulated K5F records still leave activation explicitly blocked',()=>{
 const result=compareHistoryToSource(evidence(prefix));
 assert.equal(result.status,'REVIEW_ONLY_NOT_AUTHORIZED');
 assert.equal(result.observedRows,9);
 assert.deepEqual(result.unobservedSourceMigrations,source.slice(9).map(x=>x.name));
 assert.equal(result.canApplyToVps,false);
 assert.equal(result.canEnableModules,false);
});
test('no-history report is not a pass/approval',()=>{
 const result=compareHistoryToSource(evidence([]));
 assert.equal(result.canApplyToVps,false);
 assert.equal(result.unobservedSourceMigrations.length,17);
});
test('unknown target, more than nine rows, reordering and checksum drift fail closed',()=>{
 const bad=[
  {...evidence(prefix),database:'Cashier'},
  evidence([...prefix,source[9]]),
  evidence([...prefix].reverse()),
  evidence([{name:prefix[0].name,checksum:'0'.repeat(64)}]),
  evidence([prefix[1]]),
  evidence([{name:prefix[0].name,checksum:prefix[0].checksum,extra:'data'}]),
  {database:'DRVO_ERP_STAGING',rows:[],sqlPassword:'do-not-trust'},
  null,
 ];
 for(const x of bad)assert.throws(()=>compareHistoryToSource(x));
});

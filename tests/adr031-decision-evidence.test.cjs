'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {firstJournalTruth,tenderTruth}=require('../tools/finance/adr031-decision-evidence.cjs');
const make=(strategy,sourceCommitted,firstJournalCommitted,balanced,outboxCommitted)=>
 ({strategy,sourceCommitted,firstJournalCommitted,balanced,outboxCommitted});
test('ADR-031 Option A requires a committed sale, balanced first GL and outbox together',()=>{
 assert.equal(firstJournalTruth(make('ATOMIC_A',false,false,false,false)),'NOT_COMMITTED');
 assert.equal(firstJournalTruth(make('ATOMIC_A',true,true,true,true)),'POSTED');
 assert.equal(firstJournalTruth(make('ATOMIC_A',true,false,false,true)),'INVALID_EVIDENCE');
 assert.equal(firstJournalTruth(make('ATOMIC_A',true,true,true,false)),'INVALID_EVIDENCE');
});
test('ADR-031 Option B never calls accepted source POSTED without balanced GL',()=>{
 assert.equal(firstJournalTruth(make('ASYNC_B',true,false,false,true)),'ACCOUNTING_PENDING');
 assert.equal(firstJournalTruth(make('ASYNC_B',true,true,true,true)),'POSTED');
 assert.equal(firstJournalTruth(make('ASYNC_B',true,false,false,false)),'INVALID_EVIDENCE');
});
test('Exhaustive 2x16 synthetic A/B evidence combinations preserve truthful posting',()=>{
 for(const strategy of ['ATOMIC_A','ASYNC_B'])for(let mask=0;mask<16;mask++){
  const values=[0,1,2,3].map(i=>Boolean(mask&(1<<i)));
  const result=firstJournalTruth(make(strategy,...values));
  const [source,journal,balanced,outbox]=values;
  assert.equal(result==='POSTED',source&&journal&&balanced&&outbox,
   'Unexpected POSTED for '+strategy+' mask '+mask);
  if(result==='ACCOUNTING_PENDING'){
   assert.equal(strategy,'ASYNC_B');
   assert.equal(source,true);assert.equal(journal,false);
   assert.equal(balanced,false);assert.equal(outbox,true);
  }
 }
});
test('screenshot/electronic claim never becomes independently verified bank settlement',()=>{
 assert.equal(tenderTruth({evidenceKind:'SCREENSHOT_ONLY',verifiedByAuthority:false}),'UNVERIFIED_CLAIM');
 assert.equal(tenderTruth({evidenceKind:'CASH_COUNTED',verifiedByAuthority:false}),'BRANCH_CASH_CUSTODY_ONLY');
 assert.equal(tenderTruth({evidenceKind:'NONE',verifiedByAuthority:false}),'NO_COLLECTION_EVIDENCE');
 assert.equal(tenderTruth({evidenceKind:'PROVIDER_CONFIRMED',verifiedByAuthority:true}),'PROVIDER_CONFIRMED');
 assert.equal(tenderTruth({evidenceKind:'PROVIDER_CONFIRMED',verifiedByAuthority:false}),'UNVERIFIED_CLAIM');
 assert.equal(tenderTruth({evidenceKind:'SCREENSHOT_ONLY',verifiedByAuthority:true}),'INVALID_EVIDENCE');
});
test('malformed or injected business scope and unsupported finance strategy fail closed',()=>{
 assert.throws(()=>firstJournalTruth({...make('ATOMIC_A',true,true,true,true),tenantId:'forged'}),TypeError);
 assert.throws(()=>firstJournalTruth(make('MIXED',true,true,true,true)),TypeError);
 assert.throws(()=>firstJournalTruth(make('ASYNC_B',1,true,true,true)),TypeError);
 assert.throws(()=>tenderTruth({evidenceKind:'BANK_NOTE',verifiedByAuthority:true}),TypeError);
 assert.throws(()=>tenderTruth({evidenceKind:'PROVIDER_CONFIRMED',verifiedByAuthority:true,amountMinor:50}),TypeError);
});

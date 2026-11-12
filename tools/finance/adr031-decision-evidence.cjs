'use strict';
/**
 * ADR-031 test-only, synthetic state evidence matrix. NEVER call from POS,
 * Accounting, Treasury, API or outbox workers; this cannot post journals,
 * settle money, choose CoA, or confer authority to deploy.
 */
const BOOL=['sourceCommitted','firstJournalCommitted','balanced','outboxCommitted'];
function firstJournalTruth(input) {
 if(!input||typeof input!=='object'||Array.isArray(input)||
   !['ATOMIC_A','ASYNC_B'].includes(input.strategy)||
   Object.keys(input).sort().join(',')!==
    [...BOOL,'strategy'].sort().join(',')||
   BOOL.some(k=>typeof input[k]!=='boolean'))
   throw new TypeError('Invalid synthetic first-journal evidence');
 const {strategy,sourceCommitted,firstJournalCommitted,balanced,outboxCommitted}=input;
 if(!sourceCommitted) {
  return firstJournalCommitted||balanced||outboxCommitted?'INVALID_EVIDENCE':'NOT_COMMITTED';
 }
 if(!outboxCommitted||(!firstJournalCommitted&&balanced)||
    (firstJournalCommitted&&!balanced))return 'INVALID_EVIDENCE';
 if(strategy==='ATOMIC_A')
  return firstJournalCommitted?'POSTED':'INVALID_EVIDENCE';
 return firstJournalCommitted?'POSTED':'ACCOUNTING_PENDING';
}
function tenderTruth(input) {
 if(!input||typeof input!=='object'||Array.isArray(input)||
   Object.keys(input).sort().join(',')!=='evidenceKind,verifiedByAuthority'||
   !['NONE','CASH_COUNTED','SCREENSHOT_ONLY','PROVIDER_CONFIRMED'].includes(input.evidenceKind)||
   typeof input.verifiedByAuthority!=='boolean')
  throw new TypeError('Invalid synthetic tender evidence');
 const {evidenceKind,verifiedByAuthority}=input;
 if(evidenceKind==='PROVIDER_CONFIRMED')
  return verifiedByAuthority?'PROVIDER_CONFIRMED':'UNVERIFIED_CLAIM';
 if(verifiedByAuthority) return 'INVALID_EVIDENCE';
 if(evidenceKind==='CASH_COUNTED')return 'BRANCH_CASH_CUSTODY_ONLY';
 if(evidenceKind==='SCREENSHOT_ONLY')return 'UNVERIFIED_CLAIM';
 return 'NO_COLLECTION_EVIDENCE';
}
module.exports={firstJournalTruth,tenderTruth};

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateShiftReadiness}=require('../dist/packages/business-modules/operations/src/shift-readiness.js');
const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const scope={tenantId:ID(1),businessId:ID(2),branchId:ID(3)};
const otherScope={...scope,branchId:ID(90)};
function fixtures(){
 const day={scope,dayId:ID(4),businessDate:'2026-11-15',status:'OPEN'};
 const shift={scope,shiftId:ID(6),dayId:ID(4),actorAccountId:ID(5),status:'OPEN'};
 return {trustedScope:scope,trustedActorAccountId:ID(5),
  trustedExpectedDate:'2026-11-15',day,shift};
}
test('ready operations evidence never authorizes Treasury or Accounting posting',()=>{
 const result=evaluateShiftReadiness(fixtures());
 assert.deepEqual(result,{state:'READY_FOR_NONFINANCIAL_WORK',reasons:[],
  financialPostingState:'NOT_AUTHORIZED'});
});
test('Cashier shift/open requires active BusinessDay+Shift; missing/stale blocks',()=>{
 const f=fixtures();
 for(const [patch,reason] of [
  [{day:null},'NO_OPEN_DAY'],
  [{day:{...f.day,status:'CLOSED'}},'NO_OPEN_DAY'],
  [{day:{...f.day,businessDate:'2026-11-14'}},'STALE_BUSINESS_DAY'],
  [{shift:null},'NO_OPEN_SHIFT'],
  [{shift:{...f.shift,status:'CLOSED'}},'NO_OPEN_SHIFT'],
  [{shift:{...f.shift,dayId:ID(7)}},'SHIFT_DAY_MISMATCH'],
  [{shift:{...f.shift,actorAccountId:ID(9)}},'ACTOR_MISMATCH'],
 ]) {
  const outcome=evaluateShiftReadiness({...f,...patch});
  assert.equal(outcome.state,'BLOCKED');
  assert.ok(outcome.reasons.includes(reason),reason);
  assert.equal(outcome.financialPostingState,'NOT_AUTHORIZED');
 }
});
test('foreign Tenant/Business/Branch and malformed dates/IDs fail closed',()=>{
 const f=fixtures();
 for(const value of [
  {...f,trustedScope:{...scope,tenantId:'x'}},
  {...f,day:{...f.day,scope:otherScope}},
  {...f,shift:{...f.shift,scope:otherScope}},
  {...f,shift:{...f.shift,shiftId:'bad'}},
  {...f,day:{...f.day,businessDate:'2026-02-30'}},
  {...f,trustedExpectedDate:'2026-02-30'},
  {...f,trustedActorAccountId:'bad'},
 ])assert.throws(()=>evaluateShiftReadiness(value),TypeError);
});
test('does not compare UTC dates or interpret client-specific local clock itself',()=>{
 const f=fixtures();
 const result=evaluateShiftReadiness({...f,trustedExpectedDate:'2026-11-16'});
 assert.equal(result.state,'BLOCKED');
 assert.ok(result.reasons.includes('STALE_BUSINESS_DAY'));
 assert.equal(result.financialPostingState,'NOT_AUTHORIZED');
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
test('Cashier BusinessDay reconciliation excerpt matches fixture contract',()=>{
 const src=read('_cashier_source/operations/businessDayReconciliation.ts');
 const fixture=read('tests/fixtures/cashier/businessDayReconciliation.ts');
 assert.match(src,/planBusinessDayReconciliation/);
 assert.match(src,/ROLLED_OVER/);
 assert.match(fixture,/planBusinessDayReconciliation/);
 assert.match(read('packages/business-modules/operations/src/business-day.ts'),/planBusinessDay/);
 assert.match(read('apps/api/src/operations/ops-policy.ts'),/planBusinessDay/);
});
test('Cashier day/shift invariants are preserved as non-posting comments in SQL029',()=>{
 const inv=read('_cashier_source/operations/invariants.ts');
 const sql=read('db/migrations/029_operations_business_day_shift.sql');
 assert.match(inv,/ONE_OPEN_BUSINESS_DAY_PER_BRANCH/);
 assert.match(inv,/ONE_OPEN_SHIFT_PER_USER/);
 assert.match(sql,/UX_BusinessDay_OneOpenPerBranch/);
 assert.match(sql,/UX_OperationalShift_OneOpenPerAccount/);
 assert.match(sql,/NO sale, Treasury balance mutation/);
 assert.match(sql,/ADR-031/);
});
test('SQL030 movements always gate GL and depend on open day/shift',()=>{
 const sql=read('db/migrations/030_treasury_cash_movements_recon.sql');
 assert.match(sql,/DF_TreasuryCashMovement_Gl DEFAULT\('GATED'\)/);
 assert.match(sql,/DF_TreasuryShiftRecon_Gl DEFAULT\('GATED'\)/);
 assert.match(sql,/CK_TreasuryCashMovement_Gl CHECK\(GlPostState='GATED'\)/);
 assert.match(sql,/CK_TreasuryShiftRecon_Gl CHECK\(GlPostState='GATED'\)/);
 assert.match(sql,/Cash movement requires OPEN business day/);
 assert.match(sql,/Cash movement requires actor OPEN shift on day/);
 assert.doesNotMatch(sql,/INSERT.*Journal|core\.GeneralLedger|POSTED_JOURNAL/i);
});
test('ledger OPS/TR rows for day-shift-movements are PORTING with honest OPEN proofs',()=>{
 const byId=Object.fromEntries(ledger.workflows.map(w=>[w.ID,w]));
 for(const id of ['TR-05','FIN-05','TR-02','TR-04','TR-01','TR-03']){
  assert.ok(byId[id],id+' missing');
  assert.notEqual(byId[id].Status,'PILOT_VERIFIED');
  assert.notEqual(byId[id].BrowserProof,'PASS');
 }
 assert.equal(byId['TR-05'].Status,'PORTING');
 assert.ok(byId['TR-05'].TargetPaths.some(p=>p.includes('029_operations')));
 assert.equal(byId['FIN-05'].Status,'PORTING');
 assert.ok(byId['TR-02'].TargetPaths.some(p=>p.includes('030_treasury')));
 assert.equal(byId['TR-04'].Status,'PORTING');
 assert.match(byId['TR-04'].Blocker,/GL|ADR-031|GATED/i);
 assert.equal(byId['TR-03'].Status,'PORTING');
 assert.equal(byId['TR-08'].Status,'BLOCKED');
 assert.equal(byId['TR-09'].Status,'BLOCKED');
 assert.equal(byId['TR-10'].Status,'BLOCKED');
});

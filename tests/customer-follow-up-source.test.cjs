'use strict';
/**
 * CU-04: locks Cashier follow-up source paths + SQL034 invariants.
 * SQL behavior itself is proven only by disposable SQL HTTP (customers verify tip still SQL031).
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const BLOB='0b21742e4278ac659f29baecae8922ae160b69a5';

function gitBlob(text){
 const bytes=Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}

test('Cashier customerFollowUpValidation excerpt is the exact pinned blob',()=>{
 assert.equal(gitBlob(read('_cashier_source/crm/customerFollowUpValidation.ts')),BLOB);
 const entry=baseline.files.find(f=>f.path==='src/lib/customerFollowUpValidation.ts');
 assert.equal(entry.blob,BLOB);
 assert.equal(ledger.sourceRevision,PIN);
});

test('SQL034 follow-up desk is Business-scoped, EXECUTE-only, no messaging send',()=>{
 const sql=read('db/migrations/034_customer_follow_up.sql');
 assert.ok(!/^\s*GO\s*$/im.test(sql),'no GO batches');
 assert.ok(!sql.startsWith('\uFEFF'),'no BOM');
 assert.ok(!/[^\x00-\x7F]/.test(sql),'ASCII only');
 assert.match(sql,/CREATE TABLE core\.CustomerContactAttempt/);
 assert.match(sql,/PRIMARY KEY\(TenantId,BusinessId,CustomerId,AttemptId\)/);
 assert.match(sql,/DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core\.CustomerContactAttempt/);
 assert.match(sql,/GRANT EXECUTE ON OBJECT::core\.ReadCustomerFollowUpQueue/);
 assert.match(sql,/GRANT EXECUTE ON OBJECT::core\.LogCustomerContactAttempt/);
 assert.match(sql,/WHATSAPP_MANUAL/);
 assert.match(sql,/OffersConsentedAtUtc/);
 assert.doesNotMatch(sql,/TblinvServHead|wa\.me|sp_send|OPENQUERY|whatsapp\.send/i);
 assert.match(sql,/CU-05|posted Sales|dormant/i);
});

test('032 slot is reserved for inventory; booking is 033; follow-up is 034',()=>{
 const names=fs.readdirSync(path.join(root,'db/migrations'))
  .filter(f=>f.endsWith('.sql')).sort();
 assert.ok(names.includes('032_inventory_branch_transfers.sql'));
 assert.ok(names.includes('033_booking_reschedule.sql'));
 assert.ok(names.includes('034_customer_follow_up.sql'));
 const stub=read('db/migrations/032_inventory_branch_transfers.sql');
 assert.match(stub,/SLOT RESERVED|owned by feat\/cashier-inv-transfer/i);
 assert.doesNotMatch(stub,/CREATE TABLE core\.StockTransfer/i);
});

test('ledger CU-04 / BK-06 point at owned DRVO targets',()=>{
 const cu=ledger.workflows.find(w=>w.ID==='CU-04');
 const bk=ledger.workflows.find(w=>w.ID==='BK-06');
 assert.ok(cu);assert.ok(bk);
 assert.equal(cu.Status,'PORTING');
 assert.equal(bk.Status,'PORTING');
 assert.ok(cu.TargetPaths.some(p=>p.includes('034_customer_follow_up')));
 assert.ok(bk.TargetPaths.some(p=>p.includes('033_booking_reschedule')));
 assert.match(cu.Blocker,/WhatsApp|inactive|CU-05|posted Sales|dormant/i);
});

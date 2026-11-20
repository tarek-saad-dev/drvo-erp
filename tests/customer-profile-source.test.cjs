'use strict';
/**
 * CU-03 CRM profile + consent: locks the Cashier source excerpt blob, the DRVO adaptation
 * and SQL031 invariants. SQL behavior itself is proven only by the disposable SQL HTTP job
 * (tools/customers/verify.cjs); these are static guards, not a SQL execution proof.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const BLOB='70f0ad1ba02b29d8d656368807b9ff62e465bd75';

function gitBlob(text){
 const bytes=Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
const optionsFrom=text=>[...text.matchAll(/value:\s*["']([a-z_]+)["']/g)].map(m=>m[1]);

test('Cashier customerSource excerpt is the exact pinned blob (LF-normalised)',()=>{
 assert.equal(gitBlob(read('_cashier_source/crm/customerSource.ts')),BLOB);
 const entry=baseline.files.find(f=>f.path==='src/lib/customerSource.ts');
 assert.equal(entry.blob,BLOB);
 assert.equal(ledger.sourceRevision,PIN);
});

test('DRVO adaptation keeps exactly the Cashier option values and rules',()=>{
 const source=optionsFrom(read('_cashier_source/crm/customerSource.ts'));
 const adapted=optionsFrom(read('apps/api/src/customers/customer-source.ts'));
 const web=optionsFrom(read('apps/web/src/app/workspace/[businessId]/[branchId]/customers/customer-source.mjs'));
 assert.equal(source.length,9);
 assert.deepEqual(adapted,source);
 assert.deepEqual(web,source);
 const sql=read('db/migrations/031_customer_profile_consent.sql');
 for(const value of source)assert.ok(sql.includes("'"+value+"'"),'SQL031 missing source '+value);
 let api;
 try{api=require('../apps/api/dist/customers/customer-source');}catch{return;}
 assert.deepEqual([...api.CUSTOMER_SOURCE_VALUES],source);
});

test('SQL031 profile table is Business-scoped, composite-FK bound and EXECUTE-only',()=>{
 const sql=read('db/migrations/031_customer_profile_consent.sql');
 assert.ok(!/^\s*GO\s*$/im.test(sql),'no GO batches');
 assert.ok(!sql.startsWith('\uFEFF'),'no BOM');
 assert.ok(!/[^\x00-\x7F]/.test(sql),'ASCII only migration');
 assert.match(sql,/PRIMARY KEY\(TenantId,BusinessId,CustomerId\)/);
 assert.match(sql,/FK_CustomerProfile_Customer FOREIGN KEY\(TenantId,BusinessId,CustomerId\)/);
 assert.match(sql,/REFERENCES core\.Customer\(TenantId,BusinessId,CustomerId\)/);
 assert.match(sql,/DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core\.CustomerProfile/);
 assert.match(sql,/DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core\.CustomerOffersConsentEvent/);
 assert.match(sql,/GRANT EXECUTE ON OBJECT::core\.ReadCustomerProfile/);
 assert.match(sql,/GRANT EXECUTE ON OBJECT::core\.UpsertCustomerProfile/);
 assert.doesNotMatch(sql,/GRANT\s+(SELECT|INSERT|UPDATE|DELETE)/i);
 // Both procedures guard with the K5 session/RBAC assertion before touching data.
 assert.equal((sql.match(/EXEC core\.AssertCustomersBranchAction/g)||[]).length,2);
 assert.match(sql,/''customers\.read''/);
 assert.match(sql,/''customers\.manage''/);
});

test('SQL031 never infers or backfills marketing consent',()=>{
 const sql=read('db/migrations/031_customer_profile_consent.sql');
 // No UPDATE/INSERT touching existing customers or seeding consent from phones.
 assert.doesNotMatch(sql,/UPDATE\s+core\.Customer\b/i);
 assert.doesNotMatch(sql,/INSERT\s+INTO\s+core\.CustomerProfile[^;]*SELECT/is);
 assert.match(sql,/STAFF_CONFIRMED_CUSTOMER_WHATSAPP_OFFERS/);
 // Consent is only ever set under the explicit GRANT action and needs a stored phone.
 assert.match(sql,/IF @ConsentAction=''GRANT'' AND @Phone IS NULL THROW 51132/);
 assert.match(sql,/OffersConsentPhoneE164=c\.PhoneE164/);
 // All-or-nothing evidence columns + append-only history.
 assert.match(sql,/CK_CustomerProfile_ConsentEvidence/);
 assert.match(sql,/CREATE TABLE core\.CustomerOffersConsentEvent/);
 assert.match(sql,/CK_CustomerConsentEvent_Action CHECK\(Action IN\('GRANT','REVOKE'\)\)/);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+core\.CustomerOffersConsentEvent/i);
 assert.doesNotMatch(sql,/UPDATE\s+core\.CustomerOffersConsentEvent/i);
 // No financial, messaging-send or cross-module writes.
 assert.doesNotMatch(sql,/core\.(CashMove|Treasury|Journal|Sale|Invoice|Outbox|Message)/i);
});

test('SQL031 source CHECK cannot pass on UNKNOWN (null CameFrom with orphan details)',()=>{
 const sql=read('db/migrations/031_customer_profile_consent.sql');
 const check=sql.slice(sql.indexOf('CK_CustomerProfile_SourceDetails'),
  sql.indexOf('CK_CustomerProfile_ConsentEvidence'));
 assert.match(check,/ISNULL\(CameFrom,''\)='word_of_mouth'/);
 assert.match(check,/ISNULL\(CameFrom,''\)='referral_code'/);
 assert.match(check,/CameFrom IS NOT NULL AND ISNULL\(CameFrom,''\) NOT IN/);
});

test('ledger rows for CRM/profile cite real target paths and stay honestly incomplete',()=>{
 const rows=new Map(ledger.workflows.map(r=>[r.ID,r]));
 for(const id of ['CU-02','CU-03','CU-06']){
  const row=rows.get(id);
  assert.ok(row,id);
  assert.notEqual(row.Status,'DRVO_CI_PASS');
  assert.notEqual(row.Status,'PRIVATE_BROWSER_VERIFIED');
  assert.notEqual(row.Status,'PILOT_VERIFIED');
  assert.equal(row.BrowserProof,'OPEN');
  assert.equal(row.PilotProof,'OPEN');
 }
 const cu03=rows.get('CU-03');
 assert.equal(cu03.Status,'PORTING');
 for(const target of cu03.TargetPaths){
  const p=target.replace('apps/web/...','apps/web/src/app/workspace/[businessId]/[branchId]');
  assert.ok(fs.existsSync(path.join(root,p)),'missing target '+target);
 }
 assert.ok(cu03.TargetPaths.includes('db/migrations/031_customer_profile_consent.sql'));
});

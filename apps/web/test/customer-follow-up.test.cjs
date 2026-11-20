'use strict';
/**
 * CU-04 private CRM follow-up desk. SOURCE-LEVEL ONLY (no browser run).
 * No WhatsApp send; dormant-by-paid-visit stays out of this slice.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const scope=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/customers');
const read=p=>fs.readFileSync(path.join(scope,p),'utf8');

test('follow-up page is private and customers-web gated',()=>{
 const page=read('follow-up/page.tsx');
 assert.match(page,/DRVO_K5_WEB_ENABLED/);
 assert.match(page,/DRVO_CUSTOMERS_WEB_ENABLED/);
 assert.match(page,/notFound\(\)/);
});

test('follow-up client uses queue+contact-attempt APIs, no messaging send',()=>{
 const ui=read('follow-up/follow-up-client.tsx');
 assert.match(ui,/\/follow-up\?filter=/);
 assert.match(ui,/\/contact-attempts/);
 assert.match(ui,/method:"POST"/);
 assert.match(ui,/Idempotency-Key/);
 assert.match(ui,/credentials:"same-origin"/);
 assert.match(ui,/cache:"no-store"/);
 assert.match(ui,/WHATSAPP_MANUAL/);
 assert.match(ui,/messagingSent!==false|messagingSent:boolean/);
 assert.match(ui,/UNAVAILABLE_NO_POSTED_SALES|dormantEvidence/);
 assert.match(ui,/مفيش إرسال|مش بتبعت|تسجيل فقط/);
 assert.doesNotMatch(ui,/whatsapp\.send|wa\.me|\/api\/messaging|localStorage|sessionStorage/i);
 assert.doesNotMatch(ui,/inactiveMonths|totalSpending|TblinvServHead/i);
});

test('customers directory links to the follow-up desk',()=>{
 const dir=read('customers-client.tsx');
 assert.match(dir,/\/customers\/follow-up/);
 assert.match(dir,/مكتب المتابعة|مكتب متابعة/);
});

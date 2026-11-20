'use strict';
/**
 * POS-07 DRAFT print characterization. Pin: casher@046bf19. DRVO owns NON-POSTING
 * draft receipt preview + browser print only. Thermal agent / POSTED sale reprint stay OPEN.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const PRINT_BLOB='f65310306b30ca8b9a260013aad3556d7bdbb5aa';
const RECOVERY_BLOB='46cf0911e5f88311541828b250d0d0c34b78c16d';
const SETTINGS_BLOB='1fcb9e25f8c865771e2d973427311c13251a6c72';
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const pkg=require('../dist/packages/business-modules/pos/src/draft-print');

const ID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';

function gitBlob(text){
 const bytes=Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}

test('Cashier PrintInvoiceModal is the exact pinned blob; recovery/settings are READ excerpts',()=>{
 assert.equal(ledger.sourceRevision,PIN);
 const modal=read('_cashier_source/pos-print/PrintInvoiceModal.tsx');
 assert.equal(gitBlob(modal),PRINT_BLOB);
 const byPath=new Map(baseline.files.map(f=>[f.path,f.blob]));
 assert.equal(byPath.get('src/components/pos/PrintInvoiceModal.tsx'),PRINT_BLOB);
 assert.equal(byPath.get('src/components/printing/PrintRecoveryCenter.tsx'),RECOVERY_BLOB);
 assert.equal(byPath.get('src/app/admin/settings/printing/page.tsx'),SETTINGS_BLOB);
 assert.match(modal,/printHtmlViaLocalService/);
 assert.match(modal,/openBrowserPrintFallback/);
 assert.match(modal,/buildReceiptHTML/);
 assert.match(read('_cashier_source/pos-print/PrintRecoveryCenter.excerpt.tsx'),/READ-ONLY EXCERPT/);
 assert.match(read('_cashier_source/pos-print/printing-settings.excerpt.tsx'),/READ-ONLY EXCERPT/);
 assert.match(read('_cashier_source/pos-print/PrintRecoveryCenter.excerpt.tsx'),new RegExp(RECOVERY_BLOB));
 assert.match(read('_cashier_source/pos-print/printing-settings.excerpt.tsx'),new RegExp(SETTINGS_BLOB));
});

test('Nest draft-print copy stays byte-aligned with the shared package',()=>{
 const a=read('packages/business-modules/pos/src/draft-print.ts').replace(/\r\n/g,'\n');
 const b=read('apps/api/src/pos-drafts/draft-print.ts').replace(/\r\n/g,'\n');
 assert.equal(a,b);
 assert.equal(typeof pkg.buildPosDraftReceipt,'function');
 assert.equal(typeof pkg.renderPosDraftReceiptHtml,'function');
});

test('buildPosDraftReceipt marks NONPOSTING draft receipt and never authorizes paid/stock/GL',()=>{
 const receipt=pkg.buildPosDraftReceipt({
  draftId:ID(10),createdAtUtc:'2026-11-20T12:00:00.000Z',currency:'EGP',
  customerId:ID(5),customerDisplayName:'عميل تجريبي',customerPhone:'0100',
  headerDiscountMinor:1800,subtotalMinor:20000,linesNetMinor:18000,
  totalDiscountMinor:3800,grandTotalMinor:16200,
  branchLabel:'فرع التجربة',businessLabel:'DRVO POS',
  lines:[{
   lineNo:1,offeringId:ID(3),displayName:'حلاقة',kind:'SERVICE',quantity:2,
   unitPriceMinor:10000,grossMinor:20000,discountMinor:2000,netMinor:18000,
   executorEmployeeId:ID(4),executorDisplayName:'حلاق 1',
  }],
 });
 assert.equal(receipt.documentKind,'POS_DRAFT_RECEIPT');
 assert.equal(receipt.posting,'NOT_POSTED');
 assert.equal(receipt.paymentState,'NOT_COLLECTED');
 assert.equal(receipt.accountingState,'NOT_POSTED');
 assert.equal(receipt.inventoryState,'NOT_DECREMENTED');
 assert.equal(receipt.thermalAgent,'NOT_AVAILABLE');
 assert.equal(receipt.postedReprint,'NOT_AUTHORIZED');
 assert.equal(receipt.bannerAr,'مسودة — غير محصّلة / غير مرحّلة');
 assert.equal(receipt.grandTotalMinor,16200);
 assert.equal(receipt.lines[0].executorDisplayName,'حلاق 1');
 const html=pkg.renderPosDraftReceiptHtml(receipt);
 assert.match(html,/مسودة — غير محصّلة \/ غير مرحّلة/);
 assert.match(html,/POS_DRAFT_RECEIPT/);
 assert.match(html,/غير محصّلة/);
 assert.match(html,/ليس فاتورة بيع مرحّلة/);
 assert.doesNotMatch(html,/PayCash|PayVisa|paymentAllocations|GrandTotal\b/);
 assert.throws(()=>pkg.buildPosDraftReceipt({
  ...{
   draftId:ID(10),createdAtUtc:'2026-11-20T12:00:00.000Z',currency:'EGP',
   customerId:null,headerDiscountMinor:0,subtotalMinor:100,linesNetMinor:100,
   totalDiscountMinor:0,grandTotalMinor:99,lines:[{
    lineNo:1,offeringId:ID(3),displayName:'x',kind:'SERVICE',quantity:1,
    unitPriceMinor:100,grossMinor:100,discountMinor:0,netMinor:100,
    executorEmployeeId:null,
   }],
  },
 }),TypeError);
});

test('ledger POS-07 is PORTING with honest thermal/POSTED blockers',()=>{
 const row=ledger.workflows.find(w=>w.ID==='POS-07');
 assert.ok(row);
 assert.equal(row.SourceSHA,PIN);
 assert.equal(row.Status,'PORTING');
 assert.match(row.Blocker,/thermal|POSTED|ADR-031/i);
 assert.ok(row.TargetPaths.some(p=>p.includes('draft-print.ts')));
 assert.ok(row.TargetPaths.some(p=>p.includes('draft-print')));
 assert.match(row.DomainTest,/pos-draft-print-source/);
 assert.notEqual(row.Status,'DRVO_CI_PASS');
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const source=readFileSync(join(__dirname,'../src/app/workspace/[businessId]/[branchId]/pos-preview/pos-preview-client.tsx'),'utf8');
test('Cashier-adapted POS discount/tip preview is visible and isolated from saved DRAFT',()=>{
 assert.match(source,/معاينة الخصم وفرق المبلغ/);
 assert.match(source,/خصم استرشادي غير محفوظ/);
 assert.match(source,/إكرامية محتملة/);
 assert.match(source,/مبلغ العميل المفترض/);
 assert.match(source,/api\+"\/adjustments-preview"/);
 assert.match(source,/method:"POST",credentials:"same-origin",cache:"no-store"/);
 assert.match(source,/body:JSON\.stringify\(\{lines,headerDiscountMinor,customerPresentedMinor\}\)/);
 assert.match(source,/result\.paymentState!=="NOT_COLLECTED"/);
 assert.match(source,/result\.accountingState!=="NOT_POSTED"/);
 assert.match(source,/result\.discountRecorded!==false/);
 assert.match(source,/body:JSON\.stringify\(\{lines\}\)/);
 assert.doesNotMatch(source,/\/sales\/posted|\/payment\/capture|localStorage|sessionStorage/);
});
test('Input parser validates decimal currency without floating rounding',()=>{
 const m=source.match(/function readMoneyMinor\(value:string\):number\|null\s*\{([\s\S]*?)\n\}/);
 assert.ok(m,'Typed minor-unit decoder must be present');
 const parser=m[1].replace(/:\s*number\|null/g,'');
 const sourceFn='(function readMoneyMinor(value){'+parser+'})';
 const fn=Function('return '+sourceFn)();
 assert.equal(fn('12'),1200);
 assert.equal(fn('12.3'),1230);
 assert.equal(fn('12.34'),1234);
 for(const bad of ['','1.234','-1','1e3','NaN','Infinity',' 12 ', '12,50','900000000000.00']){
  assert.equal(fn(bad),null,bad);
 }
});
test('Editing any cart line drops all stale server-priced previews',()=>{
 assert.match(source,/function quickAdd\(offering:Offering\)[\s\S]*?setPreview\(null\);setAdjustment\(null\)/);
 assert.match(source,/function adjustLineQuantity\([\s\S]*?setPreview\(null\);setAdjustment\(null\)/);
 assert.match(source,/function createNewFromDraft\([\s\S]*?setPreview\(null\);setAdjustment\(null\)/);
 // Package-aware remove may clear a whole groupKey, then must still invalidate previews.
 assert.match(source,/onRemove=\{id=>\{[\s\S]*?setPreview\(null\);setAdjustment\(null\)/);
 assert.match(source,/packageMeta\?\.groupKey/);
 assert.match(source,/onExpand=\{next=>\{[\s\S]*?setPreview\(null\);setAdjustment\(null\)/);
 assert.match(source,/setDiscountText\(e\.target\.value\);setAdjustment\(null\)/);
 assert.match(source,/setPresentedText\(e\.target\.value\);setAdjustment\(null\)/);
});

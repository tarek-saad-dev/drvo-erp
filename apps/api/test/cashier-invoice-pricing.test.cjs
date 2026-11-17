'use strict';
// Execute EXACT Cashier source snapshot as a characterization oracle, not a fake
// recalculation assembled from documentation. No GitHub/network/SQL at test runtime.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto');
const ts=require('typescript');
const drvo=require('../dist/pos-preview/cashier-invoice-pricing.js');
const file=path.resolve(__dirname,'../../../tests/fixtures/cashier/service-line-totals-2026-11-17.ts');
function oldCashier(){
 const source=fs.readFileSync(file,'utf8');
 const blob=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0')
  .update(source).digest('hex');
 assert.equal(blob,'13942cef1852003af388a086f45c324ff1ae4d17',
  'Baseline Cashier source was silently changed!');
 const code=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
 }}).outputText;
 const exports={};
 const requirePinned=id=>{
  assert.equal(id,'@/lib/reportMonthUtils');
  return {roundMoney:v=>Math.round(v*100)/100};
 };
 vm.runInNewContext(code,{exports,require:requirePinned},{
  filename:'pinned-cashier-sale-math',timeout:1000,
 });
 return exports;
}
const cashier=oldCashier();
const major=minor=>minor/100;
const minor=major=>Math.round(major*100);
const pct=bps=>bps/100;
function compare(lines,header={}){
 const drvoLines=lines.map(x=>({
  unitPriceMinor:x.price,quantity:x.qty,bonusMinor:x.bonus??0,
  ...(x.disval===undefined?{}:{lineDiscountMinor:x.disval}),
  ...(x.pct===undefined?{}:{lineDiscountPercentBps:x.pct}),
 }));
 const oldLines=lines.map(x=>({
  sPrice:major(x.price),qty:x.qty,bonus:major(x.bonus??0),
  ...(x.disval===undefined?{}:{discountValue:major(x.disval)}),
  ...(x.pct===undefined?{}:{discountPercent:pct(x.pct)}),
 }));
 const drvoHeader={
  ...(header.disval===undefined?{}:{headerDiscountMinor:header.disval}),
  ...(header.pct===undefined?{}:{headerDiscountPercentBps:header.pct}),
 };
 const oldHeader={
  ...(header.disval===undefined?{}:{discountValue:major(header.disval)}),
  ...(header.pct===undefined?{}:{discountPercent:pct(header.pct)}),
 };
 const d=drvo.computeCashierInvoiceQuote(drvoLines,drvoHeader);
 const c=cashier.computeInvoiceItemsTotals(oldLines,oldHeader);
 for(const [dkey,ckey] of [
  ['subtotalMinor','subTotal'],['lineDiscountTotalMinor','lineDiscountTotal'],
  ['linesNetTotalMinor','linesNetTotal'],['headerDiscountMinor','headerDiscountValue'],
  ['totalDiscountMinor','totalDiscount'],['grandTotalMinor','grandTotal'],
  ['totalBonusMinor','totalBonus'],
 ])assert.equal(d[dkey],minor(c[ckey]),'Cashier mismatch: '+dkey+' '+JSON.stringify({lines,header}));
 assert.equal(d.headerDiscountPercentBps,Math.round(c.headerDiscountPercent*100));
 assert.equal(d.totalQty,c.totalQty);
 assert.equal(d.lines.length,c.lines.length);
 for(let i=0;i<d.lines.length;i++)
  for(const [dk,ck] of [
   ['grossMinor','grossAmount'],['discountMinor','discountValue'],
   ['netMinor','netAmount'],
  ])assert.equal(d.lines[i][dk],minor(c.lines[i][ck]),
   'Line mismatch '+i+' '+dk+' '+JSON.stringify({lines,header}));
 return d;
}
test('Cashier blob pinned and actual direct source executes (not a mock oracle)',()=>{
 assert.equal(typeof cashier.computeServiceLineTotals,'function');
 assert.equal(typeof cashier.resolveHeaderDiscount,'function');
 assert.equal(typeof cashier.computeInvoiceItemsTotals,'function');
 assert.equal(typeof cashier.hasNonZeroHeaderDiscount,'function');
});
test('Cashier exact golden: line value-vs-percent precedence, bonus and header post-line basis',()=>{
 const rows=[
  [[{price:10000,qty:2,pct:1000}],{pct:1000}],
  [[{price:10000,qty:2,disval:1500,pct:2000}],{disval:900,pct:2500}],
  [[{price:10000,qty:2,pct:2000},{price:40000,qty:1,disval:5000}],{pct:2500}],
  [[{price:2500,qty:3,pct:5000,bonus:800},{price:1200,qty:1}],{disval:1000}],
  [[{price:0,qty:1,disval:200}],{disval:10}],
  [[{price:10000,qty:1,disval:15000}],{pct:2500}],
  [[{price:30000,qty:1,pct:10000}],{disval:300}],
  [[{price:12300,qty:1},{price:20000,qty:2}],{}],
  [[{price:1,qty:1},{price:3,qty:1}],{pct:5000}],
  [[{price:10000,qty:1}],{disval:0,pct:2500}],
  [[{price:10000,qty:1}],{disval:10000,pct:0}],
  [[{price:19000,qty:1,pct:500}],{pct:1500}],
  [[{price:99900,qty:2,disval:1800},{price:50000,qty:2,pct:2000}],{disval:2000}],
 ];
 for(const [lines,header] of rows)compare(lines,header);
});
test('line discount is used before header percent exactly as Cashier',()=>{
 const q=compare([{price:10000,qty:2,pct:1000}],{pct:1000});
 assert.equal(q.subtotalMinor,20000);
 assert.equal(q.lineDiscountTotalMinor,2000);
 assert.equal(q.linesNetTotalMinor,18000);
 assert.equal(q.headerDiscountMinor,1800);
 assert.equal(q.grandTotalMinor,16200);
});
test('strict DRVO authorization boundary refuses malformed or unsupported legacy money inputs',()=>{
 for(const lines of [
  [],Array.from({length:21},()=>({unitPriceMinor:100,quantity:1})),
  [{unitPriceMinor:-1,quantity:1}],
  [{unitPriceMinor:1.5,quantity:1}],
  [{unitPriceMinor:9000000000001,quantity:1}],
  [{unitPriceMinor:1,quantity:0}],
  [{unitPriceMinor:1,quantity:1.5}],
  [{unitPriceMinor:100,quantity:1,lineDiscountPercentBps:10001}],
  [{unitPriceMinor:100,quantity:1,lineDiscountPercentBps:-1}],
  [{unitPriceMinor:100,quantity:1,lineDiscountMinor:Infinity}],
  [{unitPriceMinor:9000000000000,quantity:2}],
 ])assert.throws(()=>drvo.computeCashierInvoiceQuote(lines),/POS/);
 assert.throws(()=>drvo.computeCashierInvoiceQuote([
  {unitPriceMinor:20000,quantity:1},
 ],{headerDiscountPercentBps:10001}),/basis points/);
});
test('discounted line precision in minor units stays bounded and cannot produce a negative due',()=>{
 const total=drvo.computeCashierInvoiceQuote([
  {unitPriceMinor:100,quantity:1,lineDiscountMinor:200},
 ],{headerDiscountMinor:500});
 assert.equal(total.lines[0].discountMinor,100);
 assert.equal(total.lines[0].netMinor,0);
 assert.equal(total.headerDiscountMinor,0);
 assert.equal(total.grandTotalMinor,0);
});

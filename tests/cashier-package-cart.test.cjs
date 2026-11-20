'use strict';
/**
 * Source-characterized Cashier package cart semantics vs DRVO shared helper.
 * Pin: casher@046bf19 groomPackageCart.ts + groomOptionalAddons.ts
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
const ts=require('typescript');
const vm=require('node:vm');
const pos=require('../dist/packages/business-modules/pos/src/package-cart');

function pinnedSource(file,gitBlob){
 const s=readFileSync(resolve(__dirname,'fixtures/cashier',file),'utf8');
 assert.equal(
  createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'),
  gitBlob,
 );
 const exports={};
 const code=ts.transpileModule(s,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
 }).outputText;
 vm.runInNewContext(code,{exports,module:{exports},require:()=>({})},{timeout:1000});
 return exports;
}

const cashierCart=pinnedSource(
 'groomPackageCart.ts','e94d57421458ac07dd184389d520c42a5c24e993');
const cashierOpt=pinnedSource(
 'groomOptionalAddons.ts','468ef6cab2c1960a6109775d4c389d4a5582bfd6');

const barber={EmpID:7,EmpName:'Test Barber'};
const guid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');

function cashierOctober(){
 return {
  packageId:7,
  nameEn:'October Package',
  nameAr:'باكدج أكتوبر',
  packagePrice:333,
  packageDurationMinutes:85,
  totalDurationMinutes:85,
  requiredServiceIds:[9,10,22,29],
  addonProIds:[],
  services:[9,10,22,29].map((id,idx)=>({
   serviceId:id,nameEn:`Svc ${id}`,nameAr:`خدمة ${id}`,
   price:idx===0?333:0,durationMinutes:10,
  })),
 };
}

function drvoOctober(){
 const ids=[9,10,22,29].map(guid);
 return {
  packageId:guid(7),
  packageName:'باكدج أكتوبر',
  packagePriceMinor:33300,
  packageDurationMinutes:85,
  totalDurationMinutes:85,
  requiredOfferingIds:ids,
  addonOfferingIds:[],
  services:ids.map((id,idx)=>({
   offeringId:id,displayName:`خدمة ${[9,10,22,29][idx]}`,
   priceMinor:idx===0?33300:0,durationMinutes:10,
  })),
 };
}

test('pinned Cashier October package: commercial price on anchor only',()=>{
 const items=cashierCart.buildPackageCartItems({
  resolved:cashierOctober(),barber,counter:1,groupKey:'g1',
 });
 assert.equal(items.length,4);
 assert.equal(JSON.stringify(items.map(i=>Number(i.SPrice))),JSON.stringify([333,0,0,0]));
 assert.equal(items.filter(i=>i.packageMeta.role==='anchor').length,1);
 assert.equal(items.filter(i=>i.packageMeta.role==='included').length,3);
 const rows=cashierCart.groupCartForDisplay(items);
 assert.equal(rows.length,1);
 assert.equal(rows[0].kind,'package');
 assert.equal(rows[0].price,333);
 assert.equal(rows[0].includedCount,4);
});

test('DRVO package-cart matches Cashier October roles and commercial total',()=>{
 const items=pos.buildPackageCartItems({
  resolved:drvoOctober(),counter:1,groupKey:'g1',
 });
 assert.equal(items.length,4);
 assert.deepEqual(items.map(i=>i.unitPriceMinor),[33300,0,0,0]);
 assert.equal(items.filter(i=>i.packageMeta.role==='anchor').length,1);
 assert.equal(items.filter(i=>i.packageMeta.role==='included').length,3);
 assert.equal(items.reduce((s,i)=>s+i.unitPriceMinor,0),33300);
 const rows=pos.groupCartForDisplay(items);
 assert.equal(rows.length,1);
 assert.equal(rows[0].kind,'package');
 assert.equal(rows[0].priceMinor,33300);
 assert.equal(rows[0].includedCount,4);
});

test('Cashier + DRVO detect overlapping standalone required services',()=>{
 const cashierOverlap=cashierCart.findOverlappingRequiredCartItems(
  [{id:'1',ProID:1049,packageMeta:undefined}],
  [1049,10],
 );
 assert.equal(cashierOverlap.length,1);
 const drvoOverlap=pos.findOverlappingRequiredCartItems(
  [{offeringId:guid(1049)}],
  [guid(1049),guid(10)],
 );
 assert.equal(drvoOverlap.length,1);
});

test('Cashier + DRVO reuse standalone optionals as package addons',()=>{
 assert.equal(
  JSON.stringify(cashierCart.findReusableAddonProIds([{ProID:1083}],[1083,1084])),
  JSON.stringify([1083]),
 );
 assert.equal(
  JSON.stringify(pos.findReusableAddonOfferingIds([{offeringId:guid(1083)}],[guid(1083),guid(1084)])),
  JSON.stringify([guid(1083)]),
 );
});

test('home-visit exclusivity matches Cashier optional-group rules',()=>{
 assert.equal(
  cashierOpt.hasConflictingHomeVisitProIds([1,2],[1,2,3]),
  true,
 );
 assert.equal(
  cashierOpt.hasConflictingHomeVisitProIds([1],[1,2,3]),
  false,
 );
 assert.equal(
  pos.hasConflictingHomeVisitIds([guid(1),guid(2)],[guid(1),guid(2),guid(3)]),
  true,
 );
 assert.equal(
  cashierOpt.resolveGroomOptionalGroup({proId:99,catName:'Groom Home Visit'}),
  'home_visit',
 );
 assert.equal(
  pos.resolveOptionalGroupByCategoryName('Groom Home Visit'),
  'home_visit',
 );
 assert.equal(
  pos.resolveOptionalGroupByCategoryName('Groom Add-ons'),
  'groom_addons',
 );
 assert.equal(cashierOpt.GROOM_OPTIONAL_GROUP_META.home_visit.mutuallyExclusive,true);
 assert.equal(pos.GROOM_OPTIONAL_GROUP_META.home_visit.mutuallyExclusive,true);
});

test('resolvePackageCommercial: anchor gets package price; home visit exclusive',()=>{
 const cut=guid(1),beard=guid(2),addon=guid(3),homeA=guid(4),homeB=guid(5);
 const catAddons=guid(10),catHome=guid(11);
 const pkg={
  packageId:guid(9),kind:'GROOM',displayName:'سيجنتشر',priceMinor:150000,
  durationMinutes:110,isActive:true,
  items:[
   {offeringId:cut,sortOrder:0,isRequired:true},
   {offeringId:beard,sortOrder:1,isRequired:true},
   {offeringId:addon,sortOrder:2,isRequired:false},
   {offeringId:homeA,sortOrder:3,isRequired:false},
   {offeringId:homeB,sortOrder:4,isRequired:false},
  ],
 };
 const offerings=[
  {offeringId:cut,categoryId:null,kind:'SERVICE',displayName:'Cut',
   priceMinor:25000,durationMinutes:30,isActive:true},
  {offeringId:beard,categoryId:null,kind:'SERVICE',displayName:'Beard',
   priceMinor:10000,durationMinutes:20,isActive:true},
  {offeringId:addon,categoryId:catAddons,kind:'SERVICE',displayName:'Color',
   priceMinor:15000,durationMinutes:0,isActive:true},
  {offeringId:homeA,categoryId:catHome,kind:'SERVICE',displayName:'Home A',
   priceMinor:50000,durationMinutes:90,isActive:true},
  {offeringId:homeB,categoryId:catHome,kind:'SERVICE',displayName:'Home B',
   priceMinor:70000,durationMinutes:120,isActive:true},
 ];
 const categoriesById={
  [catAddons]:'Groom Add-ons',
  [catHome]:'Groom Home Visit',
 };
 const ok=pos.resolvePackageCommercial({
  pkg,offerings,categoriesById,addonOfferingIds:[addon,homeA],
 });
 assert.deepEqual(ok.resolved.services.map(s=>s.priceMinor),[150000,0,15000,50000]);
 assert.equal(ok.resolved.services.reduce((s,l)=>s+l.priceMinor,0),215000);
 assert.ok(ok.optionalGroups.some(g=>g.key==='home_visit'&&g.mutuallyExclusive));
 assert.throws(
  ()=>pos.resolvePackageCommercial({
   pkg,offerings,categoriesById,addonOfferingIds:[homeA,homeB],
  }),
  (err)=>err&&err.code==='HOME_VISIT_EXCLUSIVE',
 );
 const lines=pos.buildPackageCartItems({
  resolved:ok.resolved,optionalGroupByOfferingId:ok.optionalGroupByOfferingId,groupKey:'g',
 });
 assert.equal(lines.filter(l=>l.packageMeta.role==='addon').length,2);
 assert.equal(
  lines.find(l=>l.offeringId===homeA).packageMeta.optionalGroup,
  'home_visit',
 );
});

test('hydratePackageMetaFromSnapshots rebuilds group meta; standalone stays null',()=>{
 const pkg=guid(50),a=guid(51),b=guid(52),c=guid(53);
 const hydrated=pos.hydratePackageMetaFromSnapshots([
  {offeringId:a,displayName:'Pack',packageId:pkg,packageGroupKey:'g1',
   packageRole:'anchor',commercialPackagePriceMinor:150000},
  {offeringId:b,displayName:'Include',packageId:pkg,packageGroupKey:'g1',
   packageRole:'included',commercialPackagePriceMinor:150000},
  {offeringId:c,displayName:'Solo'},
 ]);
 assert.equal(hydrated[0].packageMeta.role,'anchor');
 assert.equal(hydrated[0].packageMeta.packageName,'Pack');
 assert.equal(hydrated[0].packageMeta.includedCount,2);
 assert.equal(hydrated[1].packageMeta.role,'included');
 assert.equal(hydrated[2].packageMeta,undefined);
});

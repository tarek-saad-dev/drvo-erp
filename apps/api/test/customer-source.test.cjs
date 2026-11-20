"use strict";
/**
 * Characterization of Cashier pinned `src/lib/__tests__/customerSource.test.ts`
 * (pin 046bf19b0d5833a07fe4b2891cbf3032d03b7cef) against the DRVO adaptation.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const {
 CUSTOMER_SOURCE_OPTIONS,CUSTOMER_SOURCE_VALUES,isKnownCustomerSource,
 getCustomerSourceLabel,formatCustomerSourceDisplay,isCustomerSourceMissing,
 isCustomerProfileIncomplete,validateCustomerSource,
}=require("../dist/customers/customer-source");

test("nine stable English values with Arabic labels (Cashier option list)",()=>{
 assert.equal(CUSTOMER_SOURCE_OPTIONS.length,9);
 assert.deepEqual([...CUSTOMER_SOURCE_VALUES],[
  "existing_loyal","walk_by","word_of_mouth","instagram","facebook","tiktok",
  "google_maps","ai","referral_code"]);
 for(const option of CUSTOMER_SOURCE_OPTIONS)assert.ok(option.label.length>0);
});
test("isKnownCustomerSource accepts codes only",()=>{
 for(const ok of ["facebook","tiktok","ai"])assert.equal(isKnownCustomerSource(ok),true);
 for(const bad of ["",null,undefined,"عميل قديم","unknown_legacy"])
  assert.equal(isKnownCustomerSource(bad),false);
});
test("labels: Arabic for known, legacy prefix for unknown",()=>{
 assert.equal(getCustomerSourceLabel("walk_by"),"شاف المحل وهو معدّي");
 assert.equal(getCustomerSourceLabel("referral_code"),"كود إحالة");
 assert.equal(getCustomerSourceLabel("old_source"),"مصدر قديم: old_source");
 assert.equal(getCustomerSourceLabel(null),"");
});
test("formatCustomerSourceDisplay mirrors Cashier",()=>{
 assert.equal(formatCustomerSourceDisplay("word_of_mouth","أحمد محمد",null),
  "حد قاله عنّا — أحمد محمد");
 assert.equal(formatCustomerSourceDisplay("referral_code",null,"CUT123"),
  "كود إحالة — CUT123");
 assert.equal(formatCustomerSourceDisplay("instagram",null,null),"إنستجرام");
 assert.equal(formatCustomerSourceDisplay(null,null,null),"");
});
test("missing source and incomplete profile detection",()=>{
 for(const v of [null,"","   "])assert.equal(isCustomerSourceMissing(v),true);
 assert.equal(isCustomerSourceMissing("google_maps"),false);
 assert.equal(isCustomerSourceMissing("legacy_value"),false);
 const full={birthDate:"1990-01-01",address:"Cairo",cameFrom:"instagram"};
 assert.equal(isCustomerProfileIncomplete(full),false);
 assert.equal(isCustomerProfileIncomplete({...full,cameFrom:null}),true);
 assert.equal(isCustomerProfileIncomplete({...full,cameFrom:"   "}),true);
 assert.equal(isCustomerProfileIncomplete({...full,birthDate:null}),true);
 assert.equal(isCustomerProfileIncomplete({...full,address:null}),true);
 assert.equal(isCustomerProfileIncomplete({...full,cameFrom:"legacy"}),false);
 assert.equal(isCustomerProfileIncomplete(null),true);
});
test("validateCustomerSource detail rules and normalisation",()=>{
 let r=validateCustomerSource("facebook","old detail","old code");
 assert.deepEqual(r.errors,{});
 assert.equal(r.cameFrom,"facebook");assert.equal(r.cameFromDetails,null);
 assert.equal(r.referralCode,null);
 r=validateCustomerSource("word_of_mouth","",null);
 assert.ok(r.errors.cameFromDetails);assert.equal(r.cameFromDetails,null);
 r=validateCustomerSource("word_of_mouth","  أحمد محمد  ",null);
 assert.deepEqual(r.errors,{});assert.equal(r.cameFromDetails,"أحمد محمد");
 r=validateCustomerSource("referral_code",null,"  ");
 assert.ok(r.errors.referralCode);assert.equal(r.referralCode,null);
 r=validateCustomerSource("referral_code",null,"  CUT123  ");
 assert.deepEqual(r.errors,{});assert.equal(r.referralCode,"CUT123");
 assert.equal(r.cameFromDetails,null);
 const first=validateCustomerSource("word_of_mouth","أحمد",null);
 const second=validateCustomerSource("instagram",first.cameFromDetails,first.referralCode);
 assert.deepEqual(second.errors,{});assert.equal(second.cameFromDetails,null);
 const third=validateCustomerSource("referral_code",null,"CUT123");
 const fourth=validateCustomerSource("facebook",third.cameFromDetails,third.referralCode);
 assert.equal(fourth.referralCode,null);
 assert.ok(validateCustomerSource("legacy",null,null).errors.cameFrom);
 assert.ok(validateCustomerSource(null,null,null).errors.cameFrom);
 r=validateCustomerSource("existing_loyal","  ","  ");
 assert.deepEqual(r.errors,{});assert.equal(r.cameFrom,"existing_loyal");
 assert.equal(r.cameFromDetails,null);assert.equal(r.referralCode,null);
});

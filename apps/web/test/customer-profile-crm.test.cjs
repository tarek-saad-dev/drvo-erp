'use strict';
/**
 * CU-02/CU-03/CU-06 (partial): private POS CRM profile + explicit WhatsApp-offers consent.
 * Source-level characterization of the UI contract and web/API parity of the Cashier
 * customerSource rules (pin 046bf19b0d5833a07fe4b2891cbf3032d03b7cef).
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const scope=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]');
const read=p=>fs.readFileSync(path.join(scope,p),'utf8');

test('web customer-source mirror equals the API contract (options, validation, display)',async()=>{
 const web=await import(pathToFileURL(path.join(scope,'customers/customer-source.mjs')).href);
 let api;
 try{api=require('../../api/dist/customers/customer-source');}
 catch{return;} // API not built in this job; API tests cover its own contract.
 assert.deepEqual(web.CUSTOMER_SOURCE_OPTIONS,[...api.CUSTOMER_SOURCE_OPTIONS]);
 const cases=[
  ['facebook','old','old'],['word_of_mouth','',null],['word_of_mouth','  أحمد  ',null],
  ['referral_code',null,'  '],['referral_code',null,' CUT123 '],['legacy',null,null],
  [null,null,null],['existing_loyal','  ','  '],
 ];
 for(const c of cases)assert.deepEqual(web.validateCustomerSource(...c),api.validateCustomerSource(...c),JSON.stringify(c));
 for(const c of [['word_of_mouth','x',null],['referral_code',null,'R'],['ai',null,null],[null,null,null],['old',null,null]])
  assert.equal(web.formatCustomerSourceDisplay(...c),api.formatCustomerSourceDisplay(...c));
 for(const p of [null,{},{birthDate:'1990-01-01',address:'a',cameFrom:'ai'},{birthDate:'1990-01-01',address:'a'}])
  assert.equal(web.isCustomerProfileIncomplete(p),api.isCustomerProfileIncomplete(p));
});

test('POS create form carries Cashier CRM fields and uses the profile API after create',()=>{
 const ui=read('pos-preview/pos-customer-operator.tsx');
 assert.match(ui,/CustomerProfileFields/);
 assert.match(ui,/buildProfileBody\(profileDraft/);
 assert.match(ui,/\/profile"/);
 assert.match(ui,/method:"PUT"/);
 // Phone-conflict path must NOT overwrite the existing customer's CRM profile.
 assert.match(ui,/ولم تُكتب بيانات CRM فوق بياناته/);
 assert.match(ui,/wantsProfile&&profile\.body&&created\.created/);
 // Changing the phone clears the consent confirmation (consent is bound to the phone).
 assert.match(ui,/grantConsent:false/);
 assert.match(ui,/<CustomerProfilePanel/);
});

test('profile panel: consent only via explicit action, never inferred, no messaging',()=>{
 const ui=read('pos-preview/customer-profile-panel.tsx');
 assert.match(ui,/credentials:"same-origin"/);
 assert.match(ui,/cache:"no-store"/);
 assert.match(ui,/offersConsentAction/);
 assert.match(ui,/"GRANT"/);
 assert.match(ui,/"REVOKE"/);
 assert.match(ui,/disabled=\{!phone\}/);
 assert.match(ui,/وجود الرقم لوحده مش موافقة/);
 // Consent checkbox must start unchecked and the blank draft must not grant.
 assert.match(ui,/grantConsent:false/);
 assert.doesNotMatch(ui,/grantConsent:true/);
 assert.doesNotMatch(ui,/\/api\/messaging|whatsapp\.send|wa\.me|localStorage|sessionStorage|\/demo\/salon/i);
 assert.match(ui,/isCustomerProfileIncomplete/);
 assert.match(ui,/data-customer-incomplete/);
});

test('profile body builder follows Cashier source rules (executed, not just grepped)',async()=>{
 const ts=require('typescript');
 const src=read('pos-preview/customer-profile-panel.tsx');
 const start=src.indexOf('export function profileDraftHasContent');
 const end=src.indexOf('/** Controlled field set');
 assert.ok(start>0&&end>start);
 const web=await import(pathToFileURL(path.join(scope,'customers/customer-source.mjs')).href);
 const js=ts.transpileModule(src.slice(start,end),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText;
 const sandbox={validateCustomerSource:web.validateCustomerSource,exports:{}};
 new Function('exports','validateCustomerSource',js+'\nexports.b=buildProfileBody;exports.h=profileDraftHasContent;')(
  sandbox.exports,sandbox.validateCustomerSource);
 const {b,h}=sandbox.exports;
 const blank={birthDate:'',address:'',notes:'',cameFrom:'',cameFromDetails:'',referralCode:'',grantConsent:false};
 assert.equal(h(blank),false);
 assert.equal(h({...blank,grantConsent:true}),true);
 let r=b(blank);
 assert.deepEqual(r.errors,{});
 assert.equal(r.body.cameFrom,null);assert.equal('offersConsentAction' in r.body,false);
 r=b({...blank,cameFrom:'word_of_mouth'});
 assert.ok(r.errors.cameFromDetails);assert.equal(r.body,null);
 r=b({...blank,cameFrom:'referral_code',referralCode:' CUT1 ',cameFromDetails:'stale'});
 assert.equal(r.body.referralCode,'CUT1');assert.equal(r.body.cameFromDetails,null);
 r=b({...blank,cameFrom:'instagram',cameFromDetails:'x',referralCode:'y'});
 assert.equal(r.body.cameFromDetails,null);assert.equal(r.body.referralCode,null);
 r=b({...blank,cameFromDetails:'orphan'});
 assert.ok(r.errors.cameFrom);
 r=b({...blank,address:'  Cairo ',birthDate:'1990-01-01'},'GRANT');
 assert.equal(r.body.address,'Cairo');assert.equal(r.body.offersConsentAction,'GRANT');
});

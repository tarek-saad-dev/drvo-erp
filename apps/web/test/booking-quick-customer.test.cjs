'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const base=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function helpers(){
 return import(pathToFileURL(path.join(base,'booking-quick-customer.mjs')).href);
}

test('new customer validates name and normalizes Egyptian phone before Core POST',async()=>{
 const {prepareQuickCustomer:prepare}=await helpers();
 assert.deepEqual(prepare('  أحمد علي  ','٠١٠١٢٣٤٥٦٧٨'),{
  displayName:'أحمد علي',phoneE164:'+201012345678',
 });
 assert.deepEqual(prepare('Fatma','+201012345678'),{
  displayName:'Fatma',phoneE164:'+201012345678',
 });
 for(const [name,phone] of [['','01012345678'],['A','0'],['x'.repeat(161),'01012345678'],
  ['Ali\nInjected','01012345678'],[null,'01012345678'],['Ali',null]]){
  assert.equal(prepare(name,phone),null);
 }
});

test('response parse rejects unknown, forged or malformed idempotency/duplicate IDs',async()=>{
 const {createdCustomerId,conflictCustomerId}=await helpers();
 assert.equal(createdCustomerId({id:ID,created:true}),ID);
 assert.equal(createdCustomerId({id:ID,created:false}),ID);
 assert.equal(createdCustomerId({id:ID}),null);
 assert.equal(createdCustomerId({id:'not-a-uuid',created:true}),null);
 assert.equal(conflictCustomerId({message:{code:'CUSTOMER_PHONE_EXISTS',existingCustomerId:ID}}),ID);
 assert.equal(conflictCustomerId({code:'CUSTOMER_PHONE_EXISTS',existingCustomerId:ID}),ID);
 assert.equal(conflictCustomerId({code:'ANY_ERROR',existingCustomerId:ID}),null);
 assert.equal(conflictCustomerId({code:'CUSTOMER_PHONE_EXISTS',existingCustomerId:'../unsafe'}),null);
});

test('duplicate conflict is accepted only after fresh Business-scoped search verifies phone, ID and active row',async()=>{
 const {matchingBusinessCustomer:match}=await helpers();
 const row={customerId:ID,displayName:'أحمد',phoneE164:'+201012345678',isActive:true};
 const search={searchScope:'BUSINESS',customers:[row]};
 assert.deepEqual(match(search,ID,row.phoneE164),row);
 assert.equal(match({...search,searchScope:'TENANT'},ID,row.phoneE164),null);
 assert.equal(match(search,OTHER,row.phoneE164),null);
 assert.equal(match(search,ID,'+201122233344'),null);
 assert.equal(match({...search,customers:[{...row,isActive:false}]},ID,row.phoneE164),null);
 assert.equal(match({...search,customers:Array(21).fill(row)},ID,row.phoneE164),null);
 assert.equal(match(null,ID,row.phoneE164),null);
});

test('Booking wires protected Customers create into same booking form without extra authentication or financial writes',()=>{
 const ui=fs.readFileSync(path.join(base,'booking-quick-customer.tsx'),'utf8');
 const parent=fs.readFileSync(path.join(base,'booking-client.tsx'),'utf8');
 assert.match(parent,/import BookingQuickCustomer from ".\/booking-quick-customer"/);
 assert.match(parent,/<BookingQuickCustomer apiRoot=\{scope\} disabled=\{busy\|\|!customersReady\}/);
 assert.match(parent,/setCustomerId\(c.customerId\);setSelectedCustomer\(c\)/);
 assert.match(parent,/bookingRequest.current=null/);
 assert.match(ui,/method:"POST"/);
 assert.match(ui,/credentials:"same-origin",cache:"no-store"/);
 assert.match(ui,/headers:\{"Content-Type":"application\/json","Idempotency-Key":retry.current\}/);
 assert.match(ui,/const existing=await selectExisting\(duplicate,input.phoneE164\)/);
 assert.match(ui,/const existing=await selectExisting\(id,input.phoneE164\)/);
 assert.match(ui,/matchingBusinessCustomer\(result,customerId,phoneE164\)/);
 assert.match(ui,/data-booking-quick-customer="customers-core"/);
 assert.match(ui,/type="button"/);
 assert.doesNotMatch(ui,/<form|localStorage|sessionStorage|mssql|\/demo\/salon|\/sales\/posted|CREATE TABLE/);
});

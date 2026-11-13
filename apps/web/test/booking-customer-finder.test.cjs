'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const base=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const rows=[
 {customerId:'a',displayName:'أحمد سعيد',phoneE164:'+201012345678',isActive:true},
 {customerId:'b',displayName:'فاطمة إبراهيم',phoneE164:null,isActive:true},
 {customerId:'c',displayName:'سارة',phoneE164:'+201122233344',isActive:true},
];
test('Arabic variants and Arabic-Indic phone digits find only the given scoped rows',async()=>{
 const {findAuthorizedCustomers:find,normalizeCustomerTerm:n}=await import(pathToFileURL(path.join(base,'customer-finder.mjs')).href);
 assert.equal(n('  إِحْمَد  '),'احمد');
 assert.equal(n('فَاطِمَة'),'فاطمه');
 assert.equal(n('٠١٠'),'010');
 assert.deepEqual(find(rows,'احمد').map(x=>x.customerId),['a']);
 assert.deepEqual(find(rows,'ابراهيم').map(x=>x.customerId),['b']);
 assert.deepEqual(find(rows,'١٠١٢').map(x=>x.customerId),['a']);
 assert.deepEqual(find(rows,'Sara'),[],'do not invent transliteration');
 assert.deepEqual(find(rows,'not-a-customer'),[]);
 assert.deepEqual(find(rows,'  ').map(x=>x.customerId),['a','b','c']);
 assert.deepEqual(find(rows,'2').map(x=>x.customerId),[],'short phone fragments do not identify');
 assert.equal(find(rows,'احمد')[0],rows[0],'no detached globally sourced rows');
 assert.deepEqual(find(null,'احمد'),[]);
});
test('private Booking search never fetches unauthorized records or submits stale selected customer',()=>{
 const booking=fs.readFileSync(path.join(base,'booking-client.tsx'),'utf8');
 const helper=fs.readFileSync(path.join(base,'customer-finder.mjs'),'utf8');
 assert.doesNotMatch(helper,/fetch\s*\(|localStorage|sessionStorage|mssql|\/api\//);
 assert.match(booking,/findAuthorizedCustomers\(customers,customerQuery\)/);
 assert.match(booking,/setCustomerId\(""\);bookingRequest\.current=null;/);
 assert.match(booking,/filteredCustomers\.map\(c=>/);
 assert.match(booking,/customers\.length\s*===\s*0|!customers\.length/);
 assert.match(booking,/أول 200 عميل/);
 assert.match(booking,/if\(!GUID\.test\(customerId\)/);
 assert.match(booking,/fetch\(scope\+"\/customers"/);
 assert.doesNotMatch(booking,/\/sales\/posted|localStorage|sessionStorage/);
});

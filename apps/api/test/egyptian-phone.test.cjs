'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
 canonicalizeEgyptPhoneE164,phoneSearchDigits,digitsOnly,
}=require('../dist/customers/egyptian-phone');

test('Egyptian local and intl mobiles canonicalize to E.164',()=>{
 assert.equal(canonicalizeEgyptPhoneE164('01012345678'),'+201012345678');
 assert.equal(canonicalizeEgyptPhoneE164('+201012345678'),'+201012345678');
 assert.equal(canonicalizeEgyptPhoneE164('00201012345678'),'+201012345678');
 assert.equal(canonicalizeEgyptPhoneE164('٢٠١٠١٢٣٤٥٦٧٨'),'+201012345678');
 assert.equal(canonicalizeEgyptPhoneE164('010'),null);
 assert.equal(canonicalizeEgyptPhoneE164(''),null);
});

test('phone search digits accept partial numeric needles',()=>{
 assert.equal(phoneSearchDigits('01012345678'),'201012345678');
 assert.equal(phoneSearchDigits('345'),'345');
 assert.equal(phoneSearchDigits('12'),null);
 assert.equal(digitsOnly('01-012-345-678'),'01012345678');
});

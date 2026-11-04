'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');

// Exercise the exact shared TypeScript parser without pulling in a browser,
// external network, verification provider or live token.
const source = fs.readFileSync(path.join(__dirname,
  '../src/app/verify-email/verification-fragment.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleShim = {exports:{}};
new Function('module','exports','URLSearchParams',js)(
  moduleShim,moduleShim.exports,URLSearchParams);
const {parseVerificationFragment} = moduleShim.exports;

test('accepts purpose-scoped strong bearer fragment in either parameter order',()=>{
  const token = 'A'.repeat(43);
  for(const purpose of ['OWNER_BOOTSTRAP','ACCOUNT_INVITE']){
    assert.deepEqual(
      parseVerificationFragment('#token='+token+'&purpose='+purpose),
      {token,purpose},
    );
    assert.deepEqual(
      parseVerificationFragment('#purpose='+purpose+'&token='+token),
      {token,purpose},
    );
  }
});

test('rejects all incomplete, extra, ambiguous or encoded fragments',()=>{
  const token='A'.repeat(43);
  for(const fragment of [
    '', '#', '?token='+token, '#token='+token,
    '#token='+token+'&purpose=ACCOUNT_RECOVERY',
    '#token='+token+'&purpose=OWNER',
    '#token=short&purpose=ACCOUNT_INVITE',
    '#token='+token+'&purpose=ACCOUNT_INVITE&extra=x',
    '#token='+token+'&token='+token+'&purpose=ACCOUNT_INVITE',
    '#token='+token+'&purpose=OWNER_BOOTSTRAP&purpose=ACCOUNT_INVITE',
    '#token='+token+'&purpose=ACCOUNT_INVITE%0A',
    '#token='+token+'&purpose=ACCOUNT_INVITE#again',
    '#token='+token+'&purpose=ACCOUNT_INVITE'+'&a'.repeat(100),
    null, 123,
  ]){
    assert.equal(parseVerificationFragment(fragment),null,String(fragment));
  }
});

test('verification page contract is gated and never puts bearer tokens in persistent storage',()=>{
  const client=fs.readFileSync(path.join(__dirname,
    '../src/app/verify-email/verify-email-client.tsx'),'utf8');
  const page=fs.readFileSync(path.join(__dirname,
    '../src/app/verify-email/page.tsx'),'utf8');
  assert.match(page,/DRVO_K5_WEB_ENABLED/);
  assert.match(page,/DRVO_K5_VERIFY_UI_ENABLED/);
  assert.match(page,/referrer: "no-referrer"/);
  assert.match(client,/history\.replaceState/);
  assert.match(client,/referrerPolicy: "no-referrer"/);
  assert.doesNotMatch(client,/localStorage|sessionStorage|console\./);
  assert.doesNotMatch(client,/setToken|useState<[^>]*token/);
});

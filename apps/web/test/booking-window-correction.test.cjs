'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../src/app/workspace/[businessId]/[branchId]/booking');
const key='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',rid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const opened={windowId:key,resourceId:rid,state:'OPEN'};
const closed={...opened,state:'CLOSED'};
test('correction cannot publish until authoritative CLOSED state is visible',async()=>{
 const {windowCorrectionStage:stage}=await import(pathToFileURL(path.join(root,'window-correction.mjs')).href);
 assert.equal(stage(null,rid,[opened]),'NO_CORRECTION');
 assert.equal(stage(key,rid,[opened]),'NEED_CLOSE');
 assert.equal(stage(key,rid,[closed]),'READY_TO_PUBLISH');
 assert.equal(stage(key,rid,[]),'STALE_OR_MISSING');
 assert.equal(stage(key,'cccccccc-cccc-4ccc-8ccc-cccccccccccc',[closed]),'STALE_OR_MISSING');
 assert.equal(stage(key,rid,[{...closed,state:'UNKNOWN'}]),'STALE_OR_MISSING');
 assert.equal(stage(key,rid,null),'STALE_OR_MISSING');
});
test('prefill local minute roundtrips ISO for any host timezone',async()=>{
 const {toLocalMinute}=await import(pathToFileURL(path.join(root,'window-correction.mjs')).href);
 assert.equal(toLocalMinute('invalid'),'');
 const actual=toLocalMinute('2030-01-02T09:15:00Z');
 assert.match(actual,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
 assert.equal(new Date(actual).toISOString(),'2030-01-02T09:15:00.000Z');
});
test('guided UI is explicit two-step and preserves server-side booking authority',()=>{
 const source=fs.readFileSync(path.join(root,'booking-client.tsx'),'utf8');
 assert.match(source,/windowCorrectionStage\(replacementWindowId,windowResourceId,windows\)/);
 assert.match(source,/function prepareWindowCorrection\(w:BookingWindow\)/);
 assert.match(source,/if\(correctionStage!=="NO_CORRECTION"&&correctionStage!=="READY_TO_PUBLISH"\)/);
 assert.match(source,/correctionStage==="NEED_CLOSE"/);
 assert.match(source,/void closeAvailability\(replacementWindowId\)/);
 assert.match(source,/if\(saved\)\{setWindowLocalStart/);
 assert.match(source,/await submit\("\/windows"/);
 assert.match(source,/Idempotency-Key":closeWindowKeys\.current\.get\(windowId\)!/);
 assert.match(source,/مينفعش تقفل الفترة دي وفيها حجز مؤكد/);
 assert.match(source,/أولًا اقفل الفترة القديمة/);
 assert.doesNotMatch(source,/\/sales\/posted|localStorage|sessionStorage/);
});

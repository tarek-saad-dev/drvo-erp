'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {manifest,migrationReadiness}=require('../ops/dev-primary/migration-readiness.cjs');
const source=manifest();
const applied=(count)=>source.slice(0,count).map(m=>({
 MigrationId:m.name,Checksum:m.checksum,
}));
test('primary read-only preflight reads exactly forward-only manifest SQL021+',()=>{
 assert.ok(source.length>=21);
 assert.ok(source.some(m=>m.name==='019_expenses_documents_draft.sql'));
 assert.ok(source.some(m=>m.name==='020_hr_attendance_sessions.sql'));
 assert.ok(source.some(m=>m.name==='021_treasury_cash_count_drafts.sql'));
 const result=migrationReadiness(applied(18),source);
 assert.equal(result.stage,'HISTORY_INSPECTED_READ_ONLY');
 assert.equal(result.pending[0],'019_expenses_documents_draft.sql');
 assert.ok(result.pending.includes('020_hr_attendance_sessions.sql'));
 assert.ok(result.pending.includes('021_treasury_cash_count_drafts.sql'));
 assert.equal(result.schemaChangeAuthorized,false);
 assert.equal(result.backupRestorableVerified,false);
 assert.equal(result.primaryDatabaseModified,false);
});
test('unknown, duplicate, missing or checksum drift rows always fail',()=>{
 for(const rows of [
  [{MigrationId:'999_unknown.sql',Checksum:'0'.repeat(64)}],
  [applied(2)[0],applied(2)[0]],
  [applied(3)[0],applied(3)[2]],
  [{...applied(1)[0],Checksum:'0'.repeat(64)}],
  [...applied(source.length),{MigrationId:'999_bad.sql',Checksum:'1'.repeat(64)}],
 ])assert.throws(()=>migrationReadiness(rows,source),Error);
});
test('valid full history still cannot approve application or restore',()=>{
 const result=migrationReadiness(applied(source.length),source);
 assert.deepEqual(result.pending,[]);
 assert.equal(result.backupRestorableVerified,false);
 assert.equal(result.schemaChangeAuthorized,false);
 assert.equal(result.primaryDatabaseModified,false);
});

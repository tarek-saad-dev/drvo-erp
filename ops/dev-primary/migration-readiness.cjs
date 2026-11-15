'use strict';
/** Read-only DRVO primary-development DB migration history planner.
 * No SQL connection, DML or authorized application step in this module.
 * Backup RESTORE evidence and explicit operator approval ALWAYS remain outside
 * this planner (ADR-039). Do not call this an apply permission.
 */
const {readFileSync,readdirSync}=require('node:fs');
const {resolve,join}=require('node:path');
const {createHash}=require('node:crypto');
function manifest(dir=resolve(__dirname,'../../db/migrations')){
 const files=readdirSync(dir).filter(name=>name.endsWith('.sql')).sort();
 if(!files.length)throw new Error('No migrations in source');
 return files.map((name,index)=>{
  const m=/^([0-9]{3})_[a-z][a-z0-9_]*\.sql$/.exec(name);
  if(!m||Number(m[1])!==index+1)throw Error('Invalid migration numbering');
  const hash=createHash('sha256').update(readFileSync(join(dir,name))).digest('hex');
  return {name,checksum:hash};
 });
}
function migrationReadiness(applied,expected=manifest()){
 if(!Array.isArray(applied))throw TypeError('Expected SQL schema migration rows');
 if(!Array.isArray(expected)||!expected.length)throw TypeError('Missing source manifest');
 if(applied.length>expected.length)throw Error('DB has unexpected migrations');
 const seen=new Set();
 for(let i=0;i<applied.length;i++){
  const row=applied[i],source=expected[i];
  if(!row||typeof row.MigrationId!=='string'||typeof row.Checksum!=='string')
   throw Error('Invalid migration history row');
  if(seen.has(row.MigrationId))throw Error('Duplicate migration row');
  seen.add(row.MigrationId);
  if(row.MigrationId!==source.name)throw Error('Unexpected/missing/out-of-order migration');
  if(row.Checksum.trim().toLowerCase()!==source.checksum)
   throw Error('Migration checksum drift: '+source.name);
 }
 return {
  stage:'HISTORY_INSPECTED_READ_ONLY',
  appliedCount:applied.length,pending:expected.slice(applied.length).map(x=>x.name),
  schemaChangeAuthorized:false,backupRestorableVerified:false,
  primaryDatabaseModified:false,
 };
}
module.exports={manifest,migrationReadiness};

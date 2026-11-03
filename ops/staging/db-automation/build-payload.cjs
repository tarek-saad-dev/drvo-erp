'use strict';
// GitHub runner: serialize only reviewed main-branch SQL migrations, never JS.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SHA=/^[a-f0-9]{40}$/;
const FILE=/^([0-9]{3})_[a-z][a-z0-9_]*\.sql$/;
const MAX_TOTAL=3*1024*1024;
function createPayload(repoRoot, sha) {
  if (!SHA.test(sha)) throw new Error('Expected full 40-character Git commit SHA');
  const dir=path.resolve(repoRoot,'db/migrations');
  const names=fs.readdirSync(dir).filter(name=>name.endsWith('.sql')).sort();
  if(!names.length || names.length>64) throw new Error('Unrecognized migration count');
  let total=0;
  const migrations=names.map((name,i)=>{
    const match=FILE.exec(name);
    if(!match || Number(match[1])!==i+1) throw new Error('Unexpected migration filename or sequence');
    const full=path.join(dir,name);
    if(!fs.lstatSync(full).isFile()) throw new Error('Migration must be a regular file');
    const buffer=fs.readFileSync(full);
    total+=buffer.length;
    if(buffer.length>200000 || total>MAX_TOTAL) throw new Error('Migration payload size limit exceeded');
    const text=buffer.toString('utf8');
    if(Buffer.from(text,'utf8').compare(buffer)!==0 || /^\s*GO\s*$/im.test(text)) {
      throw new Error('Invalid encoding or SQLCMD batch separator');
    }
    return {name,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),sql:text};
  });
  return {format:'drvo-erp-sql-v1',sha,migrations};
}
if(require.main===module){
  try{
    const payload=createPayload(path.resolve(__dirname,'../../..'),process.env.GITHUB_SHA||process.argv[2]);
    process.stdout.write(JSON.stringify(payload));
  }catch(error){
    console.error('Payload creation failed:',error.message);
    process.exitCode=1;
  }
}
module.exports={createPayload};

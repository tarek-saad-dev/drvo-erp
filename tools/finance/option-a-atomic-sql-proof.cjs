'use strict';
/**
 * F-1a: real SQL Server transactional mechanics proof against an EPHEMERAL
 * disposable database. These are PROOF tables, not Accounting/POS product
 * tables, NOT a DB migration, NOT an API and NOT a financial CoA policy.
 * Never run on a VPS or with production credentials.
 */
const assert=require('node:assert/strict');
const {randomBytes,createHash}=require('node:crypto');
const sql=require('../../apps/api/node_modules/mssql');
const DB='DRVO_ERP_FINANCE_CI_ONLY';
const PORT=14347;
const GUID=n=>String(n).padStart(8,'0')+'-0000-4000-8000-000000000001';
const password=process.env.SQL_TEST_SA_PASSWORD;
assert.equal(process.env.DRVO_FINANCE_PROOF_DISPOSABLE,'YES');
assert.equal(process.env.DRVO_FINANCE_TEST_PORT,String(PORT));
assert.ok(password&&password.length>=12);
const config=(db)=>({server:'127.0.0.1',port:PORT,database:db,
 user:'sa',password,options:{encrypt:true,trustServerCertificate:true},
 connectionTimeout:5000,requestTimeout:20000,pool:{min:0,max:16}});
const scope=(tenant,business,branch)=>({tenant:GUID(tenant),business:GUID(business),branch:GUID(branch)});
const A=scope(1,2,3),B=scope(1,4,5),OTHER=scope(6,7,8);
const draftA=GUID(101),draftB=GUID(102),draftOther=GUID(103);
const checksum=x=>createHash('sha256').update(x).digest('hex');
const hashA=checksum('proof-price-snapshot-1000');
const hashB=checksum('proof-price-snapshot-2500');
const hashOther=checksum('proof-other-tenant-1200');

function bind(req,item,extra={}){
 return req.input('t',sql.UniqueIdentifier,item.tenant)
  .input('b',sql.UniqueIdentifier,item.business)
  .input('br',sql.UniqueIdentifier,item.branch)
  .input('d',sql.UniqueIdentifier,extra.draftId??draftA)
  .input('o',sql.UniqueIdentifier,extra.operationId??GUID(201));
}
async function connect(database){
 let last;
 for(let attempt=0;attempt<40;attempt++){
  const pool=new sql.ConnectionPool(config(database));
  try{await pool.connect();return pool}
  catch(err){last=err;await pool.close().catch(()=>{});await new Promise(r=>setTimeout(r,2000))}
 }
 throw last;
}
async function schema(pool){
 await pool.query('CREATE SCHEMA proof');
 const ddl=`
 CREATE TABLE proof.Branch (
  TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  CONSTRAINT PK_ProofBranch PRIMARY KEY(TenantId,BusinessId,BranchId));
 CREATE TABLE proof.Draft (
  TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,DraftId UNIQUEIDENTIFIER NOT NULL,
  AmountMinor BIGINT NOT NULL,Currency CHAR(3) NOT NULL,
  SnapshotHash CHAR(64) NOT NULL,
  CONSTRAINT PK_ProofDraft PRIMARY KEY(TenantId,BusinessId,BranchId,DraftId),
  CONSTRAINT FK_ProofDraftBranch FOREIGN KEY(TenantId,BusinessId,BranchId)
   REFERENCES proof.Branch(TenantId,BusinessId,BranchId),
  CONSTRAINT CK_ProofDraftAmount CHECK(AmountMinor BETWEEN 1 AND 9000000000000),
  CONSTRAINT CK_ProofDraftCurrency CHECK(Currency='EGP'));
 CREATE TABLE proof.Sale (
  TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,OperationId UNIQUEIDENTIFIER NOT NULL,
  DraftId UNIQUEIDENTIFIER NOT NULL,RequestHash CHAR(64) NOT NULL,
  AmountMinor BIGINT NOT NULL,Status VARCHAR(7) NOT NULL,
  CONSTRAINT PK_ProofSale PRIMARY KEY(TenantId,BusinessId,BranchId,OperationId),
  CONSTRAINT UQ_ProofSaleDraft UNIQUE(TenantId,BusinessId,BranchId,DraftId),
  CONSTRAINT FK_ProofSaleDraft FOREIGN KEY(TenantId,BusinessId,BranchId,DraftId)
   REFERENCES proof.Draft(TenantId,BusinessId,BranchId,DraftId),
  CONSTRAINT CK_ProofSaleStatus CHECK(Status='POSTED'));
 CREATE TABLE proof.FirstJournal (
  TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,OperationId UNIQUEIDENTIFIER NOT NULL,
  DebitMinor BIGINT NOT NULL,CreditMinor BIGINT NOT NULL,
  CONSTRAINT PK_ProofJournal PRIMARY KEY(TenantId,BusinessId,BranchId,OperationId),
  CONSTRAINT FK_ProofJournalSale FOREIGN KEY(TenantId,BusinessId,BranchId,OperationId)
   REFERENCES proof.Sale(TenantId,BusinessId,BranchId,OperationId),
  CONSTRAINT CK_ProofBalanced CHECK(DebitMinor>0 AND DebitMinor=CreditMinor));
 CREATE TABLE proof.Outbox (
  TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,OperationId UNIQUEIDENTIFIER NOT NULL,
  EventKind VARCHAR(24) NOT NULL,
  CONSTRAINT PK_ProofOutbox PRIMARY KEY(TenantId,BusinessId,BranchId,OperationId),
  CONSTRAINT FK_ProofOutboxSale FOREIGN KEY(TenantId,BusinessId,BranchId,OperationId)
   REFERENCES proof.Sale(TenantId,BusinessId,BranchId,OperationId),
  CONSTRAINT CK_ProofEvent CHECK(EventKind='FIRST_JOURNAL_COMMITTED'));
 `;
 await pool.batch(ddl);
 for(const branch of [A,B,OTHER]){
  await pool.request().input('t',sql.UniqueIdentifier,branch.tenant)
   .input('b',sql.UniqueIdentifier,branch.business)
   .input('br',sql.UniqueIdentifier,branch.branch)
   .query('INSERT proof.Branch VALUES(@t,@b,@br)');
 }
 for(const [br,d,amount,hash] of [[A,draftA,1000,hashA],[B,draftB,2500,hashB],
   [OTHER,draftOther,1200,hashOther]]){
  await pool.request().input('t',sql.UniqueIdentifier,br.tenant)
   .input('b',sql.UniqueIdentifier,br.business)
   .input('br',sql.UniqueIdentifier,br.branch)
   .input('d',sql.UniqueIdentifier,d)
   .input('amount',sql.BigInt,amount).input('hash',sql.Char(64),hash)
   .query(`INSERT proof.Draft(TenantId,BusinessId,BranchId,DraftId,AmountMinor,Currency,SnapshotHash)
    VALUES(@t,@b,@br,@d,@amount,'EGP',@hash)`);
 }
}

async function atomicProofPost(pool,{trustedScope,draftId,operationId,requestHash,fault}){
 if(!/^[a-f0-9]{64}$/.test(requestHash)||!['NONE','AFTER_SALE','AFTER_JOURNAL'].includes(fault))
  throw new TypeError('Invalid synthetic operation');
 const tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
 try{
  const key='drvo-finance-ci:'+trustedScope.tenant+':'+trustedScope.business+':'+operationId;
  const lock=await tx.request().input('resource',sql.NVarChar(255),key).query(`
   DECLARE @status INT; EXEC @status=sys.sp_getapplock
   @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',
   @LockTimeout=10000; SELECT @status AS status;`);
  if(Number(lock.recordset[0].status)<0)throw new Error('PROOF_LOCK_UNAVAILABLE');
  const req=()=>bind(tx.request(),trustedScope,{draftId,operationId});
  const existing=await req().query(`SELECT RequestHash,DraftId,AmountMinor FROM proof.Sale WITH(UPDLOCK,HOLDLOCK)
    WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND OperationId=@o`);
  if(existing.recordset.length){
   const old=existing.recordset[0];
   if(old.RequestHash.trim()!==requestHash||String(old.DraftId).toLowerCase()!==draftId.toLowerCase())
    throw new Error('OPERATION_PAYLOAD_CONFLICT');
   const proof=await req().query(`SELECT
    (SELECT COUNT(*) FROM proof.FirstJournal WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND OperationId=@o) AS journals,
    (SELECT COUNT(*) FROM proof.Outbox WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND OperationId=@o) AS events`);
   if(proof.recordset[0].journals!==1||proof.recordset[0].events!==1)
    throw new Error('INCOMPLETE_TRANSACTION_EVIDENCE');
   await tx.commit();return {result:'REPLAYED',operationId};
  }
  const draft=await req().query(`SELECT AmountMinor,SnapshotHash FROM proof.Draft WITH(HOLDLOCK)
   WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND DraftId=@d`);
  if(draft.recordset.length!==1)throw new Error('SCOPE_OR_DRAFT_DENIED');
  const amount=Number(draft.recordset[0].AmountMinor);
  if(draft.recordset[0].SnapshotHash.trim()!==requestHash)throw new Error('STALE_SOURCE_SNAPSHOT');
  await req().input('hash',sql.Char(64),requestHash).input('amount',sql.BigInt,amount)
   .query(`INSERT proof.Sale(TenantId,BusinessId,BranchId,OperationId,DraftId,RequestHash,AmountMinor,Status)
     VALUES(@t,@b,@br,@o,@d,@hash,@amount,'POSTED')`);
  if(fault==='AFTER_SALE')throw new Error('INJECTED_SOURCE_FAILURE');
  // Demo balanced amounts only: no Chart of Accounts, tax, tender/AR or legal journal.
  await req().input('amount',sql.BigInt,amount)
   .query(`INSERT proof.FirstJournal(TenantId,BusinessId,BranchId,OperationId,DebitMinor,CreditMinor)
     VALUES(@t,@b,@br,@o,@amount,@amount)`);
  if(fault==='AFTER_JOURNAL')throw new Error('INJECTED_JOURNAL_FAILURE');
  await req().query(`INSERT proof.Outbox(TenantId,BusinessId,BranchId,OperationId,EventKind)
    VALUES(@t,@b,@br,@o,'FIRST_JOURNAL_COMMITTED')`);
  await tx.commit();return {result:'PROOF_ATOMIC_COMMIT',operationId};
 }catch(e){await tx.rollback().catch(()=>{});throw e}
}
async function getCounts(pool,where={}){
 const r=await pool.query(`SELECT
   (SELECT COUNT(*) FROM proof.Sale) AS sales,
   (SELECT COUNT(*) FROM proof.FirstJournal) AS journals,
   (SELECT COUNT(*) FROM proof.Outbox) AS outbox`);
 return r.recordset[0];
}
async function test(){
 let master,pool;
 try{
  master=await connect('master');
  assert.equal((await master.query(`SELECT DB_ID(N'${DB}') AS id`)).recordset[0].id,null);
  await master.query(`CREATE DATABASE [${DB}]`);
  pool=await connect(DB);
  await schema(pool);
  const item=(trustedScope,draftId,operationId,requestHash,fault='NONE')=>
   ({trustedScope,draftId,operationId,requestHash,fault});
  const assertCounts=(counts,sales)=>assert.deepEqual(
    Object.values(counts).map(Number),[sales,sales,sales]);
  await assert.rejects(
   ()=>atomicProofPost(pool,item(A,draftA,GUID(202),hashA,'AFTER_SALE')),
   /INJECTED_SOURCE_FAILURE/);
  assertCounts(await getCounts(pool),0);
  console.log('PASS: injected source failure rolls back Sale + GL + Outbox');
  await assert.rejects(
   ()=>atomicProofPost(pool,item(A,draftA,GUID(203),hashA,'AFTER_JOURNAL')),
   /INJECTED_JOURNAL_FAILURE/);
  assertCounts(await getCounts(pool),0);
  console.log('PASS: injected journal failure rolls back all three effects');
  await assert.rejects(
   ()=>atomicProofPost(pool,item(B,draftA,GUID(204),hashA)),
   /SCOPE_OR_DRAFT_DENIED/);
  await assert.rejects(
   ()=>atomicProofPost(pool,item(OTHER,draftA,GUID(204),hashA)),
   /SCOPE_OR_DRAFT_DENIED/);
  assertCounts(await getCounts(pool),0);
  console.log('PASS: wrong Business and foreign Tenant cannot reference source draft');
  const op=GUID(205);
  const ready=await atomicProofPost(pool,item(A,draftA,op,hashA));
  assert.equal(ready.result,'PROOF_ATOMIC_COMMIT');
  assert.equal((await atomicProofPost(pool,item(A,draftA,op,hashA))).result,'REPLAYED');
  assertCounts(await getCounts(pool),1);
  await assert.rejects(
   ()=>atomicProofPost(pool,item(A,draftA,op,hashB)),
   /OPERATION_PAYLOAD_CONFLICT/);
  await assert.rejects(
   ()=>atomicProofPost(pool,item(A,draftA,GUID(206),hashB)),
   /STALE_SOURCE_SNAPSHOT/);
  assertCounts(await getCounts(pool),1);
  console.log('PASS: exact idempotent replay, mismatched hash rejected');
  const concurrent=await Promise.all(Array.from({length:8},()=>atomicProofPost(
   pool,item(B,draftB,GUID(207),hashB))));
  assert.equal(concurrent.filter(x=>x.result==='PROOF_ATOMIC_COMMIT').length,1);
  assert.equal(concurrent.filter(x=>x.result==='REPLAYED').length,7);
  assertCounts(await getCounts(pool),2);
  console.log('PASS: 8 concurrent replays create one scoped Sale + GL + Outbox');
  await assert.rejects(
   ()=>atomicProofPost(pool,item(B,draftB,GUID(208),hashB)),
   /UNIQUE|duplicate|constraint/i);
  assertCounts(await getCounts(pool),2);
  const invalid=await pool.query(`SELECT COUNT(*) AS n FROM proof.FirstJournal
    WHERE DebitMinor<>CreditMinor OR DebitMinor<=0`);
  assert.equal(invalid.recordset[0].n,0);
  const foreign=await pool.query(`SELECT COUNT(*) AS n FROM proof.Sale
    WHERE TenantId='${OTHER.tenant}'`);
  assert.equal(foreign.recordset[0].n,0);
  console.log('PASS: one source draft cannot have two posted operations; GL balanced');
  console.log('FINANCE OPTION A DISPOSABLE SQL MECHANICS: PASS (NO PRODUCT POSTING)');
 }finally{
  await pool?.close().catch(()=>{});
  if(master){
   if((await master.query(`SELECT DB_ID(N'${DB}') AS id`)).recordset[0].id!==null){
    await master.query(`ALTER DATABASE [${DB}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      DROP DATABASE [${DB}]`).catch(()=>{});
   }
   await master.close().catch(()=>{});
  }
 }
}
test().catch(e=>{console.error('FINANCE ATOMIC PROOF FAILED:',e instanceof Error?e.message.slice(0,250):'unknown');process.exitCode=1});

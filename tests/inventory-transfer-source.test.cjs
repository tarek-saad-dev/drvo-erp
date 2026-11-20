'use strict';
/**
 * INV-03 Inventory branch transfers: locks the Cashier transfer source excerpts (byte-exact git
 * blobs, LF-normalised), characterizes the DRVO rules module and statically guards SQL032.
 * SQL behavior itself is proven only by the disposable SQL HTTP job (tools/inventory/verify.cjs);
 * these are static + pure-rule guards, NOT a SQL execution proof.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const rules=require('../dist/packages/business-modules/inventory/src/transfer-rules');
const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const SERVICE_BLOB='0bb552bc73708c59ef13b3020330de166e7c3a6d';
const ROUTE_BLOB='77fa2e2219c31eb510bae508d13176aec933a436';
const SQL='db/migrations/032_inventory_branch_transfers.sql';

function gitBlob(text){
 const bytes=Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b';
const P1='00000000-0000-4000-8000-000000000001',P2='00000000-0000-4000-8000-000000000002';

test('Cashier transfer excerpts are the exact pinned blobs',()=>{
 assert.equal(gitBlob(read('_cashier_source/inventory/transferInventory.service.ts')),SERVICE_BLOB);
 assert.equal(gitBlob(read('_cashier_source/inventory/transfers.route.ts')),ROUTE_BLOB);
 const files=new Map(baseline.files.map(f=>[f.path,f.blob]));
 assert.equal(files.get('src/lib/inventory/transferInventory.service.ts'),SERVICE_BLOB);
 assert.equal(files.get('src/app/api/inventory/transfers/route.ts'),ROUTE_BLOB);
 assert.equal(ledger.sourceRevision,PIN);
});

test('Cashier source declares the rules the DRVO module characterizes',()=>{
 const src=read('_cashier_source/inventory/transferInventory.service.ts');
 assert.match(src,/'SAME_BRANCH'/);
 assert.match(src,/'NO_LINES'/);
 assert.match(src,/'INVALID_QTY'/);
 assert.match(src,/quantityDelta: -line\.quantity/);
 assert.match(src,/allowNegativeOverride: false/);
 assert.match(src,/'CANCEL_NOT_ALLOWED'/);
 const route=read('_cashier_source/inventory/transfers.route.ts');
 assert.match(route,/body\.branchId != null/);
});

test('planTransferApply: same-branch, empty, invalid qty, duplicates, over-transfer rejected',()=>{
 const stock={[P1]:5000,[P2]:100};
 const bad=(from,to,lines,code)=>{
  const plan=rules.planTransferApply(from,to,lines,stock);
  assert.equal(plan.ok,false);assert.equal(plan.code,code);
 };
 bad(A,A,[{offeringId:P1,qtyMilli:1}],'SAME_BRANCH');
 bad(A,B,[],'NO_LINES');
 bad(A,B,[{offeringId:P1,qtyMilli:0}],'INVALID_QTY');
 bad(A,B,[{offeringId:P1,qtyMilli:-5}],'INVALID_QTY');
 bad(A,B,[{offeringId:P1,qtyMilli:1.5}],'INVALID_QTY');
 bad(A,B,[{offeringId:P1,qtyMilli:1},{offeringId:P1,qtyMilli:2}],'DUPLICATE_PRODUCT');
 bad(A,B,[{offeringId:P2,qtyMilli:101}],'INSUFFICIENT_SOURCE_STOCK');
 bad(A,B,[{offeringId:'00000000-0000-4000-8000-0000000000ff',qtyMilli:1}],'INSUFFICIENT_SOURCE_STOCK');
});

test('planTransferApply emits source minus / destination plus, never a post',()=>{
 const plan=rules.planTransferApply(A,B,[{offeringId:P1,qtyMilli:2500}],{[P1]:5000});
 assert.equal(plan.ok,true);
 assert.deepEqual(plan.deltas,[
  {branchId:A,offeringId:P1,deltaMilli:-2500},
  {branchId:B,offeringId:P1,deltaMilli:2500},
 ]);
 assert.equal(plan.posting,'NOT_POSTED');
 assert.equal(plan.adr031,'NOT_IN_SCOPE');
 const exact=rules.planTransferApply(A,B,[{offeringId:P1,qtyMilli:5000}],{[P1]:5000});
 assert.equal(exact.ok,true,'transferring the full on-hand is allowed');
});

test('planTransferCancel reverses exactly and blocks consumed destination stock',()=>{
 const lines=[{offeringId:P1,qtyMilli:2500}];
 const plan=rules.planTransferCancel(A,B,lines,{[P1]:2500});
 assert.equal(plan.ok,true);
 assert.deepEqual(plan.deltas,[
  {branchId:B,offeringId:P1,deltaMilli:-2500},
  {branchId:A,offeringId:P1,deltaMilli:2500},
 ]);
 const applied=rules.planTransferApply(A,B,lines,{[P1]:2500}).deltas;
 const net=new Map();
 for(const d of [...applied,...plan.deltas])
  net.set(d.branchId+d.offeringId,(net.get(d.branchId+d.offeringId)??0)+d.deltaMilli);
 for(const v of net.values())assert.equal(v,0,'apply + cancel nets to zero');
 const consumed=rules.planTransferCancel(A,B,lines,{[P1]:2499});
 assert.equal(consumed.ok,false);
 assert.equal(consumed.code,'DESTINATION_STOCK_CONSUMED');
});

test('SQL032 is ASCII, BOM-free, GO-free and numbered consecutively',()=>{
 const raw=fs.readFileSync(path.join(root,SQL));
 assert.notDeepEqual([...raw.subarray(0,3)],[0xEF,0xBB,0xBF],'no BOM');
 const sql=raw.toString('utf8');
 assert.ok(!/[^\x00-\x7F]/.test(sql),'ASCII only migration');
 assert.ok(!/^\s*GO\s*$/im.test(sql),'no GO batches');
 const names=fs.readdirSync(path.join(root,'db/migrations')).filter(n=>n.endsWith('.sql')).sort();
 names.forEach((n,i)=>assert.equal(Number(n.slice(0,3)),i+1,'consecutive '+n));
 assert.equal(names[31],'032_inventory_branch_transfers.sql');
});

test('SQL032 never passes a unary-minus expression as an EXEC argument',()=>{
 const sql=read(SQL);
 for(const line of sql.split('\n')){
  if(/\bEXEC(UTE)?\b/i.test(line)&&!/^\s*EXEC\(N'/.test(line))
   assert.doesNotMatch(line,/-\s*@/,'unary minus in EXEC arg: '+line.trim());
 }
 // Reverse deltas are precomputed into named variables first.
 assert.match(sql,/SET @OutDelta=-@Qty;/);
 assert.match(sql,/SET @DestDelta=-@Qty;/);
 assert.match(sql,/EXEC core\.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,@OutDelta;/);
 assert.match(sql,/EXEC core\.ApplyBranchStockDelta @TenantId,@BusinessId,@ToBranchId,@Off,@DestDelta;/);
 assert.doesNotMatch(sql,/ApplyBranchStockDelta[^;]*,\s*-/);
});

test('SQL032 quotes reserved words and keeps tables Business/Branch composite-FK scoped',()=>{
 const sql=read(SQL);
 assert.doesNotMatch(sql,/AS lineNo\b/i,'LINENO is reserved: alias must be bracketed');
 assert.doesNotMatch(sql,/[(,]\s*LineNo\s+INT/,'raw LineNo column');
 assert.match(sql,/\[LineNo\] INT NOT NULL/);
 assert.match(sql,/AS \[lineNo\]/);
 assert.match(sql,/PRIMARY KEY\(TenantId,BusinessId,TransferId\)/);
 assert.match(sql,/FK_StockTransfer_From FOREIGN KEY\(TenantId,BusinessId,FromBranchId\)/);
 assert.match(sql,/FK_StockTransfer_To FOREIGN KEY\(TenantId,BusinessId,ToBranchId\)/);
 assert.match(sql,/REFERENCES core\.Branch\(TenantId,BusinessId,BranchId\)/);
 assert.match(sql,/CK_StockTransfer_Branches CHECK\(FromBranchId<>ToBranchId\)/);
 assert.match(sql,/FK_StockTransferLine_Offering FOREIGN KEY\(TenantId,BusinessId,OfferingId\)/);
 assert.match(sql,/CK_StockTransferLine_Qty CHECK\(QtyMilli BETWEEN 1 AND 9000000000000\)/);
});

test('SQL032 runtime is EXECUTE-only and every procedure asserts K5 RBAC on both branches',()=>{
 const sql=read(SQL);
 assert.match(sql,/DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core\.StockTransferDocument/);
 assert.match(sql,/DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core\.StockTransferLine/);
 for(const proc of ['ReadStockTransfers','CreateStockTransfer','CancelStockTransfer'])
  assert.match(sql,new RegExp('GRANT EXECUTE ON OBJECT::core\\.'+proc+' TO'));
 assert.doesNotMatch(sql,/GRANT\s+(SELECT|INSERT|UPDATE|DELETE)/i);
 const read_=sql.slice(sql.indexOf('CREATE PROCEDURE core.ReadStockTransfers'),
  sql.indexOf('CREATE PROCEDURE core.CreateStockTransfer'));
 const create=sql.slice(sql.indexOf('CREATE PROCEDURE core.CreateStockTransfer'),
  sql.indexOf('CREATE PROCEDURE core.CancelStockTransfer'));
 const cancel=sql.slice(sql.indexOf('CREATE PROCEDURE core.CancelStockTransfer'),
  sql.indexOf('IF USER_ID('));
 assert.equal((read_.match(/EXEC core\.AssertInventoryBranchAction/g)||[]).length,1);
 assert.match(read_,/''inventory\.read''/);
 assert.equal((create.match(/EXEC core\.AssertInventoryBranchAction/g)||[]).length,2);
 assert.equal((cancel.match(/EXEC core\.AssertInventoryBranchAction/g)||[]).length,2);
 assert.match(create,/@BranchId,@AccountId,\s*@SessionVersion,@TokenHash,''inventory\.manage''/);
 assert.match(create,/@ToBranchId,@AccountId,\s*@SessionVersion,@TokenHash,''inventory\.manage''/);
 assert.match(cancel,/@ToBranchId,@AccountId,\s*@SessionVersion,@TokenHash,''inventory\.manage''/);
});

test('SQL032 enforces source stock strictly, reverses atomically and is idempotent',()=>{
 const sql=read(SQL);
 // Source stock is enforced independent of the SQL027 negative-stock policy (Cashier override=false).
 assert.match(sql,/THROW 51475,''Insufficient source stock'',1/);
 assert.match(sql,/THROW 51475,''Destination stock already consumed'',1/);
 assert.match(sql,/THROW 51472,''Invalid stock transfer'',1/);
 assert.match(sql,/@ToBranchId=@BranchId/);
 assert.match(sql,/UQ_StockTransfer_Request UNIQUE\(TenantId,BusinessId,FromBranchId,ClientRequestId\)/);
 assert.match(sql,/UX_StockTransfer_Cancel/);
 assert.match(sql,/THROW 51473,''Stock transfer replay conflict'',1/);
 assert.match(sql,/THROW 51473,''Stock transfer already cancelled'',1/);
 // Per-business applock serialises transfers (no A->B / B->A deadlock) inside the transaction.
 assert.equal((sql.match(/sys\.sp_getapplock/g)||[]).length,2);
 assert.equal((sql.match(/@LockOwner=''Transaction''/g)||[]).length,2);
 // Stock moves only through the SQL027 delta procedure; no direct balance DML here.
 assert.doesNotMatch(sql,/UPDATE\s+core\.BranchStockBalance/i);
 assert.doesNotMatch(sql,/INSERT\s+core\.BranchStockBalance/i);
 assert.equal((sql.match(/EXEC core\.ApplyBranchStockDelta/g)||[]).length,4);
});

test('SQL032 is nonposting: no GL, COGS, AP, Treasury, journal or sale objects (ADR-031)',()=>{
 const sql=read(SQL).split(/\r?\n/).filter(l=>!l.startsWith('--')).join('\n');
 assert.doesNotMatch(sql,/core\.(CashMove|Treasury|Journal|Ledger|Sale|Invoice|Payable|Payment|Cogs)/i);
 assert.doesNotMatch(sql,/\b(COGS|GeneralLedger|PostJournal)\b/i);
 assert.doesNotMatch(sql,/UnitCost|CostMinor|AmountMinor/i);
});

test('Nest transfers surface is nonposting and rejects unexpected fields',()=>{
 const svc=read('apps/api/src/inventory/inventory.service.ts');
 const ctrl=read('apps/api/src/inventory/inventory.controller.ts');
 assert.match(svc,/"core\.ReadStockTransfers"/);
 assert.match(svc,/"core\.CreateStockTransfer"/);
 assert.match(svc,/"core\.CancelStockTransfer"/);
 assert.match(svc,/strictBody\(body,\["toBranchId","note","lines"\]\)/);
 assert.match(svc,/NONPOSTING_BRANCH_TRANSFERS/);
 assert.match(ctrl,/@Get\("transfers"\)/);
 assert.match(ctrl,/@Post\("transfers"\)/);
 assert.match(ctrl,/@Post\("transfers\/:transferId\/cancel"\)/);
});

test('ledger INV-03 cites real target paths and stays honestly incomplete',()=>{
 const row=ledger.workflows.find(r=>r.ID==='INV-03');
 assert.ok(row);
 assert.deepEqual(row['SourcePaths+BlobSHA'],[
  'src/app/api/inventory/transfers/route.ts#'+ROUTE_BLOB,
  'src/lib/inventory/transferInventory.service.ts#'+SERVICE_BLOB,
 ]);
 assert.notEqual(row.Status,'BLOCKED');
 assert.notEqual(row.Status,'PRIVATE_BROWSER_VERIFIED');
 assert.notEqual(row.Status,'PILOT_VERIFIED');
 assert.equal(row.BrowserProof,'OPEN');
 assert.equal(row.PilotProof,'OPEN');
 for(const target of row.TargetPaths){
  const p=target.replace('apps/web/...','apps/web/src/app/workspace/[businessId]/[branchId]');
  assert.ok(fs.existsSync(path.join(root,p)),'missing target '+target);
 }
 assert.ok(row.TargetPaths.includes(SQL));
 assert.ok(row.TargetPaths.includes('packages/business-modules/inventory/src/transfer-rules.ts'));
});

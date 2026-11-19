'use strict';
/**
 * PR0: Lock Cashier source SHA and rebuild blob/runtime inventories from a local
 * read-only sibling checkout. Never writes to the Cashier repo.
 *
 * Usage:
 *   node tools/cashier-reuse/inventory-source.cjs \
 *     --repo "../casher" \
 *     --sha 046bf19b0d5833a07fe4b2891cbf3032d03b7cef \
 *     --previous bc9c03fff86074872590ad0fd3525f9a4e416958
 */
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'../..');
const OUT_DIR=path.join(ROOT,'tools/cashier-reuse');

function arg(name,fallback){
 const i=process.argv.indexOf(name);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function git(repo,args){
 const r=spawnSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024});
 if(r.status!==0)throw Error('git '+args.join(' ')+': '+(r.stderr||r.stdout||'failed'));
 return r.stdout;
}
function classify(filePath){
 if(/^src\/app\/api\/.+\/route\.tsx?$/.test(filePath))return 'API_ROUTE';
 if(/^src\/app\/.+\/page\.tsx$/.test(filePath))return 'PAGE';
 if(filePath.startsWith('src/components/'))return 'UI_COMPONENT';
 if(filePath.startsWith('src/hooks/'))return 'HOOK';
 if(filePath.startsWith('src/apps/'))return 'APPLICATION_MODULE';
 if(filePath.startsWith('src/modules/'))return 'DOMAIN_MODULE';
 if(filePath.startsWith('src/lib/'))return 'LIBRARY';
 return 'OTHER_SOURCE';
}
function ownerCandidate(filePath,kind){
 const p=filePath.toLowerCase();
 if(/payroll|attendance|hr|employee|barber|commission|tip/.test(p))return 'HR & Payroll';
 if(/treasury|payment|clearing|cashmove|shift.?cash/.test(p))return 'Treasury & Payments';
 if(/booking|queue|schedule|appointment|availability/.test(p))return 'Booking & Scheduling';
 if(/catalog|inventory|product|stock|purchase|supplier|package|groom/.test(p))return 'Catalog & Inventory';
 if(/customer|client|loyalty|crm|voucher|cut.?club|consent/.test(p))return 'CRM & Loyalty';
 if(/whatsapp|messaging|notification|campaign|drvowa|integration/.test(p))return 'Messaging & Integrations';
 if(/business.?day|operations|shift|day.?close|rollover/.test(p))return 'Operations & BusinessDay';
 if(/expense|income|budget/.test(p))return 'Expenses & Income';
 if(/report|accounting|journal|gl|ledger/.test(p))return 'Accounting & Reports';
 if(/auth|tenant|platform|session|permission|rbac/.test(p))return 'Platform & Identity';
 if(kind==='API_ROUTE'&&/\/sales\/|\/pos\//.test(p))return 'POS & Sales';
 if(/pos|sale|invoice|cart|receipt|print/.test(p))return 'POS & Sales';
 return 'CROSS_MODULE_REVIEW';
}
function isRuntimeTs(p){
 return /^src\/.+\.tsx?$/.test(p)&&!/__tests__|\.test\.|\.spec\./.test(p);
}

const repo=path.resolve(ROOT,arg('--repo','../casher'));
const sha=arg('--sha','046bf19b0d5833a07fe4b2891cbf3032d03b7cef');
const previous=arg('--previous','bc9c03fff86074872590ad0fd3525f9a4e416958');
assert.ok(fs.existsSync(path.join(repo,'.git')),'Cashier repo not found at '+repo);
assert.ok(/^[0-9a-f]{40}$/.test(sha),'--sha must be full 40-char commit');
assert.ok(/^[0-9a-f]{40}$/.test(previous),'--previous must be full 40-char commit');

const resolved=git(repo,['rev-parse',sha]).trim();
assert.equal(resolved,sha);
const subject=git(repo,['log','-1','--format=%s',sha]).trim();
const tree=git(repo,['ls-tree','-r','-l',sha]).trim().split(/\r?\n/).filter(Boolean);
const blobs=[];
for(const line of tree){
 // <mode> <type> <sha> <size>\t<path>
 const tab=line.indexOf('\t');
 assert.ok(tab>0,'bad ls-tree line');
 const meta=line.slice(0,tab).trim().split(/\s+/);
 const filePath=line.slice(tab+1);
 assert.equal(meta[1],'blob');
 const size=meta[3]==='-'?null:Number(meta[3]);
 blobs.push([filePath,meta[2],Number.isFinite(size)?size:null]);
}
blobs.sort((a,b)=>a[0].localeCompare(b[0]));

const runtime=[];
const byKind={},byOwner={};
for(const [filePath,blob] of blobs){
 if(!isRuntimeTs(filePath))continue;
 const kind=classify(filePath);
 const owner=ownerCandidate(filePath,kind);
 byKind[kind]=(byKind[kind]||0)+1;
 byOwner[owner]=(byOwner[owner]||0)+1;
 runtime.push({path:filePath,blob,kind,ownerCandidate:owner});
}

const allOut={
 schema:'drvo.cashier.all-source-blobs.v1',
 repo:'tarek-saad-dev/casher',
 sourceRevision:sha,
 previousRevision:previous,
 createdDate:'2026-11-19',
 subject,
 sourceComplete:true,
 files:blobs.length,
 blobs,
};
const runtimeOut={
 schema:'drvo.cashier.source-baseline.v1',
 repo:'tarek-saad-dev/casher',
 sourceRevision:sha,
 previousRevision:previous,
 createdDate:'2026-11-19',
 contract:'Full TS/TSX runtime source path + blob manifest (tests excluded), not proof of per-feature parity. All status UNVERIFIED until audited with independent tests.',
 countedFrom:'local git ls-tree -r -l <sha> (complete, untruncated)',
 totalRepositoryBlobs:blobs.length,
 runtimeFiles:runtime.length,
 byKind,byOwner,
 defaultMigrationStatus:'UNVERIFIED',
 files:runtime,
};

const prevBlobs=new Map();
for(const line of git(repo,['ls-tree','-r',previous]).trim().split(/\r?\n/).filter(Boolean)){
 const tab=line.indexOf('\t');
 const meta=line.slice(0,tab).trim().split(/\s+/);
 prevBlobs.set(line.slice(tab+1),meta[2]);
}
const curBlobs=new Map(blobs.map(([p,b])=>[p,b]));
const added=[],removed=[],changed=[];
for(const [p,b] of curBlobs){
 if(!prevBlobs.has(p))added.push({path:p,blob:b});
 else if(prevBlobs.get(p)!==b)changed.push({path:p,from:prevBlobs.get(p),to:b});
}
for(const [p,b] of prevBlobs){
 if(!curBlobs.has(p))removed.push({path:p,blob:b});
}
const delta={
 schema:'drvo.cashier.source-delta.v1',
 repo:'tarek-saad-dev/casher',
 fromRevision:previous,
 toRevision:sha,
 createdDate:'2026-11-19',
 subject,
 counts:{added:added.length,removed:removed.length,changed:changed.length,
  totalBlobs:blobs.length,runtimeFiles:runtime.length},
 added,removed,changed,
 criticalPathsRetained:[
  'src/app/income/pos/page.tsx',
  'src/components/pos/CustomerSearch.tsx',
  'src/components/pos/QuickCustomerModal.tsx',
  'src/hooks/useSaleState.ts',
  'src/lib/sales/service-line-totals.ts',
  'src/apps/pos/application/createSale.ts',
  'src/apps/treasury/internal/postMovement.ts',
  'src/apps/booking/application/convertBooking.ts',
 ].every(p=>curBlobs.has(p)),
};

const stamp='2026-11-19';
fs.writeFileSync(path.join(OUT_DIR,'cashier-all-source-blobs-'+stamp+'.json'),
 JSON.stringify(allOut));
fs.writeFileSync(path.join(OUT_DIR,'cashier-source-baseline-'+stamp+'.json'),
 JSON.stringify(runtimeOut,null,2)+'\n');
fs.writeFileSync(path.join(OUT_DIR,'cashier-source-delta-'+stamp+'.json'),
 JSON.stringify(delta,null,2)+'\n');
fs.writeFileSync(path.join(OUT_DIR,'cashier-source-lock-'+stamp+'.json'),JSON.stringify({
 schema:'drvo.cashier.source-lock.v1',
 repo:'tarek-saad-dev/casher',
 sourceRevision:sha,
 previousRevision:previous,
 lockedDate:'2026-11-19',
 subject,
 note:'New immutable Cashier source pin for full-parity migration. Historical pin bc9c03fff remains retained; never silently replace baselines.',
 inventories:{
  allBlobs:'tools/cashier-reuse/cashier-all-source-blobs-'+stamp+'.json',
  runtime:'tools/cashier-reuse/cashier-source-baseline-'+stamp+'.json',
  delta:'tools/cashier-reuse/cashier-source-delta-'+stamp+'.json',
  workflowLedger:'tools/cashier-reuse/cashier-workflow-ledger-'+stamp+'.json',
 },
},null,2)+'\n');

console.log(JSON.stringify({
 ok:true,sourceRevision:sha,totalBlobs:blobs.length,runtimeFiles:runtime.length,
 delta:delta.counts,criticalPathsRetained:delta.criticalPathsRetained,
},null,2));

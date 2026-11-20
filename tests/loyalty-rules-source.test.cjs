'use strict';
/**
 * LOY-01..LOY-05 Loyalty / Cut Club characterization. Pin: casher@046bf19.
 * DRVO owns NON-POSTING rules + preview math only. Earn, redeem, adjust, reverse, store buy,
 * mystery box, referral payout and messaging all stay BLOCKED. These are source-level tests:
 * no SQL, no browser, no Cashier database was touched.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const ts=require('typescript');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const PIN='046bf19b0d5833a07fe4b2891cbf3032d03b7cef';
const BLOBS={
 'helpers.ts':['src/lib/loyalty/helpers.ts','bcc161728cbece5d90ea492234989bbed2e436de'],
 'types.ts':['src/lib/loyalty/types.ts','438a908f491eb4a06544f4e97002cb823d5e22f0'],
 'cutClubSettingsPage.tsx':['src/app/admin/cut-club/settings/page.tsx','6850a0002964eccfb12c12627aee6a59f32b8992'],
};
const baseline=require('../tools/cashier-reuse/cashier-source-baseline-2026-11-19.json');
const ledger=require('../tools/cashier-reuse/cashier-workflow-ledger-2026-11-19.json');
const drvo=require('../dist/packages/business-modules/loyalty/src/loyalty-rules');

function gitBlob(text){
 const bytes=Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function pinned(file){
 const s=read('_cashier_source/loyalty/'+file);
 const exports={};
 const code=ts.transpileModule(s,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,module:{exports},require:()=>({}),Date},{timeout:1000});
 return exports;
}
const cashier=pinned('helpers.ts');
const TIERS=['BRONZE','SILVER','GOLD','VIP'];

test('Cashier loyalty excerpts are the exact pinned blobs and match the locked baseline',()=>{
 assert.equal(ledger.sourceRevision,PIN);
 const byPath=new Map(baseline.files.map(f=>[f.path,f.blob]));
 for(const [file,[src,blob]] of Object.entries(BLOBS)){
  assert.equal(gitBlob(read('_cashier_source/loyalty/'+file)),blob,file);
  assert.equal(byPath.get(src),blob,src);
 }
});

test('tier rank and reward tier gate equal Cashier for known and unknown codes',()=>{
 for(const code of [...TIERS,'','bronze','PLATINUM'])
  assert.equal(drvo.getTierRank(code),cashier.getTierRank(code),code);
 for(const tier of [...TIERS,'PLATINUM'])
  for(const min of [null,...TIERS])
   assert.equal(drvo.canClientAccessReward(tier,min),cashier.canClientAccessReward(tier,min),tier+'>='+min);
 assert.deepEqual([...drvo.TIER_CODES],TIERS);
});

test('reward catalog keeps Cashier ids, costs, types and tier gates',()=>{
 assert.equal(drvo.REWARD_CATALOG.length,cashier.STATIC_REWARDS.length);
 drvo.REWARD_CATALOG.forEach((r,i)=>{
  const c=cashier.STATIC_REWARDS[i];
  assert.deepEqual([r.id,r.titleEn,r.requiredPoints,r.rewardType,r.minTierCode],
   [c.id,c.titleEn,c.requiredPoints,c.rewardType,c.minTierCode]);
 });
 for(const id of [1,2,3,4,5,0,-1])
  assert.equal(drvo.getRewardById(id)?.id,cashier.getRewardById(id)?.id,String(id));
});

test('buildRewardsForClient + getNextReward + calculateProgress equal Cashier across balances/tiers',()=>{
 for(const tier of [...TIERS,'PLATINUM',''])
  for(const balance of [0,1,100,219,220,221,399,400,599,600,1199,1200,5000]){
   const a=drvo.buildRewardsForClient(balance,tier),b=cashier.buildRewardsForClient(balance,tier);
   const plain=rows=>JSON.parse(JSON.stringify(rows.map(r=>[r.id,r.status,r.remainingPoints,r.progress,r.requiredPoints])));
   assert.deepEqual(plain(a),plain(b),tier+':'+balance);
   const n1=drvo.getNextReward(a),n2=cashier.getNextReward(b);
   assert.equal(n1?.id??null,n2?.id??null,'next '+tier+':'+balance);
   if(n1)assert.deepEqual([n1.remainingPoints,n1.progress],[n2.remainingPoints,n2.progress]);
  }
 for(const [c,r] of [[0,0],[5,0],[50,100],[1,3],[2,3],[500,100]])
  assert.equal(drvo.calculateProgress(c,r),cashier.calculateProgress(c,r));
 // VIP-gated reward is never "next" while tier-locked (Cashier only considers "locked").
 const silver=drvo.buildRewardsForClient(0,'SILVER');
 assert.equal(silver.find(r=>r.id===4).status,'tier_locked');
 assert.equal(drvo.getNextReward(silver).id,1);
});

test('levels and personal offer equal Cashier; tier resolution is explicitly DRVO-derived',()=>{
 const raw=[
  {TierID:1,TierCode:'BRONZE',TierNameAr:'a',TierNameEn:'Bronze',MinLifetimePoints:0,PointsMultiplier:1,SortOrder:1},
  {TierID:2,TierCode:'SILVER',TierNameAr:'b',TierNameEn:'Silver',MinLifetimePoints:500,PointsMultiplier:1.2,SortOrder:2},
  {TierID:3,TierCode:'GOLD',TierNameAr:'c',TierNameEn:'Gold',MinLifetimePoints:1500,PointsMultiplier:1.5,SortOrder:3},
 ];
 const mine=raw.map(t=>({tierCode:t.TierCode,minLifetimePoints:t.MinLifetimePoints,
  pointsMultiplier:t.PointsMultiplier,sortOrder:t.SortOrder}));
 for(const [cur,life] of [['BRONZE',0],['SILVER',500],['SILVER',499],['GOLD',9999]]){
  const a=drvo.buildLevels(mine,cur,life),b=cashier.buildLevels(raw,cur,life);
  assert.deepEqual(JSON.parse(JSON.stringify(a.map(l=>[l.tierCode,l.isCurrent,l.isCompleted]))),
   JSON.parse(JSON.stringify(b.map(l=>[l.tierCode,l.isCurrent,l.isCompleted]))));
 }
 assert.equal(drvo.resolveTierForLifetime(mine,0),'BRONZE');
 assert.equal(drvo.resolveTierForLifetime(mine,499),'BRONZE');
 assert.equal(drvo.resolveTierForLifetime(mine,500),'SILVER');
 assert.equal(drvo.resolveTierForLifetime(mine,99999),'GOLD');
 assert.equal(drvo.resolveTierForLifetime([],10),null);
 const now=Date.parse('2026-11-20T00:00:00Z');
 const FakeDate=class extends Date{static now(){return now;}};
 const clocked={};
 vm.runInNewContext(ts.transpileModule(read('_cashier_source/loyalty/helpers.ts'),{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
  {exports:clocked,module:{exports:clocked},require:()=>({}),Date:FakeDate});
 for(const last of [null,'2026-11-19T00:00:00Z','2026-10-06T00:00:00Z','2026-10-05T00:00:00Z','2026-10-04T00:00:00Z']){
  assert.equal(drvo.determinePersonalOffer(last,now),clocked.determinePersonalOffer(last,0).type,String(last));
 }
 assert.equal(drvo.determinePersonalOffer('2026-10-05T00:00:00Z',now),'COMEBACK');
 assert.equal(drvo.determinePersonalOffer('2026-10-06T00:00:00Z',now),'DOUBLE_POINTS');
});

test('movement labels equal Cashier and unknown types fall back to the generic label',()=>{
 for(const type of drvo.MOVEMENT_TYPES)
  assert.equal(drvo.mapMovementTypeToArabicLabel(type),cashier.mapLoyaltyMovementTypeToArabicLabel(type),type);
 assert.equal(drvo.mapMovementTypeToArabicLabel('STORE_PURCHASE'),
  cashier.mapLoyaltyMovementTypeToArabicLabel('STORE_PURCHASE'));
 assert.equal(drvo.mapMovementTypeToArabicLabel('toString'),drvo.MOVEMENT_FALLBACK_LABEL_AR);
});

test('manual adjustment preview mirrors the Cashier adjust route and never drives balance negative',()=>{
 const add=drvo.previewManualAdjustment(100,50,'goodwill');
 assert.deepEqual([add.ok,add.movementType,add.pointsBefore,add.pointsDelta,add.pointsAfter],
  [true,'ADJUST_ADD',100,50,150]);
 const sub=drvo.previewManualAdjustment(100,-100,'correction');
 assert.deepEqual([sub.ok,sub.movementType,sub.pointsAfter],[true,'ADJUST_SUBTRACT',0]);
 const over=drvo.previewManualAdjustment(100,-100.01,'too much');
 assert.deepEqual([over.ok,over.issue,over.pointsAfter],[false,'INSUFFICIENT_POINTS',100]);
 assert.equal(drvo.previewManualAdjustment(0.1,0.2,'x').pointsAfter,0.3);
 for(const state of [add,sub,over]){
  assert.equal(state.state,'UNPOSTED_LOYALTY_PREVIEW');assert.equal(state.persisted,false);
  assert.equal(state.financialPostingState,'NOT_AUTHORIZED');
 }
 assert.throws(()=>drvo.previewManualAdjustment(100,0,'n'),TypeError);
 assert.throws(()=>drvo.previewManualAdjustment(100,5,''),TypeError);
 assert.throws(()=>drvo.previewManualAdjustment(100,5,'   '),TypeError);
 assert.throws(()=>drvo.previewManualAdjustment(100,5,7),TypeError);
 assert.throws(()=>drvo.previewManualAdjustment(100,1.005,'n'),TypeError);
 assert.throws(()=>drvo.previewManualAdjustment(-1,5,'n'),TypeError);
 assert.throws(()=>drvo.previewManualAdjustment(100,NaN,'n'),TypeError);
 assert.throws(()=>drvo.previewManualAdjustment(100,5,'x'.repeat(501)),TypeError);
});

test('reward redemption preview follows Cashier validation order and mints no code',()=>{
 const r=(bal,tier,id,confirm)=>drvo.previewRewardRedemption(bal,tier,id,confirm);
 assert.equal(r(1000,'BRONZE',1,undefined).issue,'REWARD_CONFIRMATION_REQUIRED');
 assert.equal(r(1000,'BRONZE',1,'true').issue,'REWARD_CONFIRMATION_REQUIRED');
 assert.equal(r(1000,'BRONZE',99,true).issue,'REWARD_NOT_FOUND');
 assert.equal(r(1000,'BRONZE','1',true).issue,'REWARD_NOT_FOUND');
 assert.equal(r(5000,'SILVER',4,true).issue,'TIER_TOO_LOW');   // tier gate before balance
 assert.equal(r(10,'BRONZE',1,true).issue,'INSUFFICIENT_POINTS');
 assert.equal(r(10,'SILVER',4,true).issue,'TIER_TOO_LOW');
 const ok=r(220,'BRONZE',1,true);
 assert.deepEqual([ok.ok,ok.issue,ok.movementType,ok.pointsDelta,ok.pointsAfter],[true,null,'REDEEM',-220,0]);
 assert.equal(ok.redemptionCode,null);
 assert.equal(r(1200,'GOLD',4,true).pointsAfter,0);
 assert.equal(r(219.99,'BRONZE',1,true).issue,'INSUFFICIENT_POINTS');
 for(const x of [ok,r(1,'BRONZE',1,true)])assert.equal(x.persisted,false);
 assert.throws(()=>r(-5,'BRONZE',1,true),TypeError);
});

test('sale reversal preview needs earned points, refuses double reversal, flags negative balance',()=>{
 const earn=(d)=>({movementType:'EARN_SALE',pointsDelta:d});
 const ok=drvo.previewSaleReversal(500,[earn(120)],'void sale');
 assert.deepEqual([ok.ok,ok.movementType,ok.pointsDelta,ok.pointsAfter,ok.wouldGoNegative],
  [true,'REVERSAL',-120,380,false]);
 const neg=drvo.previewSaleReversal(20,[earn(60),earn(60)],'void sale');
 assert.deepEqual([neg.ok,neg.pointsDelta,neg.pointsAfter,neg.wouldGoNegative],[true,-120,-100,true]);
 assert.equal(drvo.previewSaleReversal(500,[earn(120),{movementType:'REVERSAL',pointsDelta:-120}],'n').issue,
  'ALREADY_REVERSED');
 assert.equal(drvo.previewSaleReversal(500,[],'n').issue,'NO_EARNED_POINTS');
 assert.equal(drvo.previewSaleReversal(500,[{movementType:'REDEEM',pointsDelta:-5}],'n').issue,'NO_EARNED_POINTS');
 assert.throws(()=>drvo.previewSaleReversal(500,[earn(1)],''),TypeError);
 assert.throws(()=>drvo.previewSaleReversal(500,[earn(-1)],'n'),TypeError);
 assert.throws(()=>drvo.previewSaleReversal(500,[{movementType:'GIFT',pointsDelta:1}],'n'),TypeError);
 assert.throws(()=>drvo.previewSaleReversal(500,Array(201).fill(earn(1)),'n'),TypeError);
});

test('Cut Club default config equals Cashier settings-page initial state with messaging forced off',()=>{
 const page=read('_cashier_source/loyalty/cutClubSettingsPage.tsx');
 const num=k=>Number(new RegExp(k+':\\s*([0-9.]+)').exec(page)[1]);
 const flag=k=>new RegExp(k+':\\s*(true|false)').exec(page)[1]==='true';
 const d=drvo.CUT_CLUB_DEFAULT_CONFIG;
 assert.deepEqual(d.points,{pointsPerCurrency:num('pointsPerCurrency'),coinMultiplier:num('coinMultiplier'),
  expiryEnabled:flag('expiryEnabled'),expiryDays:num('expiryDays')});
 assert.deepEqual(d.mysteryBox,{enabled:d.mysteryBox.enabled,dailyLimit:num('dailyLimit')});
 assert.equal(d.referral.rewardCoins,num('rewardCoins'));
 assert.equal(d.referral.requireFirstVisit,flag('requireFirstVisit'));
 assert.equal(d.store.minPurchaseInterval,num('minPurchaseInterval'));
 assert.equal(d.store.maxPurchasesPerDay,num('maxPurchasesPerDay'));
 assert.equal(d.tiers.autoUpgrade,flag('autoUpgrade'));
 assert.equal(flag('notifyOnUpgrade'),true);            // Cashier default ...
 assert.equal(d.tiers.notifyOnUpgrade,false);           // ... DRVO: no Messaging owner yet
 // The Cashier page keeps these in React state only: no fetch/persistence call exists.
 assert.doesNotMatch(page,/fetch\(|axios|\/api\//);
 assert.match(drvo.CUT_CLUB_DEFAULTS_PROVENANCE,/NOT_PERSISTED_NOT_ENFORCED/);
});

test('Cut Club config validation is strict, bounded and refuses notifyOnUpgrade',()=>{
 const good=JSON.parse(JSON.stringify(drvo.CUT_CLUB_DEFAULT_CONFIG));
 assert.deepEqual(drvo.validateCutClubConfig(good),drvo.CUT_CLUB_DEFAULT_CONFIG);
 const mut=fn=>{const c=JSON.parse(JSON.stringify(good));fn(c);return c;};
 const bad=[
  mut(c=>{c.tiers.notifyOnUpgrade=true;}),
  mut(c=>{c.extra=1;}),
  mut(c=>{c.points.extra=1;}),
  mut(c=>{delete c.store;}),
  mut(c=>{c.points.pointsPerCurrency=0;}),
  mut(c=>{c.points.pointsPerCurrency=1001;}),
  mut(c=>{c.points.pointsPerCurrency=0.001;}),
  mut(c=>{c.points.coinMultiplier=-1;}),
  mut(c=>{c.points.expiryDays=0;}),
  mut(c=>{c.points.expiryDays=1.5;}),
  mut(c=>{c.points.expiryEnabled='no';}),
  mut(c=>{c.referral.rewardCoins=-1;}),
  mut(c=>{c.mysteryBox.dailyLimit=1001;}),
  mut(c=>{c.store.maxPurchasesPerDay='3';}),
  null,[],'x',
 ];
 for(const input of bad)assert.throws(()=>drvo.validateCutClubConfig(input),TypeError,JSON.stringify(input));
 const norm=drvo.validateCutClubConfig(mut(c=>{c.points.pointsPerCurrency=2.5;c.points.expiryEnabled=true;}));
 assert.equal(norm.points.pointsPerCurrency,2.5);assert.equal(norm.points.expiryEnabled,true);
});

test('Nest local copy stays byte-identical to the package source body',()=>{
 const body=s=>s.slice(s.indexOf('*/')+2).replace(/\r\n/g,'\n');
 assert.equal(body(read('apps/api/src/loyalty/loyalty-rules.ts')),
  body(read('packages/business-modules/loyalty/src/loyalty-rules.ts')));
});

test('ledger keeps Loyalty/Cut Club rows honest: PORTING/BLOCKED, no browser/pilot proof claimed',()=>{
 const byId=Object.fromEntries(ledger.workflows.map(w=>[w.ID,w]));
 const allowed=new Set(['SOURCE_IDENTIFIED','PORTING','SOURCE_TESTED','BLOCKED']);
 for(const id of ['LOY-01','LOY-02','LOY-03','LOY-04','LOY-05']){
  const row=byId[id];
  assert.ok(allowed.has(row.Status),id+' '+row.Status);
  for(const k of ['BrowserProof','DataProof','PilotProof','SQLHTTPTest'])assert.equal(row[k],'OPEN',id+' '+k);
 }
 for(const id of ['LOY-01','LOY-02','LOY-03','LOY-05']){
  assert.ok(byId[id].TargetPaths.some(p=>p.includes('loyalty-rules.ts')),id);
  assert.match(byId[id].DomainTest,/loyalty-rules-source\.test\.cjs/,id);
 }
 assert.equal(byId['LOY-02'].Status,'BLOCKED');
 assert.equal(byId['LOY-04'].Status,'SOURCE_IDENTIFIED');
 assert.match(byId['LOY-01'].Blocker,/no .*(ledger|persist|earn)/i);
 assert.notEqual(byId['LOY-03'].Status,'PRIVATE_BROWSER_VERIFIED');
});

test('DRVO loyalty module has no posting, SQL, messaging or environment surface',()=>{
 const src=read('packages/business-modules/loyalty/src/loyalty-rules.ts');
 assert.match(src,/NON-POSTING/);
 const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.doesNotMatch(code,/process\.env|sql\.|fetch\(|require\(|import\s|Date\.now|Math\.random|sendMessage|whatsapp/i);
 const api=read('apps/api/src/loyalty/loyalty.service.ts');
 assert.doesNotMatch(api,/getInternalPool|\.execute\(|INSERT|UPDATE|MERGE|sp_Loyalty/);
});

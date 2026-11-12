'use strict';
/**
 * CU-2, REVIEW-ONLY synthetic migration plan. Never opens a DB, reads legacy data,
 * creates accounts, or writes/imports into DRVO. No runtime business module imports.
 */
const {createHash}=require('node:crypto');
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATASET=/^SYN-[A-Z0-9-]{3,40}$/;
const BRANCH=/^SYN-BRANCH-[A-Z0-9-]{1,30}$/;
const owners=Object.freeze({TblClient:'CUSTOMER',TblPro:'CATALOG_OFFERING'});

function exactObject(input,keys,required=keys) {
  if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(k=>!keys.includes(k))||
      required.some(k=>!Object.prototype.hasOwnProperty.call(input,k)))
    throw new TypeError('Unexpected synthetic mapping fields');
  return input;
}
function guid(v) {
  if(typeof v!=='string'||!GUID.test(v))throw new TypeError('Invalid target UUID');
  return v.toLowerCase();
}
function makeSyntheticMapPlan(input) {
  const i=exactObject(input,['datasetId','destination','branches','rows']);
  if(!DATASET.test(i.datasetId))throw new TypeError('Synthetic dataset ID required');
  const dst=exactObject(i.destination,['tenantId','businessId']);
  const tenantId=guid(dst.tenantId),businessId=guid(dst.businessId);
  if(!Array.isArray(i.branches)||i.branches.length===0||i.branches.length>20||
     !Array.isArray(i.rows)||i.rows.length===0||i.rows.length>200)
    throw new TypeError('Invalid synthetic mapping size');
  const known=new Map();
  for(const item of i.branches) {
    const b=exactObject(item,['sourceBranchKey','tenantId','businessId','branchId']);
    if(typeof b.sourceBranchKey!=='string'||!BRANCH.test(b.sourceBranchKey)||
       known.has(b.sourceBranchKey)||
       guid(b.tenantId)!==tenantId||guid(b.businessId)!==businessId)
      throw new TypeError('Unknown/duplicate/cross-Business branch mapping');
    known.set(b.sourceBranchKey,guid(b.branchId));
  }
  const oldKeys=new Set(),targetKeys=new Set(),plan=[];
  for(const entry of i.rows) {
    const row=exactObject(entry,['legacyTable','legacyId','sourceBranchKey','targetId']);
    if(!Object.prototype.hasOwnProperty.call(owners,row.legacyTable)||
       !Number.isSafeInteger(row.legacyId)||row.legacyId<1||
       !known.has(row.sourceBranchKey))
      throw new TypeError('Unknown source table, ID or Branch');
    const targetId=guid(row.targetId);
    const old=i.datasetId+':'+row.legacyTable+':'+row.legacyId;
    const target=owners[row.legacyTable]+':'+tenantId+':'+businessId+':'+targetId;
    if(oldKeys.has(old)||targetKeys.has(target))
      throw new TypeError('Duplicate legacy record or target ID collision');
    oldKeys.add(old);targetKeys.add(target);
    plan.push(Object.freeze({
      sourceDataset:i.datasetId,sourceBranchKey:row.sourceBranchKey,
      scope:'BUSINESS',legacyTable:row.legacyTable,legacyId:row.legacyId,
      targetEntity:owners[row.legacyTable],tenantId,businessId,
      verifiedBranchId:known.get(row.sourceBranchKey),targetId,
    }));
  }
  // fingerprint is a diagnostic digest, NOT proof of approval/authentication.
  plan.sort((a,b)=>a.legacyTable.localeCompare(b.legacyTable)||
    a.legacyId-b.legacyId||a.sourceBranchKey.localeCompare(b.sourceBranchKey));
  const digest=createHash('sha256').update(JSON.stringify({dataset:i.datasetId,plan})).digest('hex');
  return Object.freeze({mode:'SYNTHETIC_DRY_RUN_ONLY',writes:0,tenantId,businessId,
    count:plan.length,digest,items:Object.freeze(plan)});
}
module.exports={makeSyntheticMapPlan};

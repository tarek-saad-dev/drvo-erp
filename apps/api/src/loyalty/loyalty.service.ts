import {BadRequestException,Injectable,NotFoundException,ServiceUnavailableException} from "@nestjs/common";
import {IdentityService} from "../identity/identity.service";
import type {Actor} from "../identity/identity.service";
import {
 CUT_CLUB_DEFAULT_CONFIG,CUT_CLUB_DEFAULTS_PROVENANCE,LOYALTY_PREVIEW_STATE,MOVEMENT_TYPES,
 REWARD_CATALOG,TIER_CODES,buildRewardsForClient,getNextReward,previewManualAdjustment,
 previewRewardRedemption,previewSaleReversal,validateCutClubConfig,
} from "./loyalty-rules";
import type {SaleLedgerRow} from "./loyalty-rules";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_POSTED={state:LOYALTY_PREVIEW_STATE,persisted:false,
 financialPostingState:"NOT_AUTHORIZED" as const,messagingSend:"NOT_AUTHORIZED" as const};
function strictBody(body:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!body||typeof body!=="object"||Array.isArray(body)||
   Object.keys(body).length!==keys.length||
   keys.some(k=>!Object.prototype.hasOwnProperty.call(body,k)))
  throw new BadRequestException("Unexpected Loyalty fields");
 return body as Record<string,unknown>;
}
/**
 * Loyalty / Cut Club is READ + PREVIEW only. There is no loyalty table, no earn/redeem/adjust
 * write path, no messaging and no new permission: access reuses the existing branch.read grant,
 * and every balance in a request is a hypothetical input, not a stored customer balance.
 */
@Injectable()
export class LoyaltyService {
 constructor(private readonly identity:IdentityService){}
 private async scope(actor:Actor,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_LOYALTY_ENABLED!=="YES")
   throw new ServiceUnavailableException("Loyalty is disabled");
  if(actor.mustChangePassword||!UUID.test(businessId)||!UUID.test(branchId))
   throw new NotFoundException();
  await this.identity.readAuthorizedBranch(actor,businessId,branchId,"branch.read");
 }
 private preview<T>(fn:()=>T):T{
  try{return fn();}catch(e){
   if(e instanceof TypeError)throw new BadRequestException("Invalid Loyalty preview request");
   throw e;
  }
 }
 async config(actor:Actor,businessId:string,branchId:string){
  await this.scope(actor,businessId,branchId);
  return {...NOT_POSTED,tiers:TIER_CODES,movementTypes:MOVEMENT_TYPES,rewards:REWARD_CATALOG,
   cutClubConfig:CUT_CLUB_DEFAULT_CONFIG,cutClubConfigProvenance:CUT_CLUB_DEFAULTS_PROVENANCE,
   earnRule:"NOT_PORTED_CASHIER_SQL_PROCEDURE_NOT_IN_PINNED_SOURCE"};
 }
 async previewRewards(actor:Actor,businessId:string,branchId:string,body:unknown){
  await this.scope(actor,businessId,branchId);
  const d=strictBody(body,["pointsBalance","tierCode"]);
  if(typeof d.tierCode!=="string"||!(TIER_CODES as readonly string[]).includes(d.tierCode)||
   typeof d.pointsBalance!=="number"||!Number.isSafeInteger(d.pointsBalance)||
   d.pointsBalance<0||d.pointsBalance>100000000)
   throw new BadRequestException("Invalid Loyalty preview request");
  const rewards=buildRewardsForClient(d.pointsBalance,d.tierCode);
  return {...NOT_POSTED,rewards,nextReward:getNextReward(rewards)};
 }
 async previewRedeem(actor:Actor,businessId:string,branchId:string,body:unknown){
  await this.scope(actor,businessId,branchId);
  const d=strictBody(body,["pointsBalance","tierCode","rewardId","confirm"]);
  if(typeof d.tierCode!=="string"||!(TIER_CODES as readonly string[]).includes(d.tierCode))
   throw new BadRequestException("Invalid Loyalty preview request");
  return this.preview(()=>previewRewardRedemption(
   d.pointsBalance as number,d.tierCode as string,d.rewardId,d.confirm));
 }
 async previewAdjust(actor:Actor,businessId:string,branchId:string,body:unknown){
  await this.scope(actor,businessId,branchId);
  const d=strictBody(body,["pointsBalance","pointsDelta","notes"]);
  return this.preview(()=>previewManualAdjustment(
   d.pointsBalance as number,d.pointsDelta as number,d.notes));
 }
 async previewReverseSale(actor:Actor,businessId:string,branchId:string,body:unknown){
  await this.scope(actor,businessId,branchId);
  const d=strictBody(body,["pointsBalance","invoiceRows","notes"]);
  if(!Array.isArray(d.invoiceRows)||d.invoiceRows.length>200)
   throw new BadRequestException("Invalid Loyalty preview request");
  const rows:SaleLedgerRow[]=d.invoiceRows.map((raw:unknown)=>
   strictBody(raw,["movementType","pointsDelta"]) as unknown as SaleLedgerRow);
  return this.preview(()=>previewSaleReversal(d.pointsBalance as number,rows,d.notes));
 }
 async validateConfig(actor:Actor,businessId:string,branchId:string,body:unknown){
  await this.scope(actor,businessId,branchId);
  const d=strictBody(body,["cutClubConfig"]);
  const normalized=this.preview(()=>validateCutClubConfig(d.cutClubConfig));
  return {...NOT_POSTED,cutClubConfig:normalized};
 }
}

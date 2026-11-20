import {
  BadRequestException,ConflictException,Injectable,NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

/**
 * CU-04 CRM follow-up desk (SQL034). NON-POSTING and NON-MESSAGING: it lists customers
 * who need staff attention and appends staff-recorded contact attempts. It never sends
 * a message, never creates consent and cannot rank "dormant" customers (that needs
 * posted Sales history = CU-05, BLOCKED).
 */
export const FOLLOW_UP_FILTERS=["ALL","INCOMPLETE","NO_PHONE","NO_CONSENT","HAS_NOTES",
 "FOLLOW_UP_DUE","NEVER_CONTACTED"] as const;
export type FollowUpFilter=typeof FOLLOW_UP_FILTERS[number];
export const CONTACT_CHANNELS=["CALL","WHATSAPP_MANUAL","IN_PERSON","OTHER"] as const;
export const CONTACT_OUTCOMES=["REACHED","NO_ANSWER","WRONG_NUMBER","CALL_BACK_LATER","DECLINED"] as const;
export type ConsentState="NONE"|"ACTIVE"|"REVOKED"|"PHONE_CHANGED";
export type FollowUpReason="FOLLOW_UP_DUE"|"INCOMPLETE_PROFILE"|"PHONE_MISSING"|
 "CONSENT_REVOKED"|"CONSENT_PHONE_CHANGED"|"HAS_NOTES";
export type FollowUpRow={
 customerId:string;displayName:string;phoneE164:string|null;
 phoneMissing:boolean;profileMissing:boolean;incomplete:boolean;
 missing:{birthDate:boolean;address:boolean;source:boolean};
 hasNotes:boolean;consentState:ConsentState;
 lastAttemptAtUtc:string|null;lastChannel:string|null;lastOutcome:string|null;
 followUpDueUtc:string|null;followUpDue:boolean;attemptCount:number;
 reasons:FollowUpReason[];
};
export type FollowUpQueue={
 rows:FollowUpRow[];filter:FollowUpFilter;limit:200;mayBeTruncated:boolean;
 mode:"NONPOSTING_CRM_FOLLOW_UP_ONLY";messagingSent:false;
 dormantEvidence:"UNAVAILABLE_NO_POSTED_SALES";
};
export type ContactAttemptView={
 attemptId:string;channel:string;outcome:string;note:string|null;
 contactedPhoneE164:string|null;followUpDueUtc:string|null;createdAtUtc:string;
 thisBranch:boolean;
};
export type LoggedAttempt={id:string;created:boolean};

const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;
const CONSENT_STATES=["NONE","ACTIVE","REVOKED","PHONE_CHANGED"];
const ATTEMPT_KEYS=["channel","outcome","note","followUpDueUtc"];

@Injectable()
export class CustomerFollowUpService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
     process.env.DRVO_CUSTOMERS_ENABLED!=="YES")
   throw new ServiceUnavailableException("Customers are not enabled");
  if(actor.mustChangePassword||!GUID.test(actor.tenantId)||!GUID.test(actor.accountId)||
     !GUID.test(businessId)||!GUID.test(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private async execute(scope:ReturnType<CustomerFollowUpService["scope"]>,procedure:string,
  extra:(r:sql.Request)=>sql.Request){
  try{
   const request=this.database.getInternalPool().request()
    .input("TenantId",sql.UniqueIdentifier,scope.tenant)
    .input("BusinessId",sql.UniqueIdentifier,scope.business)
    .input("BranchId",sql.UniqueIdentifier,scope.branch)
    .input("AccountId",sql.UniqueIdentifier,scope.account)
    .input("SessionVersion",sql.Int,scope.version)
    .input("TokenHash",sql.Char(64),scope.tokenHash);
   return await extra(request).execute(procedure);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error
    ? Number(error.number):undefined;
   if(code===51131)throw new NotFoundException();
   if(code===51132)throw new BadRequestException("Invalid follow-up request");
   if(code===51133)throw new ConflictException("Request ID used with different data");
   if(code===51134)throw new ConflictException("Contact not permitted without active consent");
   throw new ServiceUnavailableException("Customer follow-up unavailable");
  }
 }
 private iso(value:unknown):string|null{
  if(value==null)return null;
  return value instanceof Date?value.toISOString():new Date(String(value)).toISOString();
 }
 private rowView(row:Record<string,unknown>):FollowUpRow{
  const consent=String(row.consentState);
  if(!CONSENT_STATES.includes(consent))
   throw new ServiceUnavailableException("Customer follow-up unavailable");
  const flag=(key:string)=>Boolean(row[key]);
  const consentState=consent as ConsentState;
  const reasons:FollowUpReason[]=[];
  if(flag("followUpDue"))reasons.push("FOLLOW_UP_DUE");
  if(flag("incomplete"))reasons.push("INCOMPLETE_PROFILE");
  if(flag("phoneMissing"))reasons.push("PHONE_MISSING");
  if(consentState==="REVOKED")reasons.push("CONSENT_REVOKED");
  if(consentState==="PHONE_CHANGED")reasons.push("CONSENT_PHONE_CHANGED");
  if(flag("hasNotes"))reasons.push("HAS_NOTES");
  const text=(v:unknown)=>v==null?null:String(v);
  return {
   customerId:String(row.customerId),displayName:String(row.displayName),
   phoneE164:text(row.phoneE164),phoneMissing:flag("phoneMissing"),
   profileMissing:flag("profileMissing"),incomplete:flag("incomplete"),
   missing:{birthDate:flag("birthDateMissing"),address:flag("addressMissing"),
    source:flag("sourceMissing")},
   hasNotes:flag("hasNotes"),consentState,
   lastAttemptAtUtc:this.iso(row.lastAttemptAtUtc),lastChannel:text(row.lastChannel),
   lastOutcome:text(row.lastOutcome),followUpDueUtc:this.iso(row.followUpDueUtc),
   followUpDue:flag("followUpDue"),attemptCount:Number(row.attemptCount??0),reasons,
  };
 }
 async queue(actor:Actor,token:string,businessId:string,branchId:string,
  filter:unknown):Promise<FollowUpQueue>{
  const scope=this.scope(actor,token,businessId,branchId);
  const chosen=filter===undefined||filter===null||filter===""?"ALL":filter;
  if(typeof chosen!=="string"||!(FOLLOW_UP_FILTERS as readonly string[]).includes(chosen))
   throw new BadRequestException("Invalid follow-up filter");
  const result=await this.execute(scope,"core.ReadCustomerFollowUpQueue",r=>r
   .input("Filter",sql.VarChar(20),chosen));
  const all=(result.recordset??[]).map((row:Record<string,unknown>)=>this.rowView(row));
  const mayBeTruncated=all.length>200;
  return {rows:all.slice(0,200),filter:chosen as FollowUpFilter,limit:200,mayBeTruncated,
   mode:"NONPOSTING_CRM_FOLLOW_UP_ONLY",messagingSent:false,
   dormantEvidence:"UNAVAILABLE_NO_POSTED_SALES"};
 }
 async attempts(actor:Actor,token:string,businessId:string,branchId:string,
  customerId:unknown):Promise<{attempts:ContactAttemptView[]}>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(typeof customerId!=="string"||!GUID.test(customerId))throw new NotFoundException();
  const result=await this.execute(scope,"core.ReadCustomerContactAttempts",r=>r
   .input("CustomerId",sql.UniqueIdentifier,customerId));
  const text=(v:unknown)=>v==null?null:String(v);
  return {attempts:(result.recordset??[]).map((row:Record<string,unknown>)=>({
   attemptId:String(row.attemptId),channel:String(row.channel),outcome:String(row.outcome),
   note:text(row.note),contactedPhoneE164:text(row.contactedPhoneE164),
   followUpDueUtc:this.iso(row.followUpDueUtc),
   createdAtUtc:this.iso(row.createdAtUtc)!,thisBranch:Boolean(row.thisBranch),
  }))};
 }
 /** Append-only, idempotent. Records a staff action; it never sends anything. */
 async logAttempt(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,customerId:unknown,body:unknown):Promise<LoggedAttempt>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(typeof customerId!=="string"||!GUID.test(customerId))throw new NotFoundException();
  if(typeof requestId!=="string"||!GUID.test(requestId))
   throw new BadRequestException("Missing or invalid Idempotency-Key");
  if(!body||typeof body!=="object"||Array.isArray(body))
   throw new BadRequestException("Invalid follow-up request");
  const value=body as Record<string,unknown>;
  if(Object.keys(value).some(key=>!ATTEMPT_KEYS.includes(key))||
     !Object.prototype.hasOwnProperty.call(value,"channel")||
     !Object.prototype.hasOwnProperty.call(value,"outcome"))
   throw new BadRequestException("Invalid follow-up request");
  if(typeof value.channel!=="string"||
     !(CONTACT_CHANNELS as readonly string[]).includes(value.channel)||
     typeof value.outcome!=="string"||
     !(CONTACT_OUTCOMES as readonly string[]).includes(value.outcome))
   throw new BadRequestException("Invalid follow-up request");
  let note:string|null=null;
  if(value.note!==undefined&&value.note!==null){
   if(typeof value.note!=="string")throw new BadRequestException("Invalid follow-up request");
   const text=value.note.normalize("NFKC").trim();
   if(text.length>300||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))
    throw new BadRequestException("Invalid follow-up request");
   note=text.length?text:null;
  }
  let due:Date|null=null;
  if(value.followUpDueUtc!==undefined&&value.followUpDueUtc!==null){
   const raw=value.followUpDueUtc;
   if(typeof raw!=="string"||!ISO.test(raw)||!Number.isFinite(Date.parse(raw))||
      new Date(raw).toISOString()!==raw)
    throw new BadRequestException("Follow-up date must be an exact UTC minute with Z");
   due=new Date(raw);
   if(due.getTime()<=Date.now()||due.getTime()>Date.now()+366*86400000)
    throw new BadRequestException("Follow-up date must be in the future within one year");
  }
  if(value.outcome==="CALL_BACK_LATER"&&due===null)
   throw new BadRequestException("A call-back needs a follow-up date");
  if((value.outcome==="WRONG_NUMBER"||value.outcome==="DECLINED")&&due!==null)
   throw new BadRequestException("This outcome cannot schedule a follow-up");
  const result=await this.execute(scope,"core.LogCustomerContactAttempt",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("CustomerId",sql.UniqueIdentifier,customerId)
   .input("Channel",sql.VarChar(16),value.channel)
   .input("Outcome",sql.VarChar(20),value.outcome)
   .input("Note",sql.NVarChar(300),note)
   .input("FollowUpDueUtc",sql.DateTime2(0),due));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Customer follow-up unavailable");
  return {id:String(row.id),created:Boolean(row.created)};
 }
}

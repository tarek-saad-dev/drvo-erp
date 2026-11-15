import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

/** Count observations belong to Treasury, NOT an actual cash ledger or Accounting. */
export type CashCountDraft={
 countId:string;countedMinor:number;currency:"EGP"|"SAR"|"AED"|"USD";
 note:string;status:"DRAFT"|"CANCELLED";
 createdAtUtc:string;cancelledAtUtc:string|null;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const CURRENCIES=["EGP","SAR","AED","USD"] as const;
const valid=(value:unknown):value is string=>typeof value==="string"&&UUID.test(value);
function strict(body:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!body||typeof body!=="object"||Array.isArray(body)||
   Object.keys(body).length!==keys.length||
   keys.some(k=>!Object.prototype.hasOwnProperty.call(body,k)))
  throw new BadRequestException("Unexpected cash count fields");
 return body as Record<string,unknown>;
}
function uuid(value:unknown):string{
 if(!valid(value))throw new BadRequestException("Invalid request identifier");
 return value;
}
@Injectable()
export class TreasuryService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_TREASURY_COUNTS_ENABLED!=="YES")
   throw new ServiceUnavailableException("Treasury counts disabled");
  if(actor.mustChangePassword||!valid(actor.tenantId)||!valid(actor.accountId)||
     !valid(businessId)||!valid(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   hash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<TreasuryService["scope"]>){
  return this.database.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.hash);
 }
 private async execute(scope:ReturnType<TreasuryService["scope"]>,
   procedure:string,bind?:(request:sql.Request)=>sql.Request){
  try{
   const request=this.request(scope);
   return await (bind?bind(request):request).execute(procedure);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
    Number(error.number):undefined;
   if(code===51481||code===51484)throw new NotFoundException();
   if(code===51482)throw new BadRequestException("Invalid cash count");
   if(code===51483||code===2627||code===2601)
    throw new ConflictException("Cash count conflict");
   throw new ServiceUnavailableException("Treasury cash counts unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string){
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadTreasuryCountDrafts");
  const drafts:CashCountDraft[]=result.recordset.map((r:Record<string,unknown>)=>({
   countId:String(r.countId),countedMinor:Number(r.countedMinor),
   currency:r.currency as CashCountDraft["currency"],note:String(r.note),
   status:r.status as CashCountDraft["status"],
   createdAtUtc:r.createdAtUtc instanceof Date?r.createdAtUtc.toISOString():String(r.createdAtUtc),
   cancelledAtUtc:r.cancelledAtUtc===null?null:
     r.cancelledAtUtc instanceof Date?r.cancelledAtUtc.toISOString():String(r.cancelledAtUtc),
  }));
  if(drafts.some(d=>!valid(d.countId)||!Number.isSafeInteger(d.countedMinor)||
   d.countedMinor<0||d.countedMinor>9000000000000||
   !CURRENCIES.includes(d.currency)||!["DRAFT","CANCELLED"].includes(d.status)))
   throw new ServiceUnavailableException("Invalid count record");
  return {state:"NONPOSTING_PHYSICAL_CASH_COUNTS_ONLY" as const,drafts,
   limit:200,mayBeTruncated:drafts.length===200,
   accountingState:"NOT_POSTED" as const,
   settlementState:"NO_SETTLEMENT" as const,
   balanceState:"NOT_COMPUTED" as const,
   reconciliationState:"NOT_PERFORMED" as const};
 }
 async create(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strict(body,["countedMinor","currency","note"]);
  if(typeof data.countedMinor!=="number"||!Number.isSafeInteger(data.countedMinor)||
    data.countedMinor<0||data.countedMinor>9000000000000||
    typeof data.currency!=="string"||
    !CURRENCIES.includes(data.currency as typeof CURRENCIES[number])||
    typeof data.note!=="string"||data.note.length>240||
    data.note!==data.note.trim())
   throw new BadRequestException("Invalid count amount or currency");
  const result=await this.execute(scope,"core.CreateTreasuryCashCountDraft",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("CountedMinor",sql.BigInt,data.countedMinor)
   .input("Currency",sql.Char(3),data.currency)
   .input("Note",sql.NVarChar(240),data.note));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Cash count not saved");
  return {id:String(row.id),created:Boolean(row.created),
   balanceState:"NOT_COMPUTED" as const,accountingState:"NOT_POSTED" as const};
 }
 async cancel(actor:Actor,token:string,businessId:string,branchId:string,
  countId:unknown,key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  uuid(countId);uuid(key);strict(body,[]);
  const result=await this.execute(scope,"core.CancelTreasuryCashCountDraft",r=>r
   .input("CountId",sql.UniqueIdentifier,countId)
   .input("ClientRequestId",sql.UniqueIdentifier,key));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Cash count not cancelled");
  return {id:String(row.id),changed:Boolean(row.changed),
   balanceState:"NOT_COMPUTED" as const,accountingState:"NOT_POSTED" as const};
 }
}

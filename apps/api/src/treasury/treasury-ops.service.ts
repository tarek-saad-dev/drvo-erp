import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

export type MovementView={
 movementId:string;dayId:string;shiftId:string;
 direction:"IN"|"OUT"|"TRANSFER";amountMinor:number;currency:"EGP"|"SAR"|"AED"|"USD";
 fromRail:"CASH"|"CARD"|"BANK"|"OTHER";toRail:"CASH"|"CARD"|"BANK"|"OTHER";
 note:string;status:"RECORDED"|"CANCELLED";glPostState:"GATED";
 createdAtUtc:string;cancelledAtUtc:string|null;
};
export type ReconView={
 reconId:string;dayId:string;shiftId:string;rail:"CASH"|"CARD"|"BANK"|"OTHER";
 systemMinor:number;countedMinor:number;varianceMinor:number;note:string;
 glPostState:"GATED";createdAtUtc:string;
};
export type TreasuryOpsRead={
 state:"NONPOSTING_TREASURY_MOVEMENTS_AND_RECON_ONLY";
 movements:MovementView[];recons:ReconView[];limit:200;mayBeTruncated:boolean;
 accountingState:"NOT_POSTED";glPostState:"GATED";settlementState:"NO_SETTLEMENT";
 balanceState:"COMPUTED_FROM_MOVEMENTS_ONLY";
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const CURRENCIES=["EGP","SAR","AED","USD"] as const;
const RAILS=["CASH","CARD","BANK","OTHER"] as const;
const DIRS=["IN","OUT","TRANSFER"] as const;
function valid(v:unknown):v is string{return typeof v==="string"&&UUID.test(v);}
function body(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  Object.keys(value).length!==keys.length||
  keys.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))
  throw new BadRequestException("Unexpected treasury ops fields");
 return value as Record<string,unknown>;
}
function iso(value:unknown):string|null{
 if(value===null||value===undefined)return null;
 return value instanceof Date?value.toISOString():String(value);
}
@Injectable()
export class TreasuryOpsService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_TREASURY_OPS_ENABLED!=="YES")
   throw new ServiceUnavailableException("Treasury ops disabled");
  if(actor.mustChangePassword||!valid(actor.tenantId)||!valid(actor.accountId)||
   !valid(businessId)||!valid(branchId)||!TOKEN.test(token)||
   !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   hash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<TreasuryOpsService["scope"]>){
  return this.database.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.hash);
 }
 private async execute(scope:ReturnType<TreasuryOpsService["scope"]>,name:string,
  binder?:(request:sql.Request)=>sql.Request){
  try{
   const req=this.request(scope);
   return await (binder?binder(req):req).execute(name);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
    Number(error.number):undefined;
   if(code===51501||code===51504)throw new NotFoundException();
   if(code===51502)throw new BadRequestException("Invalid treasury movement");
   if(code===51503||code===51505||code===2601||code===2627)
    throw new ConflictException("Treasury ops conflict or closed day/shift");
   throw new ServiceUnavailableException("Treasury ops unavailable");
  }
 }
 private mapMove(row:Record<string,unknown>):MovementView{
  const direction=String(row.direction);
  const status=String(row.status);
  if(!DIRS.includes(direction as typeof DIRS[number])||
   !["RECORDED","CANCELLED"].includes(status)||row.glPostState!=="GATED")
   throw new ServiceUnavailableException("Invalid movement record");
  return {
   movementId:String(row.movementId),dayId:String(row.dayId),shiftId:String(row.shiftId),
   direction:direction as MovementView["direction"],amountMinor:Number(row.amountMinor),
   currency:row.currency as MovementView["currency"],
   fromRail:row.fromRail as MovementView["fromRail"],
   toRail:row.toRail as MovementView["toRail"],note:String(row.note),
   status:status as MovementView["status"],glPostState:"GATED",
   createdAtUtc:iso(row.createdAtUtc)!,cancelledAtUtc:iso(row.cancelledAtUtc),
  };
 }
 private mapRecon(row:Record<string,unknown>):ReconView{
  if(row.glPostState!=="GATED")
   throw new ServiceUnavailableException("Invalid recon record");
  return {
   reconId:String(row.reconId),dayId:String(row.dayId),shiftId:String(row.shiftId),
   rail:row.rail as ReconView["rail"],systemMinor:Number(row.systemMinor),
   countedMinor:Number(row.countedMinor),varianceMinor:Number(row.varianceMinor),
   note:String(row.note),glPostState:"GATED",createdAtUtc:iso(row.createdAtUtc)!,
  };
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<TreasuryOpsRead>{
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadTreasuryCashMovements");
  const sets=result.recordsets as Array<Array<Record<string,unknown>>>;
  const moves=Array.isArray(sets?.[0])?sets[0]:
   (Array.isArray(result.recordset)?result.recordset as Array<Record<string,unknown>>:[]);
  const recons=Array.isArray(sets?.[1])?sets[1]:[];
  const movements=moves.map(row=>this.mapMove(row));
  return {
   state:"NONPOSTING_TREASURY_MOVEMENTS_AND_RECON_ONLY",
   movements,recons:recons.map(row=>this.mapRecon(row)),
   limit:200,mayBeTruncated:movements.length===200,
   accountingState:"NOT_POSTED",glPostState:"GATED",settlementState:"NO_SETTLEMENT",
   balanceState:"COMPUTED_FROM_MOVEMENTS_ONLY",
  };
 }
 async createMovement(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(key))throw new BadRequestException("Invalid Idempotency-Key");
  const data=body(payload,["dayId","shiftId","direction","amountMinor","currency",
   "fromRail","toRail","note"]);
  if(!valid(data.dayId)||!valid(data.shiftId))
   throw new BadRequestException("Invalid day or shift");
  if(typeof data.direction!=="string"||!DIRS.includes(data.direction as typeof DIRS[number]))
   throw new BadRequestException("Invalid direction");
  if(typeof data.amountMinor!=="number"||!Number.isSafeInteger(data.amountMinor)||
   data.amountMinor<1||data.amountMinor>9000000000000)
   throw new BadRequestException("Invalid amount");
  if(typeof data.currency!=="string"||
   !CURRENCIES.includes(data.currency as typeof CURRENCIES[number]))
   throw new BadRequestException("Invalid currency");
  if(typeof data.fromRail!=="string"||typeof data.toRail!=="string"||
   !RAILS.includes(data.fromRail as typeof RAILS[number])||
   !RAILS.includes(data.toRail as typeof RAILS[number]))
   throw new BadRequestException("Invalid rails");
  if(typeof data.note!=="string"||data.note.length>240||data.note!==data.note.trim())
   throw new BadRequestException("Invalid note");
  const result=await this.execute(scope,"core.CreateTreasuryCashMovement",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,key)
   .input("DayId",sql.UniqueIdentifier,data.dayId)
   .input("ShiftId",sql.UniqueIdentifier,data.shiftId)
   .input("Direction",sql.VarChar(10),data.direction)
   .input("AmountMinor",sql.BigInt,data.amountMinor)
   .input("Currency",sql.Char(3),data.currency)
   .input("FromRail",sql.VarChar(16),data.fromRail)
   .input("ToRail",sql.VarChar(16),data.toRail)
   .input("Note",sql.NVarChar(240),data.note));
  const row=result.recordset?.[0];
  if(!row||row.glPostState!=="GATED")
   throw new ServiceUnavailableException("Movement not saved");
  return {id:String(row.id),created:Boolean(row.created),glPostState:"GATED" as const,
   accountingState:"NOT_POSTED" as const};
 }
 async cancelMovement(actor:Actor,token:string,businessId:string,branchId:string,
  movementId:unknown,key:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(movementId)||!valid(key))throw new BadRequestException("Invalid request id");
  body(payload,[]);
  const result=await this.execute(scope,"core.CancelTreasuryCashMovement",r=>r
   .input("MovementId",sql.UniqueIdentifier,movementId)
   .input("ClientRequestId",sql.UniqueIdentifier,key));
  const row=result.recordset?.[0];
  if(!row||row.glPostState!=="GATED")
   throw new ServiceUnavailableException("Movement not cancelled");
  return {id:String(row.id),changed:Boolean(row.changed),glPostState:"GATED" as const,
   accountingState:"NOT_POSTED" as const};
 }
 async createRecon(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(key))throw new BadRequestException("Invalid Idempotency-Key");
  const data=body(payload,["shiftId","rail","countedMinor","note"]);
  if(!valid(data.shiftId))throw new BadRequestException("Invalid shift");
  if(typeof data.rail!=="string"||!RAILS.includes(data.rail as typeof RAILS[number]))
   throw new BadRequestException("Invalid rail");
  if(typeof data.countedMinor!=="number"||!Number.isSafeInteger(data.countedMinor)||
   data.countedMinor<0||data.countedMinor>9000000000000)
   throw new BadRequestException("Invalid counted amount");
  if(typeof data.note!=="string"||data.note.length>240||data.note!==data.note.trim())
   throw new BadRequestException("Invalid note");
  const result=await this.execute(scope,"core.CreateTreasuryShiftRecon",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,key)
   .input("ShiftId",sql.UniqueIdentifier,data.shiftId)
   .input("Rail",sql.VarChar(16),data.rail)
   .input("CountedMinor",sql.BigInt,data.countedMinor)
   .input("Note",sql.NVarChar(240),data.note));
  const row=result.recordset?.[0];
  if(!row||row.glPostState!=="GATED")
   throw new ServiceUnavailableException("Reconciliation not saved");
  return {
   id:String(row.id),created:Boolean(row.created),shiftClosed:Boolean(row.shiftClosed),
   systemMinor:row.systemMinor===undefined?undefined:Number(row.systemMinor),
   countedMinor:row.countedMinor===undefined?undefined:Number(row.countedMinor),
   varianceMinor:row.varianceMinor===undefined?undefined:Number(row.varianceMinor),
   glPostState:"GATED" as const,accountingState:"NOT_POSTED" as const,
   varianceGlState:"GATED" as const,
  };
 }
}

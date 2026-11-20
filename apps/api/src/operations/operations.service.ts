import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";
import {
 evaluateShiftReadiness,planBusinessDay,type BusinessDayAction,type ShiftReadiness,
} from "./ops-policy";
import {previewShiftHandoff} from "../treasury/treasury-readiness-rules";

export type DayView={
 dayId:string;businessDate:string;status:"OPEN"|"CLOSED";
 openedByAccountId:string;openedAtUtc:string;closedAtUtc:string|null;
};
export type ShiftView={
 shiftId:string;dayId:string;actorAccountId:string;status:"OPEN"|"CLOSED";
 openedAtUtc:string;closedAtUtc:string|null;
};
export type OpsRead={
 state:"NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY";
 openDay:DayView|null;shifts:ShiftView[];
 planAction:BusinessDayAction;readiness:ShiftReadiness;
 accountingState:"NOT_POSTED";glPostState:"GATED";
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
function valid(v:unknown):v is string{return typeof v==="string"&&UUID.test(v);}
function body(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  Object.keys(value).length!==keys.length||
  keys.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))
  throw new BadRequestException("Unexpected operations fields");
 return value as Record<string,unknown>;
}
function dateOk(value:unknown):value is string{
 if(typeof value!=="string"||!DATE.test(value))return false;
 const ts=Date.parse(value+"T00:00:00Z");
 return Number.isFinite(ts)&&new Date(ts).toISOString().slice(0,10)===value;
}
function iso(value:unknown):string|null{
 if(value===null||value===undefined)return null;
 return value instanceof Date?value.toISOString():String(value);
}
@Injectable()
export class OperationsService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_OPERATIONS_ENABLED!=="YES")
   throw new ServiceUnavailableException("Operations is not enabled");
  if(actor.mustChangePassword||!valid(actor.tenantId)||!valid(actor.accountId)||
   !valid(businessId)||!valid(branchId)||!TOKEN.test(token)||
   !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<OperationsService["scope"]>){
  return this.database.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.tokenHash);
 }
 private async execute(scope:ReturnType<OperationsService["scope"]>,name:string,
  binder?:(request:sql.Request)=>sql.Request){
  try{
   const req=this.request(scope);
   return await (binder?binder(req):req).execute(name);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
    Number(error.number):undefined;
   if(code===51491||code===51494)throw new NotFoundException();
   if(code===51492)throw new BadRequestException("Invalid operations request");
   if(code===51493||code===51495||code===2601||code===2627)
    throw new ConflictException("Operations conflict or precondition failed");
   throw new ServiceUnavailableException("Operations unavailable");
  }
 }
 private mapDay(row:Record<string,unknown>):DayView{
  const status=String(row.status);
  if(status!=="OPEN"&&status!=="CLOSED")
   throw new ServiceUnavailableException("Invalid day status");
  return {
   dayId:String(row.dayId),businessDate:String(row.businessDate).slice(0,10),
   status,openedByAccountId:String(row.openedByAccountId),
   openedAtUtc:iso(row.openedAtUtc)!,closedAtUtc:iso(row.closedAtUtc),
  };
 }
 private mapShift(row:Record<string,unknown>):ShiftView{
  const status=String(row.status);
  if(status!=="OPEN"&&status!=="CLOSED")
   throw new ServiceUnavailableException("Invalid shift status");
  return {
   shiftId:String(row.shiftId),dayId:String(row.dayId),
   actorAccountId:String(row.actorAccountId),status,
   openedAtUtc:iso(row.openedAtUtc)!,closedAtUtc:iso(row.closedAtUtc),
  };
 }
 private trustedExpectedDate():string{
  // Branch timezone BusinessClock remains OPEN; UTC day is the trusted interim source.
  return new Date().toISOString().slice(0,10);
 }
 async read(actor:Actor,token:string,businessId:string,branchId:string):Promise<OpsRead>{
  const scope=this.scope(actor,token,businessId,branchId);
  const result=await this.execute(scope,"core.ReadOperationsDayShift");
  const sets=result.recordsets as Array<Array<Record<string,unknown>>>;
  const dayRows=Array.isArray(sets?.[0])?sets[0]:
   (Array.isArray(result.recordset)?result.recordset as Array<Record<string,unknown>>:[]);
  const shiftRows=Array.isArray(sets?.[1])?sets[1]:[];
  const openDay=dayRows[0]?this.mapDay(dayRows[0] as Record<string,unknown>):null;
  const shifts=shiftRows.map((row:Record<string,unknown>)=>this.mapShift(row));
  const expected=this.trustedExpectedDate();
  const planAction=planBusinessDay({
   scope:{tenantId:scope.tenant,businessId:scope.business,branchId:scope.branch},
   openDayDate:openDay?.status==="OPEN"?openDay.businessDate:null,
   expectedDate:expected,pastRolloverWindow:true,
  });
  const openShift=shifts.find(s=>s.status==="OPEN"&&s.actorAccountId===scope.account)||null;
  const readiness=evaluateShiftReadiness({
   trustedScope:{tenantId:scope.tenant,businessId:scope.business,branchId:scope.branch},
   trustedActorAccountId:scope.account,trustedExpectedDate:expected,
   day:openDay?{
    scope:{tenantId:scope.tenant,businessId:scope.business,branchId:scope.branch},
    dayId:openDay.dayId,businessDate:openDay.businessDate,status:openDay.status,
   }:null,
   shift:openShift?{
    scope:{tenantId:scope.tenant,businessId:scope.business,branchId:scope.branch},
    shiftId:openShift.shiftId,dayId:openShift.dayId,status:openShift.status,
    actorAccountId:openShift.actorAccountId,
   }:null,
  });
  return {
   state:"NONPOSTING_OPERATIONS_DAY_SHIFT_ONLY",openDay,shifts,planAction,readiness,
   accountingState:"NOT_POSTED",glPostState:"GATED",
  };
 }
 /**
  * NON-POSTING Cashier handoff plan (OPS-03). Reads this branch's day/shift through the existing
  * trusted SQL read; the only caller-supplied fact is a hypothetical "my OPEN shift is on another
  * branch" id, which is reported as unverified. Nothing is closed, opened or moved.
  */
 async previewHandoff(actor:Actor,token:string,businessId:string,branchId:string,
  payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  const data=body(payload,["actorOpenShiftElsewhereBranchId"]);
  const elsewhere=data.actorOpenShiftElsewhereBranchId;
  if(elsewhere!==null&&(!valid(elsewhere)||elsewhere.toLowerCase()===branchId.toLowerCase()))
   throw new BadRequestException("Invalid actorOpenShiftElsewhereBranchId");
  const read=await this.read(actor,token,businessId,branchId);
  let preview;
  try{
   preview=previewShiftHandoff({
    targetBranchId:branchId,targetDayOpen:read.openDay?.status==="OPEN",
    actorHasOpenShiftHere:read.shifts.some(s=>s.status==="OPEN"&&s.actorAccountId===scope.account),
    actorOpenShiftElsewhereBranchId:elsewhere as string|null,
   });
  }catch(error){
   if(error instanceof TypeError)throw new BadRequestException("Invalid handoff preview");
   throw error;
  }
  return {state:"NONPOSTING_OPERATIONS_HANDOFF_PREVIEW" as const,targetBranchId:branchId,
   ...preview,persisted:false as const,accountingState:"NOT_POSTED" as const,
   glPostState:"GATED" as const};
 }
 async openDay(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(requestId))throw new BadRequestException("Invalid Idempotency-Key");
  const data=body(payload,["businessDate"]);
  if(!dateOk(data.businessDate))throw new BadRequestException("Invalid businessDate");
  const expected=this.trustedExpectedDate();
  if(data.businessDate!==expected)
   throw new BadRequestException("businessDate must match trusted expected UTC day");
  const result=await this.execute(scope,"core.OpenBusinessDay",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("BusinessDate",sql.Date,data.businessDate));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Business day not opened");
  return {id:String(row.id),created:Boolean(row.created),
   businessDate:String(row.businessDate).slice(0,10),status:String(row.status),
   accountingState:"NOT_POSTED" as const,glPostState:"GATED" as const};
 }
 async closeDay(actor:Actor,token:string,businessId:string,branchId:string,
  dayId:unknown,requestId:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(dayId)||!valid(requestId))throw new BadRequestException("Invalid request id");
  const data=body(payload,["forceCloseShifts"]);
  if(typeof data.forceCloseShifts!=="boolean")
   throw new BadRequestException("forceCloseShifts required");
  const result=await this.execute(scope,"core.CloseBusinessDay",r=>r
   .input("DayId",sql.UniqueIdentifier,dayId)
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("ForceCloseShifts",sql.Bit,data.forceCloseShifts?1:0));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Business day not closed");
  return {id:String(row.id),changed:Boolean(row.changed),status:String(row.status),
   accountingState:"NOT_POSTED" as const,glPostState:"GATED" as const};
 }
 async openShift(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(requestId))throw new BadRequestException("Invalid Idempotency-Key");
  const data=body(payload,["dayId"]);
  if(!valid(data.dayId))throw new BadRequestException("Invalid dayId");
  const result=await this.execute(scope,"core.OpenOperationalShift",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("DayId",sql.UniqueIdentifier,data.dayId));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Shift not opened");
  return {id:String(row.id),created:Boolean(row.created),dayId:String(row.dayId),
   status:String(row.status),accountingState:"NOT_POSTED" as const,glPostState:"GATED" as const};
 }
 async closeShift(actor:Actor,token:string,businessId:string,branchId:string,
  shiftId:unknown,requestId:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(shiftId)||!valid(requestId))throw new BadRequestException("Invalid request id");
  body(payload,[]);
  const result=await this.execute(scope,"core.CloseOperationalShift",r=>r
   .input("ShiftId",sql.UniqueIdentifier,shiftId)
   .input("ClientRequestId",sql.UniqueIdentifier,requestId));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Shift not closed");
  return {id:String(row.id),changed:Boolean(row.changed),status:String(row.status),
   accountingState:"NOT_POSTED" as const,glPostState:"GATED" as const};
 }
 /**
  * OPS-03 NONPOSTING custody handoff. SQL039 closes any tenant-wide OPEN shift for the actor
  * and opens on the target branch day in one transaction. Soft-gate only — no Treasury/GL.
  * BusinessClock remains UTC interim (no timezone catch-up invented here).
  */
 async handoffShift(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,payload:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(requestId))throw new BadRequestException("Invalid Idempotency-Key");
  const data=body(payload,["dayId","expectedSourceShiftId"]);
  if(!valid(data.dayId))throw new BadRequestException("Invalid dayId");
  const expected=data.expectedSourceShiftId;
  if(expected!==null&&!valid(expected))
   throw new BadRequestException("Invalid expectedSourceShiftId");
  const result=await this.execute(scope,"core.HandoffOperationalShift",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("DayId",sql.UniqueIdentifier,data.dayId)
   .input("ExpectedSourceShiftId",sql.UniqueIdentifier,expected));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Shift handoff failed");
  const outcome=String(row.outcome);
  if(outcome!=="HANDED_OFF"&&outcome!=="FIRST_OPEN_HERE"&&outcome!=="ALREADY_OPEN_HERE"&&
   outcome!=="IDEMPOTENT_REPLAY")
   throw new ServiceUnavailableException("Invalid handoff outcome");
  return {
   id:String(row.id),created:Boolean(row.created),dayId:String(row.dayId),
   status:String(row.status),branchId:String(row.branchId),
   closedShiftId:row.closedShiftId==null?null:String(row.closedShiftId),
   closedBranchId:row.closedBranchId==null?null:String(row.closedBranchId),
   outcome:outcome as "HANDED_OFF"|"FIRST_OPEN_HERE"|"ALREADY_OPEN_HERE"|"IDEMPOTENT_REPLAY",
   accountingState:"NOT_POSTED" as const,glPostState:"GATED" as const,
   financialPostingState:"NOT_AUTHORIZED" as const,
  };
 }
}

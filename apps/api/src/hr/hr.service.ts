import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";
import {
 HR_LEDGER_PREVIEW_STATE,LEDGER_REASONS,buildEmployeeStatements,calculateMtdDayTarget,
 previewAdvanceDisbursement,previewAdvanceRepayment,summarizeBranchLiquidity,
 summarizeLedgerByEmployee,
} from "./ledger-policy";
import type {LedgerEntry,TargetTier} from "./ledger-policy";

// Cashier Employee HR model -> DRVO shared HR; payroll is NOT a posting effect.
export type HrEmployeeView={
 employeeId:string;employeeCode:string;displayName:string;
 employmentType:"full_time"|"part_time"|"freelance";
 payrollMethod:"hourly"|"daily"|"monthly";isActive:boolean;branchActive:boolean;
 isBookable:boolean;resourceId:string|null;resourceName:string|null;
};
export type HrWrite={id:string;created?:boolean;changed?:boolean};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const CODE=/^[A-Z0-9_-]{2,32}$/;
const EMPLOYMENT=["full_time","part_time","freelance"];
const PAYROLL=["hourly","daily","monthly"];
function strictBody(body:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!body||typeof body!=="object"||Array.isArray(body)||
   Object.keys(body).length!==keys.length||
   keys.some(k=>!Object.prototype.hasOwnProperty.call(body,k)))
  throw new BadRequestException("Unexpected HR fields");
 return body as Record<string,unknown>;
}
function requestId(value:unknown){
 if(typeof value!=="string"||!UUID.test(value))
  throw new BadRequestException("Invalid Idempotency-Key");
 return value;
}
@Injectable()
export class HrService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_HR_ENABLED!=="YES")
   throw new ServiceUnavailableException("HR is disabled");
  if(actor.mustChangePassword||!UUID.test(actor.tenantId)||!UUID.test(actor.accountId)||
   !UUID.test(businessId)||!UUID.test(branchId)||!TOKEN.test(token)||
   !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
    throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<HrService["scope"]>){
  return this.database.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.tokenHash);
 }
 private async execute(scope:ReturnType<HrService["scope"]>,procedure:string,
   binder?:(req:sql.Request)=>sql.Request){
  try{
   const req=this.request(scope);
   return await (binder?binder(req):req).execute(procedure);
  }catch(e){
   const code=typeof e==="object"&&e!==null&&"number" in e?Number(e.number):undefined;
   if(code===51181||code===51184)throw new NotFoundException();
   if(code===51182)throw new BadRequestException("Invalid HR request");
   if(code===51183||code===2601||code===2627)throw new ConflictException("HR request conflict");
   throw new ServiceUnavailableException("HR unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string){
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadHrBranchRoster");
  return {employees:result.recordset.map((row:Record<string,unknown>):HrEmployeeView=>({
   employeeId:String(row.employeeId),employeeCode:String(row.employeeCode),
   displayName:String(row.displayName),
   employmentType:row.employmentType as HrEmployeeView["employmentType"],
   payrollMethod:row.payrollMethod as HrEmployeeView["payrollMethod"],
   isActive:Boolean(row.isActive),branchActive:Boolean(row.branchActive),
   isBookable:Boolean(row.isBookable),
   resourceId:row.resourceId===null?null:String(row.resourceId),
   resourceName:row.resourceName===null?null:String(row.resourceName),
  }))};
 }
 async create(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown):Promise<HrWrite>{
  const scope=this.scope(actor,token,businessId,branchId),id=requestId(key);
  const data=strictBody(body,["employeeCode","displayName","employmentType","payrollMethod"]);
  if(typeof data.employeeCode!=="string"||!CODE.test(data.employeeCode)||
   typeof data.displayName!=="string"||data.displayName!==data.displayName.trim()||
   data.displayName.length<1||data.displayName.length>160||
   !EMPLOYMENT.includes(String(data.employmentType))||
   !PAYROLL.includes(String(data.payrollMethod))||
   (data.employmentType==="freelance"&&data.payrollMethod==="monthly"))
   throw new BadRequestException("Invalid Employee");
  const result=await this.execute(scope,"core.CreateHrEmployee",q=>q
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("EmployeeCode",sql.VarChar(32),data.employeeCode)
   .input("DisplayName",sql.NVarChar(160),data.displayName)
   .input("EmploymentType",sql.VarChar(10),data.employmentType)
   .input("PayrollMethod",sql.VarChar(8),data.payrollMethod));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Employee not created");
  return {id:String(row.id),created:Boolean(row.created)};
 }
 async setBarber(actor:Actor,token:string,businessId:string,branchId:string,
  employeeId:unknown,key:unknown,body:unknown):Promise<HrWrite>{
  const scope=this.scope(actor,token,businessId,branchId),id=requestId(key);
  if(typeof employeeId!=="string"||!UUID.test(employeeId))
   throw new BadRequestException("Invalid employee identifier");
  const data=strictBody(body,["resourceId","isBookable"]);
  if(typeof data.isBookable!=="boolean" ||
   (data.resourceId!==null&&(typeof data.resourceId!=="string"||!UUID.test(data.resourceId)))||
   (data.isBookable&&data.resourceId===null))
    throw new BadRequestException("Invalid Barber data");
  const result=await this.execute(scope,"core.SetSalonBarberProfile",q=>q
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("EmployeeId",sql.UniqueIdentifier,employeeId)
   .input("ResourceId",sql.UniqueIdentifier,data.resourceId)
   .input("IsBookable",sql.Bit,data.isBookable));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Barber not configured");
  return {id:String(row.id),changed:Boolean(row.changed)};
 }
 /** Branch/HR permission probe: the roster procedure enforces session + scope in SQL. */
 private async rosterIds(scope:ReturnType<HrService["scope"]>){
  const result=await this.execute(scope,"core.ReadHrBranchRoster");
  return new Set(result.recordset.map((row:Record<string,unknown>)=>
   String(row.employeeId).toLowerCase()));
 }
 private preview<T>(fn:()=>T):T{
  try{return fn();}catch(e){
   if(e instanceof TypeError||e instanceof RangeError)
    throw new BadRequestException("Invalid HR preview request");
   throw e;
  }
 }
 /**
  * Draft/non-posting employee ledger preview (Cashier HR-05/06/07 characterization).
  * Nothing is persisted; no cash, payout, payroll approval or GL effect exists.
  */
 async previewLedger(actor:Actor,token:string,businessId:string,branchId:string,
  body:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  const data=strictBody(body,["entries","proposal"]);
  if(!Array.isArray(data.entries)||data.entries.length>500)
   throw new BadRequestException("Invalid HR preview request");
  const entries:LedgerEntry[]=data.entries.map((raw:unknown)=>{
   const e=strictBody(raw,["employeeId","entryDate","direction","reason","amountMinor"]);
   return e as unknown as LedgerEntry;
  });
  let proposal:{employeeId:string;kind:"advance"|"advance_repayment";amountMinor:number}|null=null;
  if(data.proposal!==null){
   const p=strictBody(data.proposal,["employeeId","kind","amountMinor"]);
   if(typeof p.employeeId!=="string"||!UUID.test(p.employeeId)||
    (p.kind!=="advance"&&p.kind!=="advance_repayment")||typeof p.amountMinor!=="number")
    throw new BadRequestException("Invalid HR preview request");
   proposal={employeeId:p.employeeId.toLowerCase(),kind:p.kind,amountMinor:p.amountMinor};
  }
  const computed=this.preview(()=>({
   summaries:summarizeLedgerByEmployee(entries),statements:buildEmployeeStatements(entries),
  }));
  const roster=await this.rosterIds(scope);
  for(const s of computed.summaries)
   if(!roster.has(s.employeeId))throw new BadRequestException("Invalid HR preview request");
  if(proposal&&!roster.has(proposal.employeeId))
   throw new BadRequestException("Invalid HR preview request");
  let proposalResult:unknown=null;
  if(proposal){
   const p=proposal;
   const balance=computed.summaries.find(s=>s.employeeId===p.employeeId)?.balanceMinor??0;
   proposalResult=this.preview(()=>({employeeId:p.employeeId,kind:p.kind,
    ...(p.kind==="advance"?previewAdvanceDisbursement(balance,p.amountMinor)
     :previewAdvanceRepayment(balance,p.amountMinor))}));
  }
  return {state:HR_LEDGER_PREVIEW_STATE,persisted:false,
   financialPostingState:"NOT_AUTHORIZED" as const,reasons:LEDGER_REASONS,
   employees:computed.summaries,statements:computed.statements,
   liquidity:summarizeBranchLiquidity(computed.summaries),proposal:proposalResult};
 }
 /** Progressive MTD target preview (Cashier employee-target); never writes a ledger row. */
 async previewTarget(actor:Actor,token:string,businessId:string,branchId:string,
  body:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  const data=strictBody(body,["mtdSalesMinor","priorMtdSalesMinor","tiers"]);
  if(!Array.isArray(data.tiers)||data.tiers.length>50)
   throw new BadRequestException("Invalid HR preview request");
  const tiers:TargetTier[]=data.tiers.map((raw:unknown)=>{
   const t=strictBody(raw,["startMinor","rateBp"]);
   return t as unknown as TargetTier;
  });
  const result=this.preview(()=>calculateMtdDayTarget(
   data.mtdSalesMinor as number,data.priorMtdSalesMinor as number,tiers));
  await this.rosterIds(scope);
  return {state:HR_LEDGER_PREVIEW_STATE,persisted:false,
   financialPostingState:"NOT_AUTHORIZED" as const,...result};
 }
}

import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

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
}

import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

// Cashier attendance session concept adapted to DRVO HR Core ownership.
// All timestamps are written by SQL; not a local BusinessDay or payroll record.
export type HrAttendanceRow={
 attendanceId:string;employeeId:string;employeeName:string;
 checkedInAtUtc:string;checkedOutAtUtc:string|null;status:"OPEN"|"CLOSED";
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const valid=(x:unknown):x is string=>typeof x==="string"&&UUID.test(x);
@Injectable()
export class AttendanceService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_HR_ENABLED!=="YES"||
     process.env.DRVO_HR_ATTENDANCE_ENABLED!=="YES")
   throw new ServiceUnavailableException("HR Attendance disabled");
  if(actor.mustChangePassword||!valid(actor.tenantId)||!valid(actor.accountId)||
     !valid(businessId)||!valid(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<AttendanceService["scope"]>){
  return this.database.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.tokenHash);
 }
 private async execute(scope:ReturnType<AttendanceService["scope"]>,name:string,
  binder?:(request:sql.Request)=>sql.Request){
  try{
   const req=this.request(scope);
   return await (binder?binder(req):req).execute(name);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
    Number(error.number):undefined;
   if(code===51181||code===51384)throw new NotFoundException();
   if(code===51382)throw new BadRequestException("Invalid attendance request");
   if(code===51383||code===2601||code===2627)
    throw new ConflictException("Attendance session conflict");
   throw new ServiceUnavailableException("HR Attendance unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string){
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadHrAttendance");
  if(!Array.isArray(result.recordset))throw new ServiceUnavailableException("Attendance missing");
  const sessions:HrAttendanceRow[]=result.recordset.map((r:Record<string,unknown>)=>({
   attendanceId:String(r.attendanceId),employeeId:String(r.employeeId),
   employeeName:String(r.employeeName),
   checkedInAtUtc:r.checkedInAtUtc instanceof Date?r.checkedInAtUtc.toISOString():String(r.checkedInAtUtc),
   checkedOutAtUtc:r.checkedOutAtUtc===null?null:
    r.checkedOutAtUtc instanceof Date?r.checkedOutAtUtc.toISOString():String(r.checkedOutAtUtc),
   status:r.status as HrAttendanceRow["status"],
  }));
  if(sessions.some(s=>!valid(s.attendanceId)||!valid(s.employeeId)||
    !["OPEN","CLOSED"].includes(s.status)))
   throw new ServiceUnavailableException("Invalid attendance records");
  return {state:"UTC_PUNCH_SESSIONS_ONLY" as const,sessions,limit:200,
   mayBeTruncated:sessions.length===200,payrollState:"NOT_CALCULATED" as const,
   businessDayState:"NOT_LINKED" as const};
 }
 async punch(actor:Actor,token:string,businessId:string,branchId:string,key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(key))throw new BadRequestException("Invalid Idempotency-Key");
  if(!body||typeof body!=="object"||Array.isArray(body)||
    Object.keys(body).length!==3)throw new BadRequestException("Unexpected attendance fields");
  const d=body as Record<string,unknown>;
  if(!Object.prototype.hasOwnProperty.call(d,"employeeId")||
     !Object.prototype.hasOwnProperty.call(d,"action")||
     !Object.prototype.hasOwnProperty.call(d,"attendanceId")||
     !valid(d.employeeId)||!["IN","OUT"].includes(String(d.action))||
     (d.action==="IN"&&d.attendanceId!==null)||
     (d.action==="OUT"&&!valid(d.attendanceId)))
   throw new BadRequestException("Invalid attendance punch");
  const result=await this.execute(scope,"core.RecordHrAttendance",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,key)
   .input("EmployeeId",sql.UniqueIdentifier,d.employeeId)
   .input("Action",sql.VarChar(3),d.action)
   .input("AttendanceId",sql.UniqueIdentifier,d.attendanceId));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Attendance not recorded");
  return {id:String(row.id),changed:Boolean(row.changed),
   payrollState:"NOT_CALCULATED" as const,businessDayState:"NOT_LINKED" as const};
 }
}

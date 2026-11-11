import {
  BadRequestException,ConflictException,Injectable,
  NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

export type BookingResourceView={resourceId:string;displayName:string;kind:string;isActive:boolean};
export type AppointmentView={
 bookingId:string;customerId:string;offeringId:string;resourceId:string;
 customerName:string;offeringName:string;resourceName:string;
 startsAtUtc:string;endsAtUtc:string;status:"BOOKED";
};
export type BookingRead={resources:BookingResourceView[];appointments:AppointmentView[]};
export type Created={id:string;created:boolean};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;
function data(value:unknown,fields:string[]):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value))
  throw new BadRequestException("Invalid booking data");
 const obj=value as Record<string,unknown>;
 if(Object.keys(obj).length!==fields.length||
    fields.some(key=>!Object.prototype.hasOwnProperty.call(obj,key)))
  throw new BadRequestException("Unexpected booking fields");
 return obj;
}
function validId(v:unknown):string{
 if(typeof v!=="string"||!GUID.test(v))throw new BadRequestException("Invalid identifier");
 return v;
}
@Injectable()
export class BookingService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
     process.env.DRVO_BOOKING_ENABLED!=="YES")
    throw new ServiceUnavailableException("Booking is not enabled");
  if(actor.mustChangePassword||!GUID.test(actor.tenantId)||!GUID.test(actor.accountId)||
    !GUID.test(businessId)||!GUID.test(branchId)||!TOKEN.test(token)||
    !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
    throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
    account:actor.accountId,version:actor.sessionVersion,
    tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<BookingService["scope"]>){
  return this.database.getInternalPool().request()
    .input("TenantId",sql.UniqueIdentifier,scope.tenant)
    .input("BusinessId",sql.UniqueIdentifier,scope.business)
    .input("BranchId",sql.UniqueIdentifier,scope.branch)
    .input("AccountId",sql.UniqueIdentifier,scope.account)
    .input("SessionVersion",sql.Int,scope.version)
    .input("TokenHash",sql.Char(64),scope.tokenHash);
 }
 private async execute(scope:ReturnType<BookingService["scope"]>,procedure:string,
  extra?:(r:sql.Request)=>sql.Request){
  try{
   const r=this.request(scope);
   return await (extra?extra(r):r).execute(procedure);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error
    ? Number(error.number):undefined;
   if(code===51151)throw new NotFoundException();
   if(code===51152)throw new ConflictException("Idempotency request changed");
   if(code===51153)throw new ConflictException("Resource is already booked");
   if(code===51154)throw new BadRequestException("Invalid booking input or reference");
   throw new ServiceUnavailableException("Booking unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<BookingRead>{
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadBranchBooking");
  // mssql declares recordsets as indexed-or-named; these two SELECTs
  // deliberately return ordered sets from a fixed internal stored procedure.
  const sets=result.recordsets as Array<Array<Record<string,unknown>>>;
  const resources=(sets[0]??[]).map((row:Record<string,unknown>)=>({
   resourceId:String(row.resourceId),displayName:String(row.displayName),
   kind:String(row.kind),isActive:Boolean(row.isActive),
  }));
  const appointments=(sets[1]??[]).map((row:Record<string,unknown>)=>({
   bookingId:String(row.bookingId),customerId:String(row.customerId),
   offeringId:String(row.offeringId),resourceId:String(row.resourceId),
   customerName:String(row.customerName),offeringName:String(row.offeringName),
   resourceName:String(row.resourceName),
   startsAtUtc:new Date(row.startsAtUtc as string|number|Date).toISOString(),
   endsAtUtc:new Date(row.endsAtUtc as string|number|Date).toISOString(),
   status:"BOOKED" as const,
  }));
  return {resources,appointments};
 }
 async addResource(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,body:unknown):Promise<Created>{
  const scope=this.scope(actor,token,businessId,branchId);
  const key=validId(requestId);
  const d=data(body,["displayName","kind"]);
  if(typeof d.displayName!=="string"||d.displayName!==d.displayName.trim()||
    d.displayName.length<1||d.displayName.length>100||
    !["PERSON","ROOM","EQUIPMENT","CHAIR"].includes(String(d.kind)))
    throw new BadRequestException("Invalid resource");
  const result=await this.execute(scope,"core.CreateBookingResource",r=>r
    .input("ClientRequestId",sql.UniqueIdentifier,key)
    .input("DisplayName",sql.NVarChar(100),d.displayName)
    .input("Kind",sql.VarChar(9),d.kind));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Resource creation unavailable");
  return {id:String(row.id),created:Boolean(row.created)};
 }
 async addAppointment(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,body:unknown):Promise<Created>{
  const scope=this.scope(actor,token,businessId,branchId);
  const key=validId(requestId);
  const d=data(body,["customerId","offeringId","resourceId","startsAtUtc"]);
  const customerId=validId(d.customerId),offeringId=validId(d.offeringId),
    resourceId=validId(d.resourceId);
  if(typeof d.startsAtUtc!=="string"||!ISO.test(d.startsAtUtc)||
     !Number.isFinite(Date.parse(d.startsAtUtc))||
     new Date(d.startsAtUtc).toISOString()!==d.startsAtUtc)
    throw new BadRequestException("Start must be exact UTC minute with Z");
  const startsAtUtc=new Date(d.startsAtUtc);
  const result=await this.execute(scope,"core.CreateBookingAppointment",r=>r
    .input("ClientRequestId",sql.UniqueIdentifier,key)
    .input("CustomerId",sql.UniqueIdentifier,customerId)
    .input("OfferingId",sql.UniqueIdentifier,offeringId)
    .input("ResourceId",sql.UniqueIdentifier,resourceId)
    .input("StartsAtUtc",sql.DateTime2(0),startsAtUtc));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Appointment creation unavailable");
  return {id:String(row.id),created:Boolean(row.created)};
 }
}

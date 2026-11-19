import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

// Salon Queue Extension: walk-in + Booking handoff only. No sale/Treasury/GL writes.
export type QueueTicketView={
 ticketId:string;ticketCode:string;customerId:string|null;resourceId:string|null;
 offeringId:string|null;bookingId:string|null;customerName:string;resourceName:string;
 offeringName:string;durationMinutes:number;expectedStartAtUtc:string;expectedEndAtUtc:string;
 status:"WAITING"|"CALLED"|"IN_SERVICE"|"DONE"|"CANCELLED"|"NO_SHOW";
 source:"WALK_IN"|"BOOKING_HANDOFF";createdAtUtc:string;
};
export type QueueRead={
 state:"NONPOSTING_QUEUE_TICKETS_ONLY";tickets:QueueTicketView[];limit:200;
 mayBeTruncated:boolean;treasuryState:"NOT_PAID";accountingState:"NOT_POSTED";
};
export type Created={id:string;created:boolean};
export type StatusChange={id:string;status:QueueTicketView["status"];changed:boolean};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;
const STATUSES=["WAITING","CALLED","IN_SERVICE","DONE","CANCELLED","NO_SHOW"] as const;
function valid(v:unknown):v is string{return typeof v==="string"&&UUID.test(v);}
function body(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  Object.keys(value).length!==keys.length||
  keys.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))
  throw new BadRequestException("Unexpected queue fields");
 return value as Record<string,unknown>;
}
@Injectable()
export class QueueService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_QUEUE_ENABLED!=="YES")
   throw new ServiceUnavailableException("Queue is not enabled");
  if(actor.mustChangePassword||!valid(actor.tenantId)||!valid(actor.accountId)||
   !valid(businessId)||!valid(branchId)||!TOKEN.test(token)||
   !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<QueueService["scope"]>){
  return this.database.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.tokenHash);
 }
 private async execute(scope:ReturnType<QueueService["scope"]>,name:string,
  binder?:(request:sql.Request)=>sql.Request){
  try{
   const req=this.request(scope);
   return await (binder?binder(req):req).execute(name);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
    Number(error.number):undefined;
   if(code===51451||code===51454)throw new NotFoundException();
   if(code===51452)throw new BadRequestException("Invalid queue request");
   if(code===51453||code===51455||code===51456||code===2601||code===2627)
    throw new ConflictException("Queue conflict or final ticket");
   throw new ServiceUnavailableException("Queue unavailable");
  }
 }
 private mapTicket(row:Record<string,unknown>):QueueTicketView{
  const status=String(row.status);
  if(!STATUSES.includes(status as QueueTicketView["status"]))
   throw new ServiceUnavailableException("Invalid queue status");
  return {
   ticketId:String(row.ticketId),ticketCode:String(row.ticketCode),
   customerId:row.customerId?String(row.customerId):null,
   resourceId:row.resourceId?String(row.resourceId):null,
   offeringId:row.offeringId?String(row.offeringId):null,
   bookingId:row.bookingId?String(row.bookingId):null,
   customerName:String(row.customerName??""),resourceName:String(row.resourceName??""),
   offeringName:String(row.offeringName??""),
   durationMinutes:Number(row.durationMinutes),
   expectedStartAtUtc:new Date(row.expectedStartAtUtc as string|number|Date).toISOString(),
   expectedEndAtUtc:new Date(row.expectedEndAtUtc as string|number|Date).toISOString(),
   status:status as QueueTicketView["status"],
   source:row.source==="BOOKING_HANDOFF"?"BOOKING_HANDOFF":"WALK_IN",
   createdAtUtc:new Date(row.createdAtUtc as string|number|Date).toISOString(),
  };
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<QueueRead>{
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadBranchQueue");
  if(!Array.isArray(result.recordset))
   throw new ServiceUnavailableException("Queue data unavailable");
  const tickets=result.recordset.map((row:Record<string,unknown>)=>this.mapTicket(row));
  return {state:"NONPOSTING_QUEUE_TICKETS_ONLY",tickets,limit:200,
   mayBeTruncated:tickets.length===200,treasuryState:"NOT_PAID",
   accountingState:"NOT_POSTED"};
 }
 async createWalkIn(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,payload:unknown):Promise<Created>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(requestId))throw new BadRequestException("Invalid Idempotency-Key");
  const d=body(payload,["customerId","resourceId","offeringId","durationMinutes","expectedStartAtUtc"]);
  const customerId=d.customerId===null?null:valid(d.customerId)?d.customerId:null;
  if(d.customerId!==null&&!valid(d.customerId))
   throw new BadRequestException("Invalid customer");
  if(!valid(d.resourceId))throw new BadRequestException("Invalid resource");
  const offeringId=d.offeringId===null?null:valid(d.offeringId)?d.offeringId:null;
  if(d.offeringId!==null&&!valid(d.offeringId))
   throw new BadRequestException("Invalid offering");
  if(typeof d.durationMinutes!=="number"||!Number.isInteger(d.durationMinutes)||
   d.durationMinutes<5||d.durationMinutes>480)
   throw new BadRequestException("Invalid duration");
  if(typeof d.expectedStartAtUtc!=="string"||!ISO.test(d.expectedStartAtUtc)||
   new Date(d.expectedStartAtUtc).toISOString()!==d.expectedStartAtUtc)
   throw new BadRequestException("Start must be exact UTC minute with Z");
  const startsAtUtc=new Date(d.expectedStartAtUtc);
  const result=await this.execute(scope,"core.CreateQueueTicket",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("CustomerId",sql.UniqueIdentifier,customerId)
   .input("ResourceId",sql.UniqueIdentifier,d.resourceId)
   .input("OfferingId",sql.UniqueIdentifier,offeringId)
   .input("DurationMinutes",sql.Int,d.durationMinutes)
   .input("ExpectedStartAtUtc",sql.DateTime2(0),startsAtUtc));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Queue create unavailable");
  return {id:String(row.id),created:Boolean(row.created)};
 }
 async handoffFromBooking(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,payload:unknown):Promise<Created>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(requestId))throw new BadRequestException("Invalid Idempotency-Key");
  const d=body(payload,["bookingId"]);
  if(!valid(d.bookingId))throw new BadRequestException("Invalid booking");
  const result=await this.execute(scope,"core.CreateQueueTicketFromBooking",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("BookingId",sql.UniqueIdentifier,d.bookingId));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Queue handoff unavailable");
  return {id:String(row.id),created:Boolean(row.created)};
 }
 async changeStatus(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,ticketId:unknown,payload:unknown):Promise<StatusChange>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(!valid(requestId)||!valid(ticketId))
   throw new BadRequestException("Invalid Idempotency-Key or ticket");
  const d=body(payload,["status"]);
  if(typeof d.status!=="string"||!["CALLED","IN_SERVICE","DONE","CANCELLED","NO_SHOW"]
   .includes(d.status))
   throw new BadRequestException("Invalid queue status transition");
  const result=await this.execute(scope,"core.ChangeQueueTicketStatus",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,requestId)
   .input("TicketId",sql.UniqueIdentifier,ticketId)
   .input("TargetStatus",sql.VarChar(12),d.status));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Queue transition unavailable");
  return {id:String(row.id),status:String(row.status) as QueueTicketView["status"],
   changed:Boolean(row.changed)};
 }
}

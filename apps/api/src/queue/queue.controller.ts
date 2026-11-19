import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {QueueService,type Created,type QueueRead,type StatusChange} from "./queue.service";

function enabled():void{
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_QUEUE_ENABLED!=="YES")
  throw new ServiceUnavailableException("Queue is not enabled");
}
function allowedOrigin(origin:string|undefined):void{
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid request origin");
}
@Controller("workspaces/:businessId/branches/:branchId/queue")
export class QueueController {
 constructor(private readonly identity:IdentityService,private readonly queue:QueueService){}
 @Get()
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string
 ):Promise<QueueRead>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.queue.list(actor,token!,businessId,branchId);
 }
 @Post("tickets") @HttpCode(200)
 async create(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown):Promise<Created>{
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.queue.createWalkIn(actor,token!,businessId,branchId,key,body);
 }
 @Post("from-booking") @HttpCode(200)
 async fromBooking(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown):Promise<Created>{
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.queue.handoffFromBooking(actor,token!,businessId,branchId,key,body);
 }
 @Post("tickets/:ticketId/status") @HttpCode(200)
 async changeStatus(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("ticketId") ticketId:string,@Body() body:unknown):Promise<StatusChange>{
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.queue.changeStatus(actor,token!,businessId,branchId,key,ticketId,body);
 }
}

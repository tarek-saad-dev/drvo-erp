import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {OperationsService,type OpsRead} from "./operations.service";

function enabled():void{
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_OPERATIONS_ENABLED!=="YES")
  throw new ServiceUnavailableException("Operations is not enabled");
}
function allowedOrigin(origin:string|undefined):void{
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid request origin");
}
@Controller("workspaces/:businessId/branches/:branchId/operations")
export class OperationsController {
 constructor(private readonly identity:IdentityService,
  private readonly operations:OperationsService){}
 @Get()
 async read(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string
 ):Promise<OpsRead>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.operations.read(actor,token!,businessId,branchId);
 }
 /** Read-only handoff plan. POST only carries the hypothetical elsewhere-branch id. */
 @Post("shift-handoff-preview") @HttpCode(200)
 async previewHandoff(@Headers("origin") origin:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.operations.previewHandoff(actor,token!,businessId,branchId,body);
 }
 @Post("days") @HttpCode(200)
 async openDay(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.operations.openDay(actor,token!,businessId,branchId,key,body);
 }
 @Post("days/:dayId/close") @HttpCode(200)
 async closeDay(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("dayId") dayId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.operations.closeDay(actor,token!,businessId,branchId,dayId,key,body);
 }
 @Post("shifts") @HttpCode(200)
 async openShift(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.operations.openShift(actor,token!,businessId,branchId,key,body);
 }
 @Post("shifts/:shiftId/close") @HttpCode(200)
 async closeShift(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("shiftId") shiftId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.operations.closeShift(actor,token!,businessId,branchId,shiftId,key,body);
 }
 /** Atomic NONPOSTING custody handoff (SQL039). Closes OPEN shift anywhere in tenant, opens here. */
 @Post("shift-handoff") @HttpCode(200)
 async handoffShift(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.operations.handoffShift(actor,token!,businessId,branchId,key,body);
 }
}

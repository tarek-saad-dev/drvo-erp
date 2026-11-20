import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {TreasuryOpsService,type TreasuryOpsRead} from "./treasury-ops.service";

function enabled():void{
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_TREASURY_OPS_ENABLED!=="YES")
  throw new ServiceUnavailableException("Treasury ops disabled");
}
function allowedOrigin(origin:string|undefined):void{
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid Treasury Origin");
}
@Controller("workspaces/:businessId/branches/:branchId/treasury/ops")
export class TreasuryOpsController {
 constructor(private readonly identity:IdentityService,
  private readonly treasury:TreasuryOpsService){}
 @Get()
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string
 ):Promise<TreasuryOpsRead>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.treasury.list(actor,token!,businessId,branchId);
 }
 @Get("day-close-readiness")
 async dayCloseReadiness(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string){
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.treasury.dayCloseReadiness(actor,token!,businessId,branchId);
 }
 /** Read-only filter/rail-total preview. POST only carries the filter body; nothing is written. */
 @Post("movements-preview") @HttpCode(200)
 async previewMovements(@Headers("origin") origin:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.treasury.previewMovements(actor,token!,businessId,branchId,body);
 }
 @Post("movements") @HttpCode(200)
 async createMovement(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.treasury.createMovement(actor,token!,businessId,branchId,key,body);
 }
 @Post("movements/:movementId/cancel") @HttpCode(200)
 async cancelMovement(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("movementId") movementId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.treasury.cancelMovement(actor,token!,businessId,branchId,movementId,key,body);
 }
 @Post("recon") @HttpCode(200)
 async createRecon(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.treasury.createRecon(actor,token!,businessId,branchId,key,body);
 }
}

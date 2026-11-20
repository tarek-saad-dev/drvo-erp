import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {InventoryService,type InventoryWorkspace,type TransferWorkspace} from "./inventory.service";

function enabled():void{
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_INVENTORY_ENABLED!=="YES")
  throw new ServiceUnavailableException("Inventory disabled");
}
function allowedOrigin(origin:string|undefined):void{
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid Inventory Origin");
}
@Controller("workspaces/:businessId/branches/:branchId/inventory")
export class InventoryController {
 constructor(private readonly identity:IdentityService,private readonly inventory:InventoryService){}
 @Get()
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string
 ):Promise<InventoryWorkspace>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.list(actor,token!,businessId,branchId);
 }
 @Post("policy") @HttpCode(200)
 async policy(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.upsertPolicy(actor,token!,businessId,branchId,key,body);
 }
 @Post("receives") @HttpCode(200)
 async receive(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.createReceive(actor,token!,businessId,branchId,key,body);
 }
 @Post("receives/:receiveId/cancel") @HttpCode(200)
 async cancelReceive(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("receiveId") receiveId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.cancelReceive(actor,token!,businessId,branchId,receiveId,key,body);
 }
 @Post("adjusts") @HttpCode(200)
 async adjust(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.createAdjust(actor,token!,businessId,branchId,key,body);
 }
 @Post("adjusts/:adjustId/cancel") @HttpCode(200)
 async cancelAdjust(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("adjustId") adjustId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.cancelAdjust(actor,token!,businessId,branchId,adjustId,key,body);
 }
 @Get("transfers")
 async listTransfers(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string
 ):Promise<TransferWorkspace>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.listTransfers(actor,token!,businessId,branchId);
 }
 @Post("transfers") @HttpCode(200)
 async createTransfer(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.createTransfer(actor,token!,businessId,branchId,key,body);
 }
 @Post("transfers/:transferId/cancel") @HttpCode(200)
 async cancelTransfer(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("transferId") transferId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.inventory.cancelTransfer(actor,token!,businessId,branchId,transferId,key,body);
 }
}

import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {LoyaltyService} from "./loyalty.service";

function enabled(){
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_LOYALTY_ENABLED!=="YES")
  throw new ServiceUnavailableException("Loyalty disabled");
}
function originAllowed(origin:string|undefined){
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid Loyalty Origin");
}
/**
 * Loyalty / Cut Club read + non-posting preview. POST is only the request body carrier:
 * nothing is written, no points move and no message is sent.
 */
@Controller("workspaces/:businessId/branches/:branchId/loyalty")
export class LoyaltyController {
 constructor(private readonly identity:IdentityService,private readonly loyalty:LoyaltyService){}
 @Get("config")
 async config(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string){
  res.setHeader("Cache-Control","no-store");enabled();
  const actor=await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
  return this.loyalty.config(actor,businessId,branchId);
 }
 @Post("rewards-preview") @HttpCode(200)
 async rewards(@Headers("origin") origin:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const actor=await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
  return this.loyalty.previewRewards(actor,businessId,branchId,body);
 }
 @Post("redeem-preview") @HttpCode(200)
 async redeem(@Headers("origin") origin:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const actor=await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
  return this.loyalty.previewRedeem(actor,businessId,branchId,body);
 }
 @Post("adjust-preview") @HttpCode(200)
 async adjust(@Headers("origin") origin:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const actor=await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
  return this.loyalty.previewAdjust(actor,businessId,branchId,body);
 }
 @Post("reverse-sale-preview") @HttpCode(200)
 async reverseSale(@Headers("origin") origin:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const actor=await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
  return this.loyalty.previewReverseSale(actor,businessId,branchId,body);
 }
 @Post("config-validate") @HttpCode(200)
 async validateConfig(@Headers("origin") origin:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const actor=await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
  return this.loyalty.validateConfig(actor,businessId,branchId,body);
 }
}

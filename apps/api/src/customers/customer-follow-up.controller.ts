import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Query,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {
 CustomerFollowUpService,type ContactAttemptView,type FollowUpQueue,type LoggedAttempt,
} from "./customer-follow-up.service";

function enabled():void{
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_CUSTOMERS_ENABLED!=="YES")
  throw new ServiceUnavailableException("Customers are not enabled");
}
function checkOrigin(origin:string|undefined):void{
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid request origin");
}
/** CU-04 non-posting CRM follow-up desk. Nothing here sends a message. */
@Controller("workspaces/:businessId/branches/:branchId/customers")
export class CustomerFollowUpController {
 constructor(private readonly identity:IdentityService,
  private readonly followUp:CustomerFollowUpService){}
 @Get("follow-up")
 async queue(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Query("filter") filter?:string):Promise<FollowUpQueue>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.followUp.queue(actor,token!,businessId,branchId,filter);
 }
 @Get(":customerId/contact-attempts")
 async attempts(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("customerId") customerId:string):Promise<{attempts:ContactAttemptView[]}>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.followUp.attempts(actor,token!,businessId,branchId,customerId);
 }
 @Post(":customerId/contact-attempts") @HttpCode(200)
 async log(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("customerId") customerId:string,
  @Body() body:unknown):Promise<LoggedAttempt>{
  res.setHeader("Cache-Control","no-store");enabled();checkOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.followUp.logAttempt(actor,token!,businessId,branchId,key,customerId,body);
 }
}

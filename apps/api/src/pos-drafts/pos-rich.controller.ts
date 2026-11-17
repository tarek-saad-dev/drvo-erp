import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {PosRichService} from "./pos-rich.service";

function enabled(){
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_POS_DRAFTS_ENABLED!=="YES"||
    process.env.DRVO_CATALOG_ENABLED!=="YES"||
    process.env.DRVO_POS_RICH_ENABLED!=="YES")
  throw new ServiceUnavailableException("Cashier POS drafts disabled");
}
function originAllowed(origin:string|undefined){
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid POS Origin");
}
@Controller("workspaces/:businessId/branches/:branchId/pos-drafts/cashier")
export class PosRichController {
 constructor(private readonly identity:IdentityService,private readonly rich:PosRichService){}
 @Get()
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string){
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.rich.list(actor,token!,businessId,branchId);
 }
 @Post() @HttpCode(200)
 async create(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.rich.create(actor,token!,businessId,branchId,key,body);
 }
}

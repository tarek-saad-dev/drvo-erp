import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {CustomersService,type CustomerView,type CreatedCustomer} from "./customers.service";

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
/** Customer contacts are NOT K5 Account identities. No clinical data. */
@Controller("workspaces/:businessId/branches/:branchId/customers")
export class CustomersController {
 constructor(private readonly identity:IdentityService,
   private readonly customers:CustomersService){}
 @Get()
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
   @Param("businessId") businessId:string,@Param("branchId") branchId:string
 ):Promise<{customers:CustomerView[]}>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return {customers:await this.customers.list(actor,token!,businessId,branchId)};
 }
 @Post()
 @HttpCode(200)
 async create(@Headers("origin") origin:string|undefined,
   @Headers("idempotency-key") key:string|undefined,
   @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
   @Param("businessId") businessId:string,@Param("branchId") branchId:string,
   @Body() body:unknown):Promise<CreatedCustomer>{
  res.setHeader("Cache-Control","no-store");enabled();checkOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.customers.create(actor,token!,businessId,branchId,key,body);
 }
}

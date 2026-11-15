import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {HrService} from "./hr.service";

function enabled(){
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_HR_ENABLED!=="YES")
  throw new ServiceUnavailableException("HR disabled");
}
function originAllowed(origin:string|undefined){
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid HR Origin");
}
/** Employees are BUSINESS records; barber assignment is BRANCH-specific. */
@Controller("workspaces/:businessId/branches/:branchId/hr")
export class HrController {
 constructor(private readonly identity:IdentityService,private readonly hr:HrService){}
 @Get("employees")
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string){
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.hr.list(actor,token!,businessId,branchId);
 }
 @Post("employees") @HttpCode(200)
 async create(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.hr.create(actor,token!,businessId,branchId,key,body);
 }
 @Post("employees/:employeeId/barber") @HttpCode(200)
 async setBarber(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Param("employeeId") employeeId:string,@Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.hr.setBarber(actor,token!,businessId,branchId,employeeId,key,body);
 }
}

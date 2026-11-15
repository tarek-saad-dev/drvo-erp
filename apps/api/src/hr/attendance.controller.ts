import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {AttendanceService} from "./attendance.service";

function enabled(){
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||process.env.DRVO_HR_ENABLED!=="YES"||
    process.env.DRVO_HR_ATTENDANCE_ENABLED!=="YES")
  throw new ServiceUnavailableException("HR Attendance disabled");
}
function originAllowed(origin:string|undefined){
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid Attendance Origin");
}
@Controller("workspaces/:businessId/branches/:branchId/hr/attendance")
export class AttendanceController {
 constructor(private readonly identity:IdentityService,private readonly attendance:AttendanceService){}
 @Get()
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string){
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.attendance.list(actor,token!,businessId,branchId);
 }
 @Post() @HttpCode(200)
 async punch(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown){
  res.setHeader("Cache-Control","no-store");enabled();originAllowed(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.attendance.punch(actor,token!,businessId,branchId,key,body);
 }
}

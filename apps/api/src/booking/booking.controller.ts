import {
 Body,Controller,Get,Headers,HttpCode,Param,Post,Req,Res,
 ServiceUnavailableException,UnauthorizedException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {BookingService,type BookingRead,type Created} from "./booking.service";

function enabled():void{
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_BOOKING_ENABLED!=="YES")
  throw new ServiceUnavailableException("Booking is not enabled");
}
function allowedOrigin(origin:string|undefined):void{
 const expected=process.env.DRVO_K5_ORIGIN;
 if(!expected||!/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected)||origin!==expected)
  throw new UnauthorizedException("Invalid request origin");
}
@Controller("workspaces/:businessId/branches/:branchId/booking")
export class BookingController {
 constructor(private readonly identity:IdentityService,private readonly booking:BookingService){}
 @Get()
 async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string
 ):Promise<BookingRead>{
  res.setHeader("Cache-Control","no-store");enabled();
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.booking.list(actor,token!,businessId,branchId);
 }
 @Post("resources") @HttpCode(200)
 async addResource(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown):Promise<Created>{
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.booking.addResource(actor,token!,businessId,branchId,key,body);
 }
 @Post("appointments") @HttpCode(200)
 async addAppointment(@Headers("origin") origin:string|undefined,
  @Headers("idempotency-key") key:string|undefined,
  @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  @Body() body:unknown):Promise<Created>{
  res.setHeader("Cache-Control","no-store");enabled();allowedOrigin(origin);
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.booking.addAppointment(actor,token!,businessId,branchId,key,body);
 }
}

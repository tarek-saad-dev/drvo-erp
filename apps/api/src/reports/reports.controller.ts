import {
 Controller,Get,Param,Req,Res,ServiceUnavailableException,
} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {ReportsService} from "./reports.service";

/** Read-only analytics; not a Treasury, Sales or GL source of truth. */
@Controller("workspaces/:businessId/branches/:branchId/reports")
export class ReportsController {
 constructor(private readonly identity:IdentityService,private readonly reports:ReportsService){}
 @Get("barber-operations")
 async barberOperations(@Req() req:IncomingMessage,
  @Res({passthrough:true}) res:ServerResponse,
  @Param("businessId") businessId:string,@Param("branchId") branchId:string){
  res.setHeader("Cache-Control","no-store");
  if(process.env.DRVO_REPORTS_ENABLED!=="YES"||process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Reports disabled");
  const token=extractSessionCookie(req.headers.cookie);
  const actor=await this.identity.actorFromToken(token);
  return this.reports.barberOperations(actor,token!,businessId,branchId);
 }
}

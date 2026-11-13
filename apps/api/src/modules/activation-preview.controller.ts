import {Controller,Get,Param,Query,Req,Res,ServiceUnavailableException} from "@nestjs/common";
import type {IncomingMessage,ServerResponse} from "node:http";
import {IdentityService,extractSessionCookie} from "../identity/identity.service";
import {
  ActivationPreviewService,type Sc1UnquotableApiResponse,
} from "./activation-preview.service";

@Controller("workspaces/:businessId/branches/:branchId/modules")
export class ActivationPreviewController {
  constructor(private readonly identity:IdentityService,
    private readonly service:ActivationPreviewService){}
  @Get("activation-preview")
  async preview(
    @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
    @Param("businessId") businessId:string,@Param("branchId") branchId:string,
    @Query("moduleKey") moduleKey:unknown,
  ):Promise<Sc1UnquotableApiResponse>{
    res.setHeader("Cache-Control","no-store");
    if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
       process.env.DRVO_SC1_PREVIEW_READ_ENABLED!=="YES")
      throw new ServiceUnavailableException("Activation preview is not enabled");
    const token=extractSessionCookie(req.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.service.preview(actor,businessId,branchId,moduleKey);
  }
}

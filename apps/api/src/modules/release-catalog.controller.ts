import {
  Controller, Get, Param, Req, Res, ServiceUnavailableException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { IdentityService, extractSessionCookie } from "../identity/identity.service";
import { ReleaseCatalogService } from "./release-catalog.service";

@Controller("workspaces/:businessId/branches/:branchId/modules")
export class ReleaseCatalogController {
  constructor(
    private readonly identity:IdentityService,
    private readonly catalog:ReleaseCatalogService,
  ) {}
  @Get("releases")
  async list(
    @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
    @Param("businessId") businessId:string,@Param("branchId") branchId:string,
  ):Promise<{releases:readonly never[];status:"NO_VERIFIED_RELEASES"}>{
    res.setHeader("Cache-Control","no-store");
    if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
      process.env.DRVO_SC0_RELEASE_READ_ENABLED!=="YES")
      throw new ServiceUnavailableException("Module releases are not enabled");
    const token=extractSessionCookie(req.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.catalog.list(actor,businessId,branchId);
  }
}

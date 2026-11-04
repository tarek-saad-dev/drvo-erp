import {
  Body, Controller, Get, Headers, HttpCode, Param, Post, Req, Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { IdentityService, extractSessionCookie } from "./identity.service";
import { BranchInvitationService } from "./branch-invitation.service";

function strictOrigin(origin:string|undefined):void {
  const expected=process.env.DRVO_K5_ORIGIN;
  if (!expected || !/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected) ||
      origin!==expected) {
    throw new UnauthorizedException("Invalid invitation request");
  }
}

@Controller("workspaces/:businessId/branches/:branchId/access")
export class BranchInvitationController {
  constructor(
    private readonly identity:IdentityService,
    private readonly service:BranchInvitationService,
  ) {}

  @Post("invitations")
  @HttpCode(202)
  async issue(
    @Headers("origin") origin:string|undefined,
    @Req() request:IncomingMessage,
    @Res({passthrough:true}) response:ServerResponse,
    @Param("businessId") businessId:string,
    @Param("branchId") branchId:string,
    @Body() body:unknown,
  ):Promise<{accepted:true}> {
    response.setHeader("Cache-Control","no-store");
    response.setHeader("Referrer-Policy","no-referrer");
    strictOrigin(origin);
    const payload=body && typeof body==="object" && !Array.isArray(body)
      ? body as Record<string,unknown> : {};
    if (Object.keys(payload).length!==2 ||
        typeof payload.email!=="string" ||
        typeof payload.roleId!=="string") {
      throw new UnauthorizedException("Invalid invitation request");
    }
    const token=extractSessionCookie(request.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.service.issue(
      actor,token!,businessId,branchId,payload.email,payload.roleId);
  }

  @Get("invitations")
  async list(
    @Req() request:IncomingMessage,
    @Res({passthrough:true}) response:ServerResponse,
    @Param("businessId") businessId:string,
    @Param("branchId") branchId:string,
  ) {
    response.setHeader("Cache-Control","no-store");
    const token=extractSessionCookie(request.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.service.list(actor,token!,businessId,branchId);
  }

  @Post("invitations/:invitationId/revoke")
  @HttpCode(200)
  async revoke(
    @Headers("origin") origin:string|undefined,
    @Req() request:IncomingMessage,
    @Res({passthrough:true}) response:ServerResponse,
    @Param("businessId") businessId:string,
    @Param("branchId") branchId:string,
    @Param("invitationId") invitationId:string,
    @Body() body:unknown,
  ) {
    response.setHeader("Cache-Control","no-store");
    strictOrigin(origin);
    if (body!==undefined && (body===null || typeof body!=="object" ||
        Array.isArray(body) || Object.keys(body).length!==0)) {
      throw new UnauthorizedException("Invalid invitation request");
    }
    const token=extractSessionCookie(request.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.service.revoke(actor,token!,businessId,branchId,invitationId);
  }

}

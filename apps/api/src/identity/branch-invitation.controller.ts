import {
  Body, Controller, Headers, HttpCode, Param, Post, Req, Res,
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
}

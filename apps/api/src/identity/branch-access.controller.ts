import {
  Body, Controller, Get, Headers, HttpCode, Param, Post, Req, Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { BranchAccessService, MemberView, RoleView } from "./branch-access.service";
import { IdentityService, extractSessionCookie } from "./identity.service";

function requireExactOrigin(origin: string | undefined): void {
  const expected = process.env.DRVO_K5_ORIGIN;
  if (!expected || !/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected) ||
      origin !== expected) throw new UnauthorizedException("Invalid request origin");
}

@Controller("workspaces/:businessId/branches/:branchId/access")
export class BranchAccessController {
  constructor(
    private readonly service: BranchAccessService,
    private readonly identity: IdentityService,
  ) {}

  @Get("roles")
  async roles(
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
    @Param("businessId") businessId: string,
    @Param("branchId") branchId: string,
  ): Promise<{ roles: RoleView[] }> {
    res.setHeader("Cache-Control", "no-store");
    const actor = await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
    return { roles: await this.service.listRoles(actor, businessId, branchId) };
  }

  @Get("members")
  async members(
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
    @Param("businessId") businessId: string,
    @Param("branchId") branchId: string,
  ): Promise<{ members: MemberView[] }> {
    res.setHeader("Cache-Control", "no-store");
    const actor = await this.identity.actorFromToken(extractSessionCookie(req.headers.cookie));
    return { members: await this.service.listMembers(actor, businessId, branchId) };
  }

  @Post("members/:accountId/role")
  @HttpCode(200)
  async assign(
    @Headers("origin") origin: string | undefined,
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
    @Param("businessId") businessId: string,
    @Param("branchId") branchId: string,
    @Param("accountId") accountId: string,
    @Body() body: unknown,
  ): Promise<{ ok: true; changed: boolean; changeId: string | null }> {
    res.setHeader("Cache-Control", "no-store");
    requireExactOrigin(origin);
    const token = extractSessionCookie(req.headers.cookie);
    const actor = await this.identity.actorFromToken(token);
    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    // The body must not contain tenantId, businessId, branchId, actorId or
    // arbitrary permission data. Only a known RoleId can be requested.
    if (Object.keys(payload).length !== 1 || typeof payload.roleId !== "string") {
      throw new UnauthorizedException("Invalid role assignment");
    }
    return this.service.assignExistingMemberRole(actor, businessId, branchId, accountId, payload.roleId, token!);
  }
}

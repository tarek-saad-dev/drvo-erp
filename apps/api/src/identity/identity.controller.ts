import {
  Body, Controller, Get, Headers, HttpCode, NotFoundException,
  Param, Post, Req, Res, UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { IdentityService, extractSessionCookie, K5_COOKIE_NAME } from "./identity.service";

const SESSION_COOKIE = K5_COOKIE_NAME + "=";
const COOKIE_ATTRS = "; Path=/; Secure; HttpOnly; SameSite=Strict";

function checkOrigin(origin: string | undefined): void {
  const allowed = process.env.DRVO_K5_ORIGIN;
  if (!allowed || !/^https:\/\/[a-zA-Z0-9.-]+$/.test(allowed) ||
      origin !== allowed) throw new UnauthorizedException("Invalid request origin");
}

function parseCookie(req: IncomingMessage): string | null {
  return extractSessionCookie(req.headers.cookie);
}

@Controller("auth")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Headers("origin") origin: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ ok: true; mustChangePassword: boolean }> {
    checkOrigin(origin);
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const { token, actor } = await this.identity.login(input.username, input.password);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", SESSION_COOKIE + token + COOKIE_ATTRS + "; Max-Age=43200");
    return { ok: true, mustChangePassword: actor.mustChangePassword };
  }

  @Get("me")
  async me(@Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse):
    Promise<{ accountId: string; tenantId: string; username: string; mustChangePassword: boolean }> {
    res.setHeader("Cache-Control", "no-store");
    const actor = await this.identity.actorFromToken(parseCookie(req));
    return {
      accountId: actor.accountId,
      tenantId: actor.tenantId,
      username: actor.username,
      mustChangePassword: actor.mustChangePassword,
    };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Headers("origin") origin: string | undefined,
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ ok: true }> {
    checkOrigin(origin);
    await this.identity.logout(parseCookie(req));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", SESSION_COOKIE + COOKIE_ATTRS + "; Max-Age=0");
    return { ok: true };
  }

  @Post("change-password")
  @HttpCode(200)
  async changePassword(
    @Headers("origin") origin: string | undefined,
    @Req() req: IncomingMessage,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ ok: true; reauthenticationRequired: true }> {
    checkOrigin(origin);
    const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
    await this.identity.changePassword(parseCookie(req), input.currentPassword, input.newPassword);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Set-Cookie", SESSION_COOKIE + COOKIE_ATTRS + "; Max-Age=0");
    return { ok: true, reauthenticationRequired: true };
  }
}

/** Intentionally one read-only, role-checked Business/Branch API as an E2E proof. */
@Controller("workspaces/:businessId/branches")
export class AuthorizedBranchController {
  constructor(private readonly identity: IdentityService) {}

  @Get(":branchId")
  async readBranch(
    @Req() req: IncomingMessage,
    @Param("businessId") businessId: string,
    @Param("branchId") branchId: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ tenantId: string; businessId: string; branchId: string; branchName: string }> {
    res.setHeader("Cache-Control", "no-store");
    const actor = await this.identity.actorFromToken(parseCookie(req));
    if (actor.mustChangePassword) throw new NotFoundException();
    return this.identity.readAuthorizedBranch(actor, businessId, branchId, "branch.read");
  }
}

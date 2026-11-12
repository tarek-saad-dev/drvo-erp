import {
  Body, Controller, Get, Headers, HttpCode, Param, Post, Req, Res,
  ServiceUnavailableException, UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { IdentityService, extractSessionCookie } from "../identity/identity.service";
import { PosPreviewService } from "./pos-preview.service";

function enabled(): void {
  if (process.env.DRVO_K5_AUTH_ENABLED !== "YES" ||
      process.env.DRVO_CATALOG_ENABLED !== "YES" ||
      process.env.DRVO_POS_PREVIEW_ENABLED !== "YES") {
    throw new ServiceUnavailableException("POS preview is not enabled");
  }
}
function originAllowed(origin: string | undefined): void {
  const expected = process.env.DRVO_K5_ORIGIN;
  if (!expected || !/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected) || origin !== expected) {
    throw new UnauthorizedException("Invalid preview origin");
  }
}

@Controller("workspaces/:businessId/branches/:branchId/pos-preview")
export class PosPreviewController {
  constructor(private readonly identity: IdentityService, private readonly preview: PosPreviewService) {}

  @Get()
  async offerings(@Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse,
    @Param("businessId") businessId: string, @Param("branchId") branchId: string) {
    res.setHeader("Cache-Control", "no-store");
    enabled();
    const token = extractSessionCookie(req.headers.cookie);
    const actor = await this.identity.actorFromToken(token);
    return this.preview.offerings(actor, token!, businessId, branchId);
  }

  @Post("checkout-preview") @HttpCode(200)
  async checkout(@Headers("origin") origin: string | undefined,
    @Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse,
    @Param("businessId") businessId: string, @Param("branchId") branchId: string,
    @Body() body: unknown) {
    res.setHeader("Cache-Control", "no-store");
    enabled(); originAllowed(origin);
    const token = extractSessionCookie(req.headers.cookie);
    const actor = await this.identity.actorFromToken(token);
    return this.preview.checkout(actor, token!, businessId, branchId, body);
  }
}

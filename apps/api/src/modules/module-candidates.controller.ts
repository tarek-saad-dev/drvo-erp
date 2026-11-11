import {
  Controller, Get, Param, Req, Res, ServiceUnavailableException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  IdentityService, extractSessionCookie,
} from "../identity/identity.service";
import {
  ModuleCandidatesService, type BusinessModuleCandidate,
} from "./module-candidates.service";

/** Explicitly gated, session-only, read-only API; no public catalog. */
@Controller("workspaces/:businessId/branches/:branchId/modules")
export class ModuleCandidatesController {
  constructor(
    private readonly identity: IdentityService,
    private readonly candidates: ModuleCandidatesService,
  ) {}

  @Get("candidates")
  async list(
    @Req() req: IncomingMessage,
    @Res({ passthrough: true }) res: ServerResponse,
    @Param("businessId") businessId: string,
    @Param("branchId") branchId: string,
  ): Promise<{ candidates: BusinessModuleCandidate[] }> {
    res.setHeader("Cache-Control", "no-store");
    if (process.env.DRVO_K5_AUTH_ENABLED !== "YES" ||
        process.env.DRVO_K6C_CATALOG_READ_ENABLED !== "YES") {
      throw new ServiceUnavailableException("Module candidates are not enabled");
    }
    const token = extractSessionCookie(req.headers.cookie);
    const actor = await this.identity.actorFromToken(token);
    // Only the server-side verified actor is permitted to carry Tenant scope.
    return {
      candidates: await this.candidates.read(actor, token!, businessId, branchId),
    };
  }
}

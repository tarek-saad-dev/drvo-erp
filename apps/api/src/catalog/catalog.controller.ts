import {
  Body, Controller, Get, Headers, HttpCode, Param, Post, Req, Res,
  ServiceUnavailableException, UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { IdentityService, extractSessionCookie } from "../identity/identity.service";
import { CatalogService, type CatalogCreateResult, type CatalogData } from "./catalog.service";

function enabled(): void {
  if (process.env.DRVO_K5_AUTH_ENABLED!=="YES" ||
      process.env.DRVO_CATALOG_ENABLED!=="YES") {
    throw new ServiceUnavailableException("Catalog is not enabled");
  }
}
function originAllowed(origin: string | undefined): void {
  const expected=process.env.DRVO_K5_ORIGIN;
  if (!expected || !/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected) || origin!==expected) {
    throw new UnauthorizedException("Invalid request origin");
  }
}

/** New shared Catalog domain. This path never changes module activation/entitlements. */
@Controller("workspaces/:businessId/branches/:branchId/catalog")
export class CatalogController {
  constructor(private readonly identity:IdentityService,private readonly catalog:CatalogService) {}

  @Get()
  async list(@Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
    @Param("businessId") businessId:string,@Param("branchId") branchId:string
  ):Promise<CatalogData> {
    res.setHeader("Cache-Control","no-store");
    enabled();
    const token=extractSessionCookie(req.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.catalog.list(actor,token!,businessId,branchId);
  }

  @Post("categories")
  @HttpCode(200)
  async addCategory(
    @Headers("origin") origin:string|undefined,
    @Headers("idempotency-key") requestId:string|undefined,
    @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
    @Param("businessId") businessId:string,@Param("branchId") branchId:string,
    @Body() body:unknown,
  ):Promise<CatalogCreateResult> {
    res.setHeader("Cache-Control","no-store");
    enabled();originAllowed(origin);
    const token=extractSessionCookie(req.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.catalog.addCategory(actor,token!,businessId,branchId,requestId,body);
  }

  @Post("offerings")
  @HttpCode(200)
  async addOffering(
    @Headers("origin") origin:string|undefined,
    @Headers("idempotency-key") requestId:string|undefined,
    @Req() req:IncomingMessage,@Res({passthrough:true}) res:ServerResponse,
    @Param("businessId") businessId:string,@Param("branchId") branchId:string,
    @Body() body:unknown,
  ):Promise<CatalogCreateResult> {
    res.setHeader("Cache-Control","no-store");
    enabled();originAllowed(origin);
    const token=extractSessionCookie(req.headers.cookie);
    const actor=await this.identity.actorFromToken(token);
    return this.catalog.addOffering(actor,token!,businessId,branchId,requestId,body);
  }
}

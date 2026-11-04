import {
  Body, Controller, Headers, HttpCode, Post, Req, Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { OwnerVerificationService } from "./owner-verification.service";

function requireSameOrigin(origin: string | undefined, type: string | undefined): void {
  const expected = process.env.DRVO_K5_ORIGIN;
  if (!expected || !/^https:\/\/[a-zA-Z0-9.-]+$/.test(expected) ||
      origin !== expected ||
      !type || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type)) {
    throw new UnauthorizedException("Invalid verification request");
  }
}

/**
 * Activation intentionally requires three independent flags.
 * No public signup, operator approval, invitation or recovery endpoint exists.
 */
@Controller("auth")
export class OwnerVerificationController {
  constructor(private readonly service: OwnerVerificationService) {}

  @Post("verify-email")
  @HttpCode(200)
  async redeem(
    @Headers("origin") origin: string | undefined,
    @Headers("content-type") contentType: string | undefined,
    @Req() request: IncomingMessage,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<{ verified: true }> {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    requireSameOrigin(origin, contentType);
    return this.service.complete(body, request);
  }
}

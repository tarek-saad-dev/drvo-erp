import { Controller, Get } from "@nestjs/common";

export interface HealthResponse {
  readonly status: "ok";
  readonly service: "drvo-api";
  readonly mode: "scaffold";
}

/**
 * Liveness only. Does not certify database availability, security,
 * tenant isolation, payment or worker readiness.
 */
@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return { status: "ok", service: "drvo-api", mode: "scaffold" };
  }
}

import { Controller, Get } from "@nestjs/common";
import { FoundationDatabaseService } from "./foundation-database.service";

/** No user data, IDs, SQL server names, credentials, or administrative actions. */
@Controller("health/db")
export class DatabaseHealthController {
  constructor(private readonly database: FoundationDatabaseService) {}

  @Get()
  getHealth(): Promise<{ readonly status: "ok"; readonly service: "drvo-api"; readonly database: "ready" }> {
    return this.database.checkReadiness();
  }
}

import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { K3ScopeProofController } from "./k3-scope-proof.controller";
import { K3ScopeProofRepository } from "./k3-scope-proof.repository";
import { DatabaseHealthController } from "./data/database-health.controller";
import { FoundationDatabaseService } from "./data/foundation-database.service";

@Module({
  controllers: [HealthController, DatabaseHealthController, K3ScopeProofController],
  providers: [FoundationDatabaseService, K3ScopeProofRepository],
})
export class AppModule {}

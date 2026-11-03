import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { K3ScopeProofController } from "./k3-scope-proof.controller";
import { K3ScopeProofRepository } from "./k3-scope-proof.repository";
import { DatabaseHealthController } from "./data/database-health.controller";
import { FoundationDatabaseService } from "./data/foundation-database.service";
import { IdentityService } from "./identity/identity.service";
import { IdentityController, AuthorizedBranchController } from "./identity/identity.controller";

@Module({
  controllers: [HealthController, DatabaseHealthController, K3ScopeProofController,
    IdentityController, AuthorizedBranchController],
  providers: [FoundationDatabaseService, K3ScopeProofRepository, IdentityService],
})
export class AppModule {}

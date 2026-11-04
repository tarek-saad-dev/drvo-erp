import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { K3ScopeProofController } from "./k3-scope-proof.controller";
import { K3ScopeProofRepository } from "./k3-scope-proof.repository";
import { DatabaseHealthController } from "./data/database-health.controller";
import { FoundationDatabaseService } from "./data/foundation-database.service";
import { IdentityService } from "./identity/identity.service";
import { IdentityController, AuthorizedBranchController } from "./identity/identity.controller";
import { BranchAccessService } from "./identity/branch-access.service";
import { BranchAccessController } from "./identity/branch-access.controller";
import { OwnerVerificationController } from "./identity/owner-verification.controller";
import { OwnerVerificationService } from "./identity/owner-verification.service";
import { BranchInvitationService } from "./identity/branch-invitation.service";
import { BranchInvitationController } from "./identity/branch-invitation.controller";

@Module({
  controllers: [HealthController, DatabaseHealthController, K3ScopeProofController,
    IdentityController, AuthorizedBranchController, BranchAccessController,
    OwnerVerificationController, BranchInvitationController],
  providers: [FoundationDatabaseService, K3ScopeProofRepository, IdentityService, BranchAccessService,
    OwnerVerificationService, BranchInvitationService],
})
export class AppModule {}

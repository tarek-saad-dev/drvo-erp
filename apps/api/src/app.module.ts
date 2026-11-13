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
import { ModuleCandidatesController } from "./modules/module-candidates.controller";
import { ModuleCandidatesService } from "./modules/module-candidates.service";
import { ReleaseCatalogService } from "./modules/release-catalog.service";
import { ReleaseCatalogController } from "./modules/release-catalog.controller";
import { ActivationPreviewService } from "./modules/activation-preview.service";
import { ActivationPreviewController } from "./modules/activation-preview.controller";
import { CatalogController } from "./catalog/catalog.controller";
import { CatalogService } from "./catalog/catalog.service";
import { CustomersController } from "./customers/customers.controller";
import { CustomersService } from "./customers/customers.service";
import { BookingController } from "./booking/booking.controller";
import { BookingService } from "./booking/booking.service";
import { PosPreviewController } from "./pos-preview/pos-preview.controller";
import { PosPreviewService } from "./pos-preview/pos-preview.service";
import { PosDraftsController } from "./pos-drafts/pos-drafts.controller";
import { PosDraftsService } from "./pos-drafts/pos-drafts.service";

@Module({
  controllers: [HealthController, DatabaseHealthController, K3ScopeProofController,
    IdentityController, AuthorizedBranchController, BranchAccessController,
    OwnerVerificationController, BranchInvitationController, ModuleCandidatesController, ReleaseCatalogController, ActivationPreviewController, CatalogController, CustomersController, BookingController, PosPreviewController, PosDraftsController],
  providers: [FoundationDatabaseService, K3ScopeProofRepository, IdentityService, BranchAccessService,
    OwnerVerificationService, BranchInvitationService, ModuleCandidatesService, ReleaseCatalogService, ActivationPreviewService, CatalogService, CustomersService, BookingService, PosPreviewService, PosDraftsService],
})
export class AppModule {}

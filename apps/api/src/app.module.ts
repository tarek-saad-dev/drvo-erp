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
import { QueueController } from "./queue/queue.controller";
import { QueueService } from "./queue/queue.service";
import { PosPreviewController } from "./pos-preview/pos-preview.controller";
import { PosPreviewService } from "./pos-preview/pos-preview.service";
import { PosDraftsController } from "./pos-drafts/pos-drafts.controller";
import { PosDraftsService } from "./pos-drafts/pos-drafts.service";
import { PosRichController } from "./pos-drafts/pos-rich.controller";
import { PosRichService } from "./pos-drafts/pos-rich.service";
import { HrController } from "./hr/hr.controller";
import { HrService } from "./hr/hr.service";
import { AttendanceController } from "./hr/attendance.controller";
import { AttendanceService } from "./hr/attendance.service";
import { ReportsController } from "./reports/reports.controller";
import { ReportsService } from "./reports/reports.service";
import { ExpensesController } from "./expenses/expenses.controller";
import { ExpensesService } from "./expenses/expenses.service";
import { OtherIncomeController } from "./other-income/other-income.controller";
import { OtherIncomeService } from "./other-income/other-income.service";
import { InventoryController } from "./inventory/inventory.controller";
import { InventoryService } from "./inventory/inventory.service";
import { TreasuryController } from "./treasury/treasury.controller";
import { TreasuryService } from "./treasury/treasury.service";
import { TreasuryOpsController } from "./treasury/treasury-ops.controller";
import { TreasuryOpsService } from "./treasury/treasury-ops.service";
import { OperationsController } from "./operations/operations.controller";
import { OperationsService } from "./operations/operations.service";

@Module({
  controllers: [HealthController, DatabaseHealthController, K3ScopeProofController,
    IdentityController, AuthorizedBranchController, BranchAccessController,
    OwnerVerificationController, BranchInvitationController, ModuleCandidatesController, ReleaseCatalogController, ActivationPreviewController, CatalogController, CustomersController, BookingController, QueueController, PosPreviewController, PosDraftsController, PosRichController, HrController, AttendanceController, ReportsController, ExpensesController, OtherIncomeController, InventoryController, TreasuryController, TreasuryOpsController, OperationsController],
  providers: [FoundationDatabaseService, K3ScopeProofRepository, IdentityService, BranchAccessService,
    OwnerVerificationService, BranchInvitationService, ModuleCandidatesService, ReleaseCatalogService, ActivationPreviewService, CatalogService, CustomersService, BookingService, QueueService, PosPreviewService, PosDraftsService, PosRichService, HrService, AttendanceService, ReportsService, ExpensesService, OtherIncomeService, InventoryService, TreasuryService, TreasuryOpsService, OperationsService],
})
export class AppModule {}

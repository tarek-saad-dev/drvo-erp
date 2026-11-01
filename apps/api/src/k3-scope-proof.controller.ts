import { Controller, Get, NotFoundException, Param, Req, UseGuards } from "@nestjs/common";
import { K3ProofGuard, type K3ProofRequest } from "./k3-proof.guard";
import { K3ScopeProofRepository, type K3AuthorizedBranch } from "./k3-scope-proof.repository";

/**
 * Narrow read-only scope proof. Deliberately no real login/signup/finance/ERP
 * endpoints. Production and missing proof environments fail closed.
 */
@Controller("k3/businesses/:businessId/branches")
@UseGuards(K3ProofGuard)
export class K3ScopeProofController {
  constructor(private readonly repo: K3ScopeProofRepository) {}

  @Get(":branchId")
  async readBranch(
    @Req() request: K3ProofRequest,
    @Param("businessId") businessId: string,
    @Param("branchId") branchId: string,
  ): Promise<K3AuthorizedBranch> {
    const actor = request.k3Actor;
    if (!actor) throw new NotFoundException();
    const branch = await this.repo.readBranch(actor, businessId, branchId);
    if (!branch) throw new NotFoundException();
    return branch;
  }
}

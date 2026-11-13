import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { Actor } from "../identity/identity.service";
import { IdentityService } from "../identity/identity.service";

/**
 * SC-0 private read-only release-evidence probe.
 * Deliberately advertises NO releases until actual reviewed immutable release
 * evidence, trusted signer/eligibility source and deploy verification exist.
 * K6C candidates and K6B fixture records MUST NEVER become public releases.
 */
@Injectable()
export class ReleaseCatalogService {
  constructor(private readonly identity: IdentityService) {}

  async list(actor:Actor,businessId:string,branchId:string):Promise<{
    releases: readonly never[];
    status:"NO_VERIFIED_RELEASES";
  }> {
    if (process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
        process.env.DRVO_SC0_RELEASE_READ_ENABLED!=="YES") {
      throw new ServiceUnavailableException("Module releases are not enabled");
    }
    if (actor.mustChangePassword) throw new NotFoundException();
    // This verifies the server-trusted actor's current scoped Business/Branch
    // membership and exact branch.read action using current SQL state.
    await this.identity.readAuthorizedBranch(actor,businessId,branchId,"branch.read");
    // Never accept a country/industry from URL/client as verified Business
    // eligibility; SQL Business currently has NO trusted market release facts.
    // Until separately approved evidence exists, this result stays empty.
    return {releases:[],status:"NO_VERIFIED_RELEASES"};
  }
}

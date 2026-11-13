import {
  BadRequestException, Injectable, NotFoundException, ServiceUnavailableException,
} from "@nestjs/common";
import type {Actor} from "../identity/identity.service";
import {IdentityService} from "../identity/identity.service";

export type Sc1UnquotableApiResponse = {
  status:"UNQUOTABLE";
  moduleKey:string;
  approvable:false;
  /** No quote, amount, entitlement or activation state exists. */
  reasonCodes:readonly [
    "NO_VERIFIED_RELEASES",
    "BUSINESS_MARKET_UNVERIFIED",
    "PRICES_NOT_APPROVED",
    "BUSINESS_ACTIVATION_STATE_UNVERIFIED",
  ];
};

/**
 * SC-1 READ ONLY. The independently authoritative Business market, release
 * attestation, price list, revision and entitlements do not exist yet.
 * Never accept client-asserted market/price/active state, or compute live quotes.
 */
@Injectable()
export class ActivationPreviewService {
  constructor(private readonly identity:IdentityService){}
  async preview(
    actor:Actor,businessId:string,branchId:string,moduleKey:unknown,
  ):Promise<Sc1UnquotableApiResponse>{
    if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
       process.env.DRVO_SC1_PREVIEW_READ_ENABLED!=="YES"){
      throw new ServiceUnavailableException("Activation preview is not enabled");
    }
    if(actor.mustChangePassword)throw new NotFoundException();
    // A scoped authorization check (not a release/approval/entitlement).
    await this.identity.readAuthorizedBranch(actor,businessId,branchId,"branch.read");
    if(typeof moduleKey!=="string"||
       !/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(moduleKey))
      throw new BadRequestException("Invalid Module key");
    return {
      status:"UNQUOTABLE",
      moduleKey,
      approvable:false,
      reasonCodes:[
        "NO_VERIFIED_RELEASES",
        "BUSINESS_MARKET_UNVERIFIED",
        "PRICES_NOT_APPROVED",
        "BUSINESS_ACTIVATION_STATE_UNVERIFIED",
      ],
    };
  }
}

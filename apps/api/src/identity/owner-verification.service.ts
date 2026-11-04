import {
  Injectable, ServiceUnavailableException, UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage } from "node:http";
import { FoundationDatabaseService } from "../data/foundation-database.service";
import { claimApprovedOwner } from "./owner-bootstrap";
import { BranchInvitationService } from "./branch-invitation.service";
import { normalizeVerificationEmail } from "./verification-crypto";
import {
  consumeVerificationAttempt, trustedClientAddress,
} from "./owner-verification-throttle";

function invalidProof(): never {
  // No account/email/approval existence enumeration through API errors.
  throw new UnauthorizedException("Verification link invalid or expired");
}

@Injectable()
export class OwnerVerificationService {
  constructor(
    private readonly database: FoundationDatabaseService,
    private readonly invitations: BranchInvitationService,
  ) {}

  async complete(input: unknown, request: IncomingMessage): Promise<{ verified: true }> {
    if (process.env.DRVO_K5_VERIFY_API_ENABLED !== "YES" ||
        process.env.DRVO_K5_AUTH_ENABLED !== "YES") {
      throw new ServiceUnavailableException("Verification not enabled");
    }

    const pool = this.database.getInternalPool();
    const ip = trustedClientAddress(request, process.env);
    // Count every POST from the caller, including malformed attempts.
    // IP address never enters SQL or logs: only keyed HMAC pseudonyms.
    let email: string | null = null;
    const body = input && typeof input === "object" && !Array.isArray(input)
      ? input as Record<string, unknown> : {};
    try {
      email = normalizeVerificationEmail(body.email);
    } catch { /* Throttle by IP even for an invalid email. */ }
    await consumeVerificationAttempt(
      pool, ip, email, process.env.DRVO_K5_VERIFICATION_HMAC_KEY,
    );

    const purpose = body.purpose;
    if (purpose === "ACCOUNT_INVITE") {
      if (process.env.DRVO_K5_INVITATIONS_ENABLED !== "YES") {
        throw new ServiceUnavailableException("Invitations not enabled");
      }
      if (Object.keys(body).length !== 5 ||
          typeof body.token !== "string" || !email ||
          typeof body.newPassword !== "string" ||
          typeof body.username !== "string") invalidProof();
      return this.invitations.accept({
        email,token:body.token,username:body.username,
        newPassword:body.newPassword,
      });
    }

    if (purpose !== "OWNER_BOOTSTRAP" ||
        process.env.DRVO_K5_OWNER_BOOTSTRAP_ENABLED !== "YES") {
      throw new ServiceUnavailableException("Owner bootstrap not enabled");
    }
    if (Object.keys(body).length !== 4 ||
        typeof body.token !== "string" ||
        !email || typeof body.newPassword !== "string" ||
        body.newPassword.length < 12 || body.newPassword.length > 256) {
      invalidProof();
    }

    // Only an approved Owner can be provisioned; no client-created Tenant.
    await claimApprovedOwner(pool, {
      email, token:body.token,newPassword:body.newPassword,
    }, process.env);
    return { verified: true };
  }
}

import {
  Injectable, ServiceUnavailableException, UnauthorizedException,
} from "@nestjs/common";
import type { IncomingMessage } from "node:http";
import { FoundationDatabaseService } from "../data/foundation-database.service";
import { claimApprovedOwner } from "./owner-bootstrap";
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
  constructor(private readonly database: FoundationDatabaseService) {}

  async complete(input: unknown, request: IncomingMessage): Promise<{ verified: true }> {
    if (process.env.DRVO_K5_VERIFY_API_ENABLED !== "YES" ||
        process.env.DRVO_K5_OWNER_BOOTSTRAP_ENABLED !== "YES" ||
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

    if (Object.keys(body).length !== 4 ||
        typeof body.token !== "string" ||
        typeof body.purpose !== "string" ||
        body.purpose !== "OWNER_BOOTSTRAP" ||
        !email || typeof body.newPassword !== "string" ||
        body.newPassword.length < 12 || body.newPassword.length > 256) {
      invalidProof();
    }

    // The existing restricted SQL procedure re-checks current, unexpired,
    // operator-approved email proof inside one SERIALIZABLE transaction.
    // No Actor/Tenant/Role is inferred from any client-supplied field.
    await claimApprovedOwner(pool, {
      email,
      token: body.token,
      newPassword: body.newPassword,
    }, process.env);
    return { verified: true };
  }
}

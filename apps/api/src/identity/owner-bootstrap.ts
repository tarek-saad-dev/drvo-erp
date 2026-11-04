import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import * as sql from "mssql";
import { hashNewPassword } from "./password";
import {
  loadVerificationSecret, verificationEmailDigest, verificationTokenDigest,
} from "./verification-crypto";

export type ApprovedOwnerClaim = {
  email: unknown;
  token: unknown;
  newPassword: unknown;
};

export type ProvisionedOwner = {
  tenantId: string;
  businessId: string;
  branchId: string;
  accountId: string;
};

function genericInvalid(): never {
  throw new UnauthorizedException("Verification link invalid or expired");
}

/**
 * INTERNAL and default-off. This primitive does not create approvals, mail,
 * routes, SQL logins or roles outside the approved initial business scope.
 * SQL permission elevation is confined inside the reviewed ClaimApprovedOwner
 * procedure. The normal API principal has EXECUTE-only, not direct table DML.
 * Migration 005 must be applied separately by the authorized operator.
 */
export async function claimApprovedOwner(
  pool: sql.ConnectionPool,
  input: ApprovedOwnerClaim,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ProvisionedOwner> {
  if (env.DRVO_K5_OWNER_BOOTSTRAP_ENABLED !== "YES" ||
      env.DRVO_K5_AUTH_ENABLED !== "YES") {
    throw new ServiceUnavailableException("Owner bootstrap is not enabled");
  }

  let emailHash: string;
  let tokenHash: string;
  try {
    const key = loadVerificationSecret(env.DRVO_K5_VERIFICATION_HMAC_KEY);
    emailHash = verificationEmailDigest(input.email, key);
    tokenHash = verificationTokenDigest(input.token, "OWNER_BOOTSTRAP", key);
  } catch {
    genericInvalid();
  }

  // Never hold SQL locks while doing expensive password hashing.
  let password: Awaited<ReturnType<typeof hashNewPassword>>;
  try {
    password = await hashNewPassword(input.newPassword as string);
  } catch {
    genericInvalid();
  }

  const ids: ProvisionedOwner = {
    tenantId: randomUUID(), businessId: randomUUID(),
    branchId: randomUUID(), accountId: randomUUID(),
  };
  const roles = {
    owner: randomUUID(), manager: randomUUID(),
    staff: randomUUID(), viewer: randomUUID(),
  };
  try {
    // Only a purpose-bound, unexpired, operator-approved challenge can
    // pass this procedure's SERIALIZABLE transaction. Ordinary app credentials
    // cannot read/write onboarding/Account/Business tables directly.
    await pool.request()
      .input("EmailHash", sql.Char(64), emailHash)
      .input("TokenHash", sql.Char(64), tokenHash)
      .input("TenantId", sql.UniqueIdentifier, ids.tenantId)
      .input("BusinessId", sql.UniqueIdentifier, ids.businessId)
      .input("BranchId", sql.UniqueIdentifier, ids.branchId)
      .input("AccountId", sql.UniqueIdentifier, ids.accountId)
      .input("OwnerRoleId", sql.UniqueIdentifier, roles.owner)
      .input("ManagerRoleId", sql.UniqueIdentifier, roles.manager)
      .input("StaffRoleId", sql.UniqueIdentifier, roles.staff)
      .input("ViewerRoleId", sql.UniqueIdentifier, roles.viewer)
      .input("Salt", sql.VarBinary(32), password.salt)
      .input("PasswordHash", sql.VarBinary(64), password.passwordHash)
      .execute("core.ClaimApprovedOwner");
    return ids;
  } catch {
    // Never expose constraint details, existing usernames or token digests.
    genericInvalid();
  }
}

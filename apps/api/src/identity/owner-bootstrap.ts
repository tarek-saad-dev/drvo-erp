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

type ApprovalRow = {
  approvalId: string;
  challengeId: string;
  username: string;
  tenantName: string;
  businessName: string;
  branchName: string;
};

function genericInvalid(): never {
  // Do not reveal whether the email, approval or challenge exists.
  throw new UnauthorizedException("Verification link invalid or expired");
}

/**
 * An INTERNAL, default-off atomic K5D Owner claim primitive.
 *
 * No HTTP route calls this function and the regular staging app principal has
 * NO permissions to read/write K5D onboarding tables or create accounts.
 * This is NOT an invitation, signup, token-issuing or operator-approval API.
 *
 * A separately authenticated operator must have approved a specific username,
 * email and initial display names; a cryptographically bound email challenge
 * must have been issued AFTER that approval. Password is never persisted raw.
 * All structural records, role seeds, challenge use and approval consumption
 * commit together or roll back together. Replayed tokens never create accounts.
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

  // Keep scrypt outside the SQL transaction, before locking any approved rows.
  let password: Awaited<ReturnType<typeof hashNewPassword>>;
  try {
    password = await hashNewPassword(input.newPassword as string);
  } catch {
    genericInvalid();
  }

  const ids: ProvisionedOwner = {
    tenantId: randomUUID(),
    businessId: randomUUID(),
    branchId: randomUUID(),
    accountId: randomUUID(),
  };
  const roles = {
    owner: randomUUID(),
    manager: randomUUID(),
    staff: randomUUID(),
    viewer: randomUUID(),
  };

  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    // Lock both approval and email challenge. A challenge created before the
    // operator approval cannot authorize a subsequent replacement approval.
    const result = await tx.request()
      .input("emailHash", sql.Char(64), emailHash)
      .input("tokenHash", sql.Char(64), tokenHash)
      .query(`
        SELECT TOP(1)
          CONVERT(VARCHAR(36),a.ApprovalId) AS approvalId,
          CONVERT(VARCHAR(36),c.ChallengeId) AS challengeId,
          a.ApprovedUsername AS username,
          a.TenantDisplayName AS tenantName,
          a.BusinessDisplayName AS businessName,
          a.BranchDisplayName AS branchName
        FROM core.OwnerBootstrapApproval a WITH (UPDLOCK,HOLDLOCK)
        INNER JOIN core.EmailVerificationChallenge c WITH (UPDLOCK,HOLDLOCK)
          ON c.EmailHash=a.ApprovedEmailHash
          AND c.Purpose='OWNER_BOOTSTRAP'
          AND c.TokenHash=@tokenHash
          AND c.CreatedAtUtc >= a.ApprovedAtUtc
        WHERE a.ApprovedEmailHash=@emailHash
          AND a.RevokedAtUtc IS NULL AND a.ConsumedAtUtc IS NULL
          AND a.ExpiresAtUtc>SYSUTCDATETIME()
          AND c.ConsumedAtUtc IS NULL AND c.ExpiresAtUtc>SYSUTCDATETIME()
          AND c.AttemptCount<10
          AND NOT EXISTS (
            SELECT 1 FROM core.VerifiedAccountEmail existing WITH (HOLDLOCK)
            WHERE existing.EmailHash=@emailHash
          )
        ORDER BY c.CreatedAtUtc DESC
      `);
    if (result.recordset.length !== 1) genericInvalid();
    const approval = result.recordset[0] as ApprovalRow;

    await tx.request()
      .input("t", sql.UniqueIdentifier, ids.tenantId)
      .input("b", sql.UniqueIdentifier, ids.businessId)
      .input("br", sql.UniqueIdentifier, ids.branchId)
      .input("a", sql.UniqueIdentifier, ids.accountId)
      .input("ownerRole", sql.UniqueIdentifier, roles.owner)
      .input("managerRole", sql.UniqueIdentifier, roles.manager)
      .input("staffRole", sql.UniqueIdentifier, roles.staff)
      .input("viewerRole", sql.UniqueIdentifier, roles.viewer)
      .input("username", sql.NVarChar(80), approval.username)
      .input("tenantName", sql.NVarChar(160), approval.tenantName)
      .input("businessName", sql.NVarChar(160), approval.businessName)
      .input("branchName", sql.NVarChar(160), approval.branchName)
      .input("salt", sql.VarBinary(32), password.salt)
      .input("passwordHash", sql.VarBinary(64), password.passwordHash)
      .input("approvalId", sql.UniqueIdentifier, approval.approvalId)
      .input("challengeId", sql.UniqueIdentifier, approval.challengeId)
      .input("emailHash", sql.Char(64), emailHash)
      .query(`
        INSERT INTO core.Tenant(TenantId,DisplayName)
          VALUES(@t,@tenantName);
        INSERT INTO core.Business(TenantId,BusinessId,DisplayName)
          VALUES(@t,@b,@businessName);
        INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName)
          VALUES(@t,@b,@br,@branchName);
        INSERT INTO core.Account(TenantId,AccountId,Username)
          VALUES(@t,@a,@username);
        INSERT INTO core.AccountCredential
          (TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)
          VALUES(@t,@a,@salt,@passwordHash,'scrypt-v1',0);
        INSERT INTO core.BusinessMembership(TenantId,BusinessId,AccountId)
          VALUES(@t,@b,@a);
        INSERT INTO core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId)
          VALUES(@t,@b,@br,@a);

        INSERT INTO core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)
          VALUES
            (@t,@b,@ownerRole,N'OWNER',N'Owner'),
            (@t,@b,@managerRole,N'MANAGER',N'Manager'),
            (@t,@b,@staffRole,N'STAFF',N'Staff'),
            (@t,@b,@viewerRole,N'VIEWER',N'Viewer');
        INSERT INTO core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)
          VALUES
            (@t,@b,@ownerRole,'branch.read'),
            (@t,@b,@ownerRole,'users.read'),
            (@t,@b,@ownerRole,'users.assign_role'),
            (@t,@b,@managerRole,'branch.read'),
            (@t,@b,@managerRole,'users.read'),
            (@t,@b,@staffRole,'branch.read'),
            (@t,@b,@viewerRole,'branch.read');
        INSERT INTO core.BranchRole
          (TenantId,BusinessId,BranchId,AccountId,RoleId)
          VALUES(@t,@b,@br,@a,@ownerRole);
        INSERT INTO core.VerifiedAccountEmail(TenantId,AccountId,EmailHash)
          VALUES(@t,@a,@emailHash);

        UPDATE core.EmailVerificationChallenge
          SET ConsumedAtUtc=SYSUTCDATETIME()
          WHERE ChallengeId=@challengeId AND EmailHash=@emailHash
            AND ConsumedAtUtc IS NULL AND ExpiresAtUtc>SYSUTCDATETIME()
            AND Purpose='OWNER_BOOTSTRAP' AND AttemptCount<10;
        IF @@ROWCOUNT <> 1 THROW 51061,'Challenge is not redeemable',1;

        UPDATE core.OwnerBootstrapApproval
          SET ConsumedAtUtc=SYSUTCDATETIME(),ConsumedTenantId=@t,ConsumedAccountId=@a
          WHERE ApprovalId=@approvalId AND ApprovedEmailHash=@emailHash
            AND ConsumedAtUtc IS NULL AND RevokedAtUtc IS NULL
            AND ExpiresAtUtc>SYSUTCDATETIME();
        IF @@ROWCOUNT <> 1 THROW 51062,'Approval is not redeemable',1;

        INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
          VALUES(@t,@a,'owner.bootstrap');
      `);
    await tx.commit();
    return ids;
  } catch (error) {
    await tx.rollback().catch(() => {});
    // SQL errors including uniqueness violations must not disclose existing
    // usernames, email digests, approval names or other tenant details.
    if (error instanceof ServiceUnavailableException) throw error;
    genericInvalid();
  }
}

import { createHmac, randomUUID } from "node:crypto";
import * as sql from "mssql";
import {
  generateOpaqueVerificationToken, loadVerificationSecret,
  normalizeVerificationEmail, verificationEmailDigest,
  verificationTokenDigest,
} from "./verification-crypto";

const USERNAME = /^[a-zA-Z0-9._-]{3,80}$/;
const OPERATOR = /^[a-zA-Z0-9._-]{3,80}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export type OperatorApprovalRequest = {
  email: string;
  username: string;
  tenantName: string;
  businessName: string;
  branchName: string;
  operatorId: string;
};

export type IssuedOwnerApproval = {
  approvalId: string;
  challengeId: string;
  email: string;
  token: string;
  purpose: "OWNER_BOOTSTRAP";
};

function validName(raw: unknown): string {
  if (typeof raw !== "string" || CONTROL_CHARS.test(raw)) {
    throw new Error("Invalid Owner approval details");
  }
  const name = raw.trim();
  if (name.length < 1 || name.length > 160) {
    throw new Error("Invalid Owner approval details");
  }
  return name;
}

export function normalizeOperatorApproval(input: OperatorApprovalRequest): OperatorApprovalRequest {
  if (!input || typeof input !== "object" ||
      typeof input.username !== "string" || !USERNAME.test(input.username) ||
      typeof input.operatorId !== "string" || !OPERATOR.test(input.operatorId)) {
    throw new Error("Invalid Owner approval details");
  }
  return {
    email: normalizeVerificationEmail(input.email),
    username: input.username.toLowerCase(),
    operatorId: input.operatorId.toLowerCase(),
    tenantName: validName(input.tenantName),
    businessName: validName(input.businessName),
    branchName: validName(input.branchName),
  };
}

/**
 * TRUSTED OPERATOR USE ONLY. This function must never be registered in NestJS
 * or exposed through a public API. The pool must be a separately authenticated,
 * database-scoped SQL migrator account, NOT the staging application SQL user.
 *
 * Approval and first challenge are inserted in one SERIALIZABLE transaction.
 * The plain-text email and 256-bit token are ONLY returned to the calling
 * root-only operator process for the optional transactional mail adapter;
 * neither is written to SQL or stdout.
 */
export async function issueOperatorApprovedOwner(
  pool: sql.ConnectionPool,
  input: OperatorApprovalRequest,
  hmacSecret: string,
): Promise<IssuedOwnerApproval> {
  const approved = normalizeOperatorApproval(input);
  const secret = loadVerificationSecret(hmacSecret);
  const emailHash = verificationEmailDigest(approved.email, secret);
  const operatorHash = createHmac("sha256", secret)
    .update("drvo-erp:k5d:operator-id\0" + approved.operatorId)
    .digest("hex");
  const token = generateOpaqueVerificationToken();
  const tokenHash = verificationTokenDigest(token, "OWNER_BOOTSTRAP", secret);
  const approvalId = randomUUID();
  const challengeId = randomUUID();

  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    // No privileged or unapproved Owner ever originates from the first person
    // to register. A separate local operator must approve the identity.
    const check = await tx.request()
      .input("email", sql.Char(64), emailHash)
      .input("username", sql.NVarChar(80), approved.username)
      .query(`
        SELECT CASE WHEN
          EXISTS(SELECT 1 FROM core.OwnerBootstrapApproval WITH (UPDLOCK,HOLDLOCK)
             WHERE (ApprovedEmailHash=@email OR ApprovedUsername=@username)
               AND RevokedAtUtc IS NULL AND ConsumedAtUtc IS NULL)
          OR EXISTS(SELECT 1 FROM core.VerifiedAccountEmail WITH (UPDLOCK,HOLDLOCK)
             WHERE EmailHash=@email)
          OR EXISTS(SELECT 1 FROM core.Account WITH (UPDLOCK,HOLDLOCK)
             WHERE Username=@username)
        THEN 1 ELSE 0 END AS Duplicate
      `);
    if (Number(check.recordset[0]?.Duplicate) !== 0) {
      throw new Error("Owner already approved or registered");
    }

    await tx.request()
      .input("approval", sql.UniqueIdentifier, approvalId)
      .input("challenge", sql.UniqueIdentifier, challengeId)
      .input("emailHash", sql.Char(64), emailHash)
      .input("tokenHash", sql.Char(64), tokenHash)
      .input("operatorHash", sql.Char(64), operatorHash)
      .input("username", sql.NVarChar(80), approved.username)
      .input("tenant", sql.NVarChar(160), approved.tenantName)
      .input("business", sql.NVarChar(160), approved.businessName)
      .input("branch", sql.NVarChar(160), approved.branchName)
      .query(`
        DECLARE @approvedAt DATETIME2(3)=SYSUTCDATETIME();
        INSERT INTO core.OwnerBootstrapApproval
          (ApprovalId,ApprovedUsername,ApprovedEmailHash,TenantDisplayName,
           BusinessDisplayName,BranchDisplayName,ApprovedAtUtc,ExpiresAtUtc)
        VALUES
          (@approval,@username,@emailHash,@tenant,@business,@branch,@approvedAt,
           DATEADD(HOUR,24,@approvedAt));

        INSERT INTO core.EmailVerificationChallenge
          (ChallengeId,EmailHash,TokenHash,Purpose,CreatedAtUtc,ExpiresAtUtc)
        VALUES
          (@challenge,@emailHash,@tokenHash,'OWNER_BOOTSTRAP',
           DATEADD(MILLISECOND,1,@approvedAt),
           DATEADD(MINUTE,30,@approvedAt));

        INSERT INTO core.OwnerApprovalOperatorAudit(ApprovalId,OperatorHash)
          VALUES(@approval,@operatorHash);
        INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
          VALUES(NULL,NULL,'owner.approval.issued');
      `);
    await tx.commit();
    return {approvalId,challengeId,email:approved.email,token,
      purpose:"OWNER_BOOTSTRAP"};
  } catch (error) {
    await tx.rollback().catch(() => {});
    throw error;
  }
}


const GUID_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type OperatorOwnerRevocation = {
  approvalId: string;
  email: string;
  operatorId: string;
  reasonCode: "MAIL_FAILED" | "REISSUE" | "OPERATOR_REVOKE";
};

/**
 * Root-only operator recovery path for an UNSPENT approval. Revoking an
 * approval is NOT deleting an existing Owner or granting any new access.
 * The first-Owner claim procedure and this path both lock the approval
 * in SERIALIZABLE transactions, so a claim and revoke cannot both win.
 */
export async function revokeOperatorApprovedOwner(
  pool: sql.ConnectionPool,
  input: OperatorOwnerRevocation,
  hmacSecret: string,
): Promise<{ revoked: true }> {
  if (!input || typeof input !== "object" ||
      !GUID_ID.test(input.approvalId) ||
      !OPERATOR.test(input.operatorId) ||
      !["MAIL_FAILED", "REISSUE", "OPERATOR_REVOKE"].includes(input.reasonCode)) {
    throw new Error("Invalid operator revocation details");
  }
  const secret=loadVerificationSecret(hmacSecret);
  const normalizedEmail=normalizeVerificationEmail(input.email);
  const emailHash=verificationEmailDigest(normalizedEmail,secret);
  const operatorHash=createHmac("sha256",secret)
    .update("drvo-erp:k5d:operator-id\\0" + input.operatorId.toLowerCase())
    .digest("hex");

  const tx=new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    // The explicit ApprovalId AND email binding is a second operator
    // confirmation. No API account can invoke this internal function.
    const r=await tx.request()
      .input("approvalId",sql.UniqueIdentifier,input.approvalId)
      .input("emailHash",sql.Char(64),emailHash)
      .query(`
        SELECT ApprovedAtUtc AS approvedAt
        FROM core.OwnerBootstrapApproval WITH (UPDLOCK,HOLDLOCK)
        WHERE ApprovalId=@approvalId AND ApprovedEmailHash=@emailHash
          AND RevokedAtUtc IS NULL AND ConsumedAtUtc IS NULL
      `);
    if (r.recordset.length !== 1) throw new Error("Approval cannot be revoked");
    const approvedAt=r.recordset[0].approvedAt as Date;
    await tx.request()
      .input("approvalId",sql.UniqueIdentifier,input.approvalId)
      .input("emailHash",sql.Char(64),emailHash)
      .input("approvedAt",sql.DateTime2(3),approvedAt)
      .input("operatorHash",sql.Char(64),operatorHash)
      .input("reason",sql.VarChar(24),input.reasonCode)
      .query(`
        UPDATE core.OwnerBootstrapApproval
          SET RevokedAtUtc=SYSUTCDATETIME()
          WHERE ApprovalId=@approvalId AND ApprovedEmailHash=@emailHash
            AND RevokedAtUtc IS NULL AND ConsumedAtUtc IS NULL;
        IF @@ROWCOUNT<>1 THROW 51170,'Approval already used or revoked',1;

        UPDATE core.EmailVerificationChallenge
          SET ConsumedAtUtc=SYSUTCDATETIME()
          WHERE EmailHash=@emailHash AND Purpose='OWNER_BOOTSTRAP'
            AND CreatedAtUtc>=@approvedAt AND ConsumedAtUtc IS NULL;

        INSERT INTO core.OwnerApprovalRevocationAudit
          (ApprovalId,OperatorHash,ReasonCode)
          VALUES(@approvalId,@operatorHash,@reason);
        INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
          VALUES(NULL,NULL,'owner.approval.revoked');
      `);
    await tx.commit();
    return {revoked:true};
  } catch(error) {
    await tx.rollback().catch(()=>{});
    throw error;
  }
}

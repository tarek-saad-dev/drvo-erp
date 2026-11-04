import {
  Injectable, ServiceUnavailableException, UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import * as sql from "mssql";
import { FoundationDatabaseService } from "../data/foundation-database.service";
import type { Actor } from "./identity.service";
import {
  generateOpaqueVerificationToken, loadVerificationSecret,
  normalizeVerificationEmail, verificationEmailDigest, verificationTokenDigest,
} from "./verification-crypto";
import { hashNewPassword } from "./password";
import { VerificationMailer } from "./verification-mailer";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME = /^[a-zA-Z0-9._-]{3,80}$/;
const SESSION = /^[a-zA-Z0-9_-]{43}$/;

function invalidInvite(): never {
  throw new UnauthorizedException("Invitation invalid or expired");
}

export type BranchInvitationNotice = {
  purpose: "ACCOUNT_INVITE";
  email: string;
  token: string;
  challengeId: string;
};

/**
 * SQL is the final authorization authority. It revalidates current session,
 * issuer rights, branch membership and requested-role subset inside one
 * SERIALIZABLE transaction before inserting the pending invitation.
 */
export async function persistScopedBranchInvitation(
  pool: sql.ConnectionPool,
  actor: Actor,
  sessionToken: string,
  businessId: string, branchId: string,
  invitedEmail: unknown, requestedRoleId: string,
  verificationKey: string | undefined,
): Promise<BranchInvitationNotice> {
  if (actor.mustChangePassword || !GUID.test(businessId) ||
      !GUID.test(branchId) || !GUID.test(requestedRoleId) ||
      !SESSION.test(sessionToken)) invalidInvite();
  let email: string, emailHash: string, tokenHash: string;
  const token=generateOpaqueVerificationToken();
  try {
    const secret=loadVerificationSecret(verificationKey);
    email=normalizeVerificationEmail(invitedEmail);
    emailHash=verificationEmailDigest(email,secret);
    tokenHash=verificationTokenDigest(token,"ACCOUNT_INVITE",secret);
  } catch { invalidInvite(); }
  const challengeId=randomUUID();
  const sessionHash=createHash("sha256").update(sessionToken).digest("hex");
  try {
    await pool.request()
      .input("TenantId",sql.UniqueIdentifier,actor.tenantId)
      .input("BusinessId",sql.UniqueIdentifier,businessId)
      .input("BranchId",sql.UniqueIdentifier,branchId)
      .input("IssuerAccountId",sql.UniqueIdentifier,actor.accountId)
      .input("IssuerSessionVersion",sql.Int,actor.sessionVersion)
      .input("IssuerSessionTokenHash",sql.Char(64),sessionHash)
      .input("InvitationId",sql.UniqueIdentifier,challengeId)
      .input("IntendedRoleId",sql.UniqueIdentifier,requestedRoleId)
      .input("InvitedEmailHash",sql.Char(64),emailHash)
      .input("TokenHash",sql.Char(64),tokenHash)
      .execute("core.IssueBranchInvitation");
    return {purpose:"ACCOUNT_INVITE",email,token,challengeId};
  } catch {
    invalidInvite();
  }
}

export async function acceptScopedBranchInvitation(
  pool: sql.ConnectionPool,
  input: {email: unknown; token: unknown; username: unknown; newPassword: unknown},
  env: NodeJS.ProcessEnv=process.env,
): Promise<{verified:true}> {
  if (env.DRVO_K5_AUTH_ENABLED!=="YES" ||
      env.DRVO_K5_INVITATIONS_ENABLED!=="YES" ||
      env.DRVO_K5_VERIFY_API_ENABLED!=="YES") {
    throw new ServiceUnavailableException("Invitation verification not enabled");
  }
  if (typeof input.username!=="string" || !USERNAME.test(input.username)) invalidInvite();
  let emailHash:string,tokenHash:string;
  try {
    const secret=loadVerificationSecret(env.DRVO_K5_VERIFICATION_HMAC_KEY);
    emailHash=verificationEmailDigest(input.email,secret);
    tokenHash=verificationTokenDigest(input.token,"ACCOUNT_INVITE",secret);
  } catch { invalidInvite(); }
  let password:Awaited<ReturnType<typeof hashNewPassword>>;
  try {password=await hashNewPassword(input.newPassword as string);}
  catch {invalidInvite();}
  try {
    await pool.request()
      .input("InvitedEmailHash",sql.Char(64),emailHash)
      .input("TokenHash",sql.Char(64),tokenHash)
      .input("Username",sql.NVarChar(80),input.username.toLowerCase())
      .input("NewAccountId",sql.UniqueIdentifier,randomUUID())
      .input("Salt",sql.VarBinary(32),password.salt)
      .input("PasswordHash",sql.VarBinary(64),password.passwordHash)
      .execute("core.AcceptBranchInvitation");
    return {verified:true};
  } catch {invalidInvite();}
}


export type InvitationMetadata = {
  invitationId:string;
  roleId:string;
  roleCode:string;
  issuedAtUtc:Date;
  expiresAtUtc:Date;
  status:"PENDING"|"EXPIRED"|"REVOKED"|"ACCEPTED";
};

function scopedSession(actor:Actor,token:string,businessId:string,branchId:string):string {
  if (actor.mustChangePassword || !GUID.test(actor.tenantId) ||
      !GUID.test(actor.accountId) || !GUID.test(businessId) ||
      !GUID.test(branchId) || !SESSION.test(token)) invalidInvite();
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class BranchInvitationService {
  constructor(private readonly database:FoundationDatabaseService) {}

  async issue(
    actor:Actor,sessionToken:string,businessId:string,branchId:string,
    email:unknown,roleId:string,
  ):Promise<{accepted:true}> {
    if (process.env.DRVO_K5_INVITATIONS_ENABLED!=="YES" ||
        process.env.DRVO_K5_AUTH_ENABLED!=="YES" ||
        process.env.DRVO_K5_MAIL_ENABLED!=="YES") {
      throw new ServiceUnavailableException("Invitations are not enabled");
    }
    const notice=await persistScopedBranchInvitation(
      this.database.getInternalPool(),actor,sessionToken,businessId,branchId,
      email,roleId,process.env.DRVO_K5_VERIFICATION_HMAC_KEY);
    await new VerificationMailer().send(notice);
    return {accepted:true};
  }

  private invitationPool():sql.ConnectionPool {
    if (process.env.DRVO_K5_INVITATIONS_ENABLED!=="YES" ||
        process.env.DRVO_K5_AUTH_ENABLED!=="YES") {
      throw new ServiceUnavailableException("Invitations are not enabled");
    }
    return this.database.getInternalPool();
  }

  async list(actor:Actor,sessionToken:string,businessId:string,branchId:string):
    Promise<{invitations:InvitationMetadata[]}> {
    const pool=this.invitationPool();
    const sessionHash=scopedSession(actor,sessionToken,businessId,branchId);
    try {
      const result=await pool.request()
        .input("TenantId",sql.UniqueIdentifier,actor.tenantId)
        .input("BusinessId",sql.UniqueIdentifier,businessId)
        .input("BranchId",sql.UniqueIdentifier,branchId)
        .input("ActorAccountId",sql.UniqueIdentifier,actor.accountId)
        .input("SessionVersion",sql.Int,actor.sessionVersion)
        .input("SessionTokenHash",sql.Char(64),sessionHash)
        .execute("core.ListBranchInvitations");
      return {invitations:result.recordset as InvitationMetadata[]};
    } catch {invalidInvite();}
  }

  async revoke(actor:Actor,sessionToken:string,businessId:string,branchId:string,
    invitationId:string):Promise<{revoked:true}> {
    const pool=this.invitationPool();
    const sessionHash=scopedSession(actor,sessionToken,businessId,branchId);
    if (!GUID.test(invitationId)) invalidInvite();
    try {
      await pool.request()
        .input("TenantId",sql.UniqueIdentifier,actor.tenantId)
        .input("BusinessId",sql.UniqueIdentifier,businessId)
        .input("BranchId",sql.UniqueIdentifier,branchId)
        .input("ActorAccountId",sql.UniqueIdentifier,actor.accountId)
        .input("SessionVersion",sql.Int,actor.sessionVersion)
        .input("SessionTokenHash",sql.Char(64),sessionHash)
        .input("InvitationId",sql.UniqueIdentifier,invitationId)
        .execute("core.RevokeBranchInvitation");
      return {revoked:true};
    } catch {invalidInvite();}
  }

  async accept(input:{
    email:unknown;token:unknown;username:unknown;newPassword:unknown;
  }):Promise<{verified:true}> {
    return acceptScopedBranchInvitation(this.database.getInternalPool(),input);
  }
}

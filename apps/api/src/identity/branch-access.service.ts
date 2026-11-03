import {
  BadRequestException, Injectable, NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import * as sql from "mssql";
import { FoundationDatabaseService } from "../data/foundation-database.service";
import type { Actor } from "./identity.service";
import { IdentityService } from "./identity.service";

const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
// Deliberately fixed role vocabulary. No Owner grant, role creation, arbitrary
// action code or account activation endpoint in the K5B delegated API.
const DELEGABLE_ROLES = ["MANAGER", "STAFF", "VIEWER"] as const;

export type RoleView = {
  roleId: string;
  roleCode: string;
  displayName: string;
  actions: string[];
};
export type MemberView = {
  accountId: string;
  username: string;
  roleId: string | null;
  roleCode: string | null;
};

function validGuid(input: string): string {
  if (!GUID.test(input)) throw new BadRequestException("Invalid identifier");
  return input;
}

@Injectable()
export class BranchAccessService {
  constructor(
    private readonly identity: IdentityService,
    private readonly database: FoundationDatabaseService,
  ) {}

  private pool(): sql.ConnectionPool {
    if (process.env.DRVO_K5_AUTH_ENABLED !== "YES" ||
        process.env.DRVO_K5_ROLE_ADMIN_ENABLED !== "YES") {
      throw new ServiceUnavailableException("Role administration is not enabled");
    }
    return this.database.getInternalPool();
  }

  async listRoles(actor: Actor, businessId: string, branchId: string): Promise<RoleView[]> {
    const pool = this.pool();
    validGuid(businessId);
    validGuid(branchId);
    await this.identity.readAuthorizedBranch(actor, businessId, branchId, "users.read");
    const result = await pool.request()
      .input("t", sql.UniqueIdentifier, actor.tenantId)
      .input("b", sql.UniqueIdentifier, businessId)
      .query(`
        SELECT CONVERT(VARCHAR(36),r.RoleId) AS roleId,
          r.RoleCode AS roleCode, r.DisplayName AS displayName,
          p.ActionCode AS actionCode
        FROM core.BusinessRole r
        LEFT JOIN core.RolePermission p ON p.TenantId=r.TenantId
          AND p.BusinessId=r.BusinessId AND p.RoleId=r.RoleId
        WHERE r.TenantId=@t AND r.BusinessId=@b AND r.IsActive=1
        ORDER BY r.RoleCode,p.ActionCode
      `);
    const roles = new Map<string, RoleView>();
    for (const row of result.recordset) {
      let entry = roles.get(row.roleId);
      if (!entry) {
        entry = {
          roleId: row.roleId as string,
          roleCode: row.roleCode as string,
          displayName: row.displayName as string,
          actions: [],
        };
        roles.set(row.roleId, entry);
      }
      if (row.actionCode != null) entry.actions.push(row.actionCode as string);
    }
    return [...roles.values()];
  }

  async listMembers(actor: Actor, businessId: string, branchId: string): Promise<MemberView[]> {
    const pool = this.pool();
    validGuid(businessId);
    validGuid(branchId);
    await this.identity.readAuthorizedBranch(actor, businessId, branchId, "users.read");
    const r = await pool.request()
      .input("t", sql.UniqueIdentifier, actor.tenantId)
      .input("b", sql.UniqueIdentifier, businessId)
      .input("br", sql.UniqueIdentifier, branchId)
      .query(`
        SELECT CONVERT(VARCHAR(36),a.AccountId) AS accountId,
          a.Username AS username,
          CONVERT(VARCHAR(36),ro.RoleId) AS roleId,
          ro.RoleCode AS roleCode
        FROM core.BranchAssignment ba
        JOIN core.BusinessMembership bm ON bm.TenantId=ba.TenantId
          AND bm.BusinessId=ba.BusinessId AND bm.AccountId=ba.AccountId AND bm.IsActive=1
        JOIN core.Account a ON a.TenantId=ba.TenantId AND a.AccountId=ba.AccountId
          AND a.IsActive=1
        LEFT JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId
          AND ar.BusinessId=ba.BusinessId AND ar.BranchId=ba.BranchId
          AND ar.AccountId=ba.AccountId AND ar.IsActive=1
        LEFT JOIN core.BusinessRole ro ON ro.TenantId=ar.TenantId
          AND ro.BusinessId=ar.BusinessId AND ro.RoleId=ar.RoleId AND ro.IsActive=1
        WHERE ba.TenantId=@t AND ba.BusinessId=@b AND ba.BranchId=@br
          AND ba.IsActive=1
        ORDER BY a.Username
      `);
    return r.recordset as MemberView[];
  }

  async assignExistingMemberRole(
    actor: Actor,
    businessId: string,
    branchId: string,
    targetAccountId: string,
    requestedRoleId: string,
  ): Promise<{ ok: true; changeId: string | null; changed: boolean }> {
    const pool = this.pool();
    validGuid(businessId);
    validGuid(branchId);
    validGuid(targetAccountId);
    validGuid(requestedRoleId);
    if (actor.mustChangePassword || actor.accountId.toLowerCase() === targetAccountId.toLowerCase()) {
      throw new NotFoundException();
    }

    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      // The actor MUST currently hold an active role with the exact
      // users.assign_role action in the requested Business and Branch.
      // Re-check under transaction locks, not an earlier controller claim.
      const actorResult = await tx.request()
        .input("t", sql.UniqueIdentifier, actor.tenantId)
        .input("b", sql.UniqueIdentifier, businessId)
        .input("br", sql.UniqueIdentifier, branchId)
        .input("actor", sql.UniqueIdentifier, actor.accountId)
        .input("version", sql.Int, actor.sessionVersion)
        .query(`
          SELECT TOP(1) ar.RoleId AS actorRole
          FROM core.Account a WITH (UPDLOCK,HOLDLOCK)
          JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId
            AND cr.AccountId=a.AccountId AND cr.MustChangePassword=0
          JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
          JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
            AND bm.AccountId=a.AccountId AND bm.IsActive=1
          JOIN core.Business b ON b.TenantId=bm.TenantId
            AND b.BusinessId=bm.BusinessId AND b.IsActive=1
          JOIN core.BranchAssignment ba ON ba.TenantId=b.TenantId
            AND ba.BusinessId=b.BusinessId AND ba.AccountId=a.AccountId
            AND ba.IsActive=1
          JOIN core.Branch br ON br.TenantId=ba.TenantId
            AND br.BusinessId=ba.BusinessId AND br.BranchId=ba.BranchId AND br.IsActive=1
          JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId
            AND ar.BusinessId=ba.BusinessId AND ar.BranchId=ba.BranchId
            AND ar.AccountId=ba.AccountId AND ar.IsActive=1
          JOIN core.BusinessRole ro ON ro.TenantId=ar.TenantId
            AND ro.BusinessId=ar.BusinessId AND ro.RoleId=ar.RoleId AND ro.IsActive=1
          JOIN core.RolePermission p ON p.TenantId=ro.TenantId
            AND p.BusinessId=ro.BusinessId AND p.RoleId=ro.RoleId
            AND p.ActionCode='users.assign_role'
          WHERE a.TenantId=@t AND a.AccountId=@actor AND a.IsActive=1
            AND a.SessionVersion=@version AND b.BusinessId=@b AND br.BranchId=@br
        `);
      if (actorResult.recordset.length !== 1) throw new NotFoundException();
      const actorRole = actorResult.recordset[0].actorRole as string;

      // Only known non-owner role codes are delegable. A Manager cannot
      // create an Owner or invent a custom role with privileged actions.
      const candidate = await tx.request()
        .input("t", sql.UniqueIdentifier, actor.tenantId)
        .input("b", sql.UniqueIdentifier, businessId)
        .input("role", sql.UniqueIdentifier, requestedRoleId)
        .input("actorRole", sql.UniqueIdentifier, actorRole)
        .query(`
          SELECT TOP(1) ro.RoleCode AS code
          FROM core.BusinessRole ro WITH (HOLDLOCK)
          WHERE ro.TenantId=@t AND ro.BusinessId=@b AND ro.RoleId=@role
            AND ro.IsActive=1 AND ro.RoleCode IN (N'MANAGER',N'STAFF',N'VIEWER')
            AND NOT EXISTS (
              SELECT 1 FROM core.RolePermission requested
              WHERE requested.TenantId=@t AND requested.BusinessId=@b
                AND requested.RoleId=@role
                AND NOT EXISTS (
                  SELECT 1 FROM core.RolePermission held
                  WHERE held.TenantId=@t AND held.BusinessId=@b
                    AND held.RoleId=@actorRole AND held.ActionCode=requested.ActionCode
                )
            )
        `);
      if (candidate.recordset.length !== 1 ||
          !DELEGABLE_ROLES.includes(candidate.recordset[0].code)) {
        throw new NotFoundException();
      }

      // The target account must ALREADY be active and explicitly assigned to
      // the exact tenant, business and branch. This API never creates users.
      const target = await tx.request()
        .input("t", sql.UniqueIdentifier, actor.tenantId)
        .input("b", sql.UniqueIdentifier, businessId)
        .input("br", sql.UniqueIdentifier, branchId)
        .input("target", sql.UniqueIdentifier, targetAccountId)
        .query(`
          SELECT TOP(1) CONVERT(VARCHAR(36),ar.RoleId) AS oldRole,
            oldRole.RoleCode AS oldCode
          FROM core.Account a WITH (UPDLOCK,HOLDLOCK)
          JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
            AND bm.AccountId=a.AccountId AND bm.IsActive=1
          JOIN core.BranchAssignment ba ON ba.TenantId=bm.TenantId
            AND ba.BusinessId=bm.BusinessId AND ba.AccountId=bm.AccountId
            AND ba.IsActive=1
          JOIN core.Branch br ON br.TenantId=ba.TenantId
            AND br.BusinessId=ba.BusinessId AND br.BranchId=ba.BranchId AND br.IsActive=1
          LEFT JOIN core.BranchRole ar WITH (UPDLOCK,HOLDLOCK)
            ON ar.TenantId=ba.TenantId AND ar.BusinessId=ba.BusinessId
            AND ar.BranchId=ba.BranchId AND ar.AccountId=ba.AccountId
          LEFT JOIN core.BusinessRole oldRole ON oldRole.TenantId=ar.TenantId
            AND oldRole.BusinessId=ar.BusinessId AND oldRole.RoleId=ar.RoleId
          WHERE a.TenantId=@t AND a.AccountId=@target AND a.IsActive=1
            AND bm.BusinessId=@b AND br.BranchId=@br
        `);
      if (target.recordset.length !== 1) throw new NotFoundException();
      const previous = target.recordset[0].oldRole as string | null;
      // Never let a delegated Manager demote or replace any Owner, including
      // a disabled Owner role. Such changes require separately approved flow.
      if (String(target.recordset[0].oldCode ?? "").toUpperCase() === "OWNER") {
        throw new NotFoundException();
      }
      if (previous?.toLowerCase() === requestedRoleId.toLowerCase()) {
        await tx.commit();
        return { ok: true, changeId: null, changed: false };
      }
      if (previous) {
        await tx.request()
          .input("t", sql.UniqueIdentifier, actor.tenantId)
          .input("b", sql.UniqueIdentifier, businessId)
          .input("br", sql.UniqueIdentifier, branchId)
          .input("target", sql.UniqueIdentifier, targetAccountId)
          .input("role", sql.UniqueIdentifier, requestedRoleId)
          .query(`
            UPDATE core.BranchRole SET RoleId=@role, IsActive=1
            WHERE TenantId=@t AND BusinessId=@b AND BranchId=@br AND AccountId=@target
          `);
      } else {
        await tx.request()
          .input("t", sql.UniqueIdentifier, actor.tenantId)
          .input("b", sql.UniqueIdentifier, businessId)
          .input("br", sql.UniqueIdentifier, branchId)
          .input("target", sql.UniqueIdentifier, targetAccountId)
          .input("role", sql.UniqueIdentifier, requestedRoleId)
          .query(`
            INSERT INTO core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId)
            VALUES(@t,@b,@br,@target,@role)
          `);
      }
      const change = randomUUID();
      // An atomic security audit and immediate target session revocation are
      // mandatory for each role change (no stale elevated permissions).
      await tx.request()
        .input("t", sql.UniqueIdentifier, actor.tenantId)
        .input("b", sql.UniqueIdentifier, businessId)
        .input("br", sql.UniqueIdentifier, branchId)
        .input("actor", sql.UniqueIdentifier, actor.accountId)
        .input("target", sql.UniqueIdentifier, targetAccountId)
        .input("old", sql.UniqueIdentifier, previous)
        .input("role", sql.UniqueIdentifier, requestedRoleId)
        .query(`
          INSERT INTO core.BranchRoleChangeAudit
            (TenantId,BusinessId,BranchId,ActorAccountId,TargetAccountId,OldRoleId,NewRoleId)
          VALUES (@t,@b,@br,@actor,@target,@old,@role);
          UPDATE core.Account SET SessionVersion=SessionVersion+1
          WHERE TenantId=@t AND AccountId=@target;
          UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()
          WHERE TenantId=@t AND AccountId=@target AND RevokedAtUtc IS NULL;
        `);
      await tx.commit();
      return { ok: true, changeId: change, changed: true };
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  }
}

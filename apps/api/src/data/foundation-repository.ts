import * as sql from "mssql";

/**
 * K4 structural reads. NOT a complete authorization service.
 * The actor must come from K5 server-side verified credentials.
 * Never expose these operations to HTTP until Role/Action checks are integrated.
 */
export interface VerifiedActorRef {
  readonly accountId: string;
  readonly sessionVersion: number;
}

export interface AssignedBranch {
  readonly tenantId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly branchName: string;
}

const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class FoundationRepository {
  constructor(private readonly pool: sql.ConnectionPool) {}

  /**
   * Structural assignment eligibility only. Branch Role/Permission evaluation
   * belongs to K5 and must be checked separately before protected resource access.
   * Tenant is derived only from the stored Account row, never client-supplied IDs.
   */
  async listActiveAssignedBranches(
    actor: VerifiedActorRef,
    requestedBusinessId: string,
  ): Promise<AssignedBranch[]> {
    if (!uuid.test(actor.accountId) ||
        !uuid.test(requestedBusinessId) ||
        !Number.isSafeInteger(actor.sessionVersion) ||
        actor.sessionVersion < 1) return [];

    const result = await this.pool.request()
      .input("accountId", sql.UniqueIdentifier, actor.accountId)
      .input("sessionVersion", sql.Int, actor.sessionVersion)
      .input("businessId", sql.UniqueIdentifier, requestedBusinessId)
      .query(`
        SELECT
          CONVERT(VARCHAR(36), b.TenantId) AS tenantId,
          CONVERT(VARCHAR(36), b.BusinessId) AS businessId,
          CONVERT(VARCHAR(36), br.BranchId) AS branchId,
          br.DisplayName AS branchName
        FROM core.Account a
        INNER JOIN core.Tenant t
          ON t.TenantId = a.TenantId AND t.IsActive = 1
        INNER JOIN core.BusinessMembership bm
          ON bm.TenantId = a.TenantId
          AND bm.AccountId = a.AccountId
          AND bm.IsActive = 1
        INNER JOIN core.Business b
          ON b.TenantId = bm.TenantId
          AND b.BusinessId = bm.BusinessId
          AND b.IsActive = 1
        INNER JOIN core.BranchAssignment ba
          ON ba.TenantId = bm.TenantId
          AND ba.BusinessId = bm.BusinessId
          AND ba.AccountId = bm.AccountId
          AND ba.IsActive = 1
        INNER JOIN core.Branch br
          ON br.TenantId = ba.TenantId
          AND br.BusinessId = ba.BusinessId
          AND br.BranchId = ba.BranchId
          AND br.IsActive = 1
        WHERE a.AccountId = @accountId
          AND a.SessionVersion = @sessionVersion
          AND a.IsActive = 1
          AND b.BusinessId = @businessId
        ORDER BY br.DisplayName, br.BranchId
      `);
    return result.recordset as AssignedBranch[];
  }
}

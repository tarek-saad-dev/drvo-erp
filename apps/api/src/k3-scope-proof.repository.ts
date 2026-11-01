import { Injectable, OnModuleDestroy, ServiceUnavailableException } from "@nestjs/common";
import * as sql from "mssql";
import type { K3ActorProof } from "./k3-proof.guard";

export interface K3AuthorizedBranch {
  readonly tenantId: string;
  readonly businessId: string;
  readonly branchId: string;
  readonly branchName: string;
}

const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Injectable()
export class K3ScopeProofRepository implements OnModuleDestroy {
  private pendingPool: Promise<sql.ConnectionPool> | undefined;

  private getPool(): Promise<sql.ConnectionPool> {
    if (process.env.NODE_ENV === "production" ||
        process.env.DRVO_K3_PROOF_ONLY !== "YES" ||
        process.env.DRVO_K3_SQL_DATABASE !== "DrvoK3Proof" ||
        process.env.DRVO_K3_SQL_HOST !== "127.0.0.1" ||
        !process.env.DRVO_K3_SQL_PASSWORD ||
        !process.env.DRVO_K3_SQL_USER) {
      throw new ServiceUnavailableException("K3 proof database disabled");
    }
    const port = Number(process.env.DRVO_K3_SQL_PORT);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new ServiceUnavailableException("K3 proof database port invalid");
    }
    if (!this.pendingPool) {
      const pool = new sql.ConnectionPool({
        server: "127.0.0.1",
        database: "DrvoK3Proof",
        port,
        user: process.env.DRVO_K3_SQL_USER,
        password: process.env.DRVO_K3_SQL_PASSWORD,
        options: { encrypt: false, trustServerCertificate: true },
        pool: { min: 0, max: 3 },
        connectionTimeout: 3000,
        requestTimeout: 5000,
      });
      this.pendingPool = pool.connect().catch((err: unknown) => {
        this.pendingPool = undefined;
        throw err;
      });
    }
    return this.pendingPool!;
  }

  async readBranch(actor: K3ActorProof, businessId: string, branchId: string): Promise<K3AuthorizedBranch | null> {
    if (!uuid.test(actor.accountId) || !uuid.test(businessId) || !uuid.test(branchId)) return null;
    const pool = await this.getPool();
    const result = await pool.request()
      .input("account", sql.UniqueIdentifier, actor.accountId)
      .input("session", sql.Int, actor.sessionVersion)
      .input("business", sql.UniqueIdentifier, businessId)
      .input("branch", sql.UniqueIdentifier, branchId)
      .query(`
        SELECT TOP 1
          CONVERT(VARCHAR(36), br.TenantId) AS tenantId,
          CONVERT(VARCHAR(36), br.BusinessId) AS businessId,
          CONVERT(VARCHAR(36), br.BranchId) AS branchId,
          br.DisplayName AS branchName
        FROM dbo.K3_Branches br
        INNER JOIN dbo.K3_Accounts a
          ON a.TenantId = br.TenantId
          AND a.AccountId = @account
          AND a.SessionVersion = @session
          AND a.IsActive = 1
        INNER JOIN dbo.K3_BusinessMemberships bm
          ON bm.TenantId = br.TenantId
          AND bm.BusinessId = br.BusinessId
          AND bm.AccountId = a.AccountId
          AND bm.IsActive = 1
        INNER JOIN dbo.K3_BranchRoles r
          ON r.TenantId = br.TenantId
          AND r.BusinessId = br.BusinessId
          AND r.BranchId = br.BranchId
          AND r.AccountId = a.AccountId
          AND r.IsActive = 1
        INNER JOIN dbo.K3_RolePermissions rp
          ON rp.RoleCode = r.RoleCode AND rp.ActionCode = N'branch.read'
        WHERE br.BusinessId = @business AND br.BranchId = @branch
      `);
    return result.recordset.length ? result.recordset[0] as K3AuthorizedBranch : null;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pendingPool) {
      const pool = await this.pendingPool.catch(() => undefined);
      if (pool) await pool.close();
    }
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import * as sql from "mssql";
import { connectFoundationDatabase } from "./foundation-connection";

/**
 * Opt-in DRVO_ERP_STAGING data plane. Default is OFF; no remote or foreign DB.
 * No HTTP resource endpoints or business data access are enabled in K4B.
 */
@Injectable()
export class FoundationDatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: sql.ConnectionPool | undefined;
  private readonly enabled = process.env.DRVO_SQL_ENABLED === "YES";

  async onModuleInit(): Promise<void> {
    if (!this.enabled) return;
    let connected: sql.ConnectionPool | undefined;
    try {
      connected = await connectFoundationDatabase(process.env);
      await this.verifySchema(connected);
      this.pool = connected;
    } catch {
      await connected?.close().catch(() => {});
      // Do not include mssql error details or credentials in public/API logs.
      throw new Error("DRVO ERP staging SQL not ready: check K4 migration and app grants");
    }
  }

  private async verifySchema(pool: sql.ConnectionPool): Promise<void> {
    const result = await pool.request()
      .input("name", sql.NVarChar(160), "001_platform_identity_foundation.sql")
      .query("SELECT COUNT_BIG(*) AS Applied FROM core.SchemaMigration WHERE MigrationId=@name");
    if (Number(result.recordset[0]?.Applied) !== 1) {
      throw new Error("K4 migration missing");
    }
  }

  /** Internal-only pool handle for audited server-side repository services. */
  getInternalPool(): sql.ConnectionPool {
    if (!this.pool) throw new ServiceUnavailableException("DRVO SQL is not ready");
    return this.pool;
  }

  /** Non-sensitive readiness signal, not a sign that user authentication is live. */
  async checkReadiness(): Promise<{ readonly status: "ok"; readonly service: "drvo-api"; readonly database: "ready" }> {
    if (!this.enabled || !this.pool) throw new ServiceUnavailableException("DRVO SQL is not ready");
    try {
      await this.pool.request().query("SELECT 1 AS Ready");
      return { status: "ok", service: "drvo-api", database: "ready" };
    } catch {
      throw new ServiceUnavailableException("DRVO SQL is not ready");
    }
  }

  async onModuleDestroy(): Promise<void> {
    const pool = this.pool;
    this.pool = undefined;
    await pool?.close();
  }
}

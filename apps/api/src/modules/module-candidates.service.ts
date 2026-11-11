import {
  Injectable, NotFoundException, ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import * as sql from "mssql";
import { FoundationDatabaseService } from "../data/foundation-database.service";
import type { Actor } from "../identity/identity.service";

const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export type BusinessModuleCandidate = {
  moduleKey: string;
  version: string;
  displayName: string;
};

/**
 * K6C read-only Business-scoped candidates. Not published/active/entitled.
 * Data is never accessed with a client-supplied Tenant or a direct table SELECT.
 * The SQL procedure re-verifies current session, membership and branch.read.
 */
@Injectable()
export class ModuleCandidatesService {
  constructor(private readonly database: FoundationDatabaseService) {}

  async read(
    actor: Actor,
    token: string,
    businessId: string,
    branchId: string,
  ): Promise<BusinessModuleCandidate[]> {
    if (process.env.DRVO_K5_AUTH_ENABLED !== "YES" ||
        process.env.DRVO_K6C_CATALOG_READ_ENABLED !== "YES") {
      throw new ServiceUnavailableException("Module candidates are not enabled");
    }
    if (actor.mustChangePassword ||
        !GUID.test(actor.tenantId) || !GUID.test(actor.accountId) ||
        !GUID.test(businessId) || !GUID.test(branchId) ||
        !Number.isSafeInteger(actor.sessionVersion) || actor.sessionVersion < 1 ||
        !TOKEN.test(token)) {
      throw new NotFoundException();
    }
    const tokenHash = createHash("sha256").update(token).digest("hex");
    try {
      const result = await this.database.getInternalPool().request()
        .input("TenantId", sql.UniqueIdentifier, actor.tenantId)
        .input("BusinessId", sql.UniqueIdentifier, businessId)
        .input("BranchId", sql.UniqueIdentifier, branchId)
        .input("AccountId", sql.UniqueIdentifier, actor.accountId)
        .input("SessionVersion", sql.Int, actor.sessionVersion)
        .input("TokenHash", sql.Char(64), tokenHash)
        .execute("core.ReadBusinessModuleCandidates");
      return result.recordset.map((row) => ({
        moduleKey: String(row.moduleKey),
        version: String(row.version),
        displayName: String(row.displayName),
      }));
    } catch (error) {
      // Neither SQL error text nor Business existence is exposed to clients.
      if (typeof error === "object" && error !== null &&
          "number" in error && error.number === 51091) {
        throw new NotFoundException();
      }
      throw new ServiceUnavailableException("Module candidate read unavailable");
    }
  }
}

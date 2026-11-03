import {
  Injectable, NotFoundException, ServiceUnavailableException,
  HttpException, UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as sql from "mssql";
import { FoundationDatabaseService } from "../data/foundation-database.service";
import { dummyPasswordCheck, hashNewPassword, verifyPassword } from "./password";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,80}$/;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTION_PATTERN = /^[a-z0-9._-]{3,90}$/;
const SESSION_TTL_HOURS = 12;
export const K5_COOKIE_NAME = "__Host-drvo-session";

export type Actor = {
  tenantId: string;
  accountId: string;
  username: string;
  sessionVersion: number;
  mustChangePassword: boolean;
};

export type AuthorizedBranch = {
  tenantId: string;
  businessId: string;
  branchId: string;
  branchName: string;
};

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function invalidCredential(): never {
  throw new UnauthorizedException("Invalid username or password");
}

export function extractSessionCookie(header: string | undefined): string | null {
  if (!header || header.length > 8192) return null;
  const matches = header.split(";").map((item) => item.trim())
    .filter((item) => item.startsWith(K5_COOKIE_NAME + "="));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(K5_COOKIE_NAME.length + 1);
  return /^[a-zA-Z0-9_-]{43}$/.test(token) ? token : null;
}

@Injectable()
export class IdentityService {
  constructor(private readonly database: FoundationDatabaseService) {}

  private pool(): sql.ConnectionPool {
    if (process.env.DRVO_K5_AUTH_ENABLED !== "YES") {
      throw new ServiceUnavailableException("Identity is not enabled");
    }
    return this.database.getInternalPool();
  }

  private async audit(pool: sql.ConnectionPool, event: string, actor?: Actor): Promise<void> {
    await pool.request()
      .input("tenantId", sql.UniqueIdentifier, actor?.tenantId ?? null)
      .input("accountId", sql.UniqueIdentifier, actor?.accountId ?? null)
      .input("event", sql.VarChar(60), event)
      .query("INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode) VALUES(@tenantId,@accountId,@event)");
  }

  private async isUsernameThrottled(pool: sql.ConnectionPool, nameHash: string): Promise<boolean> {
    const r = await pool.request().input("key", sql.Char(64), nameHash).query(`
      SELECT CASE WHEN FailedCount >= 8
         AND WindowStartedUtc >= DATEADD(MINUTE,-15,SYSUTCDATETIME())
      THEN 1 ELSE 0 END AS blocked
      FROM core.LoginThrottle WHERE ThrottleKey=@key
    `);
    return Number(r.recordset[0]?.blocked ?? 0) === 1;
  }

  private async recordFailedLogin(pool: sql.ConnectionPool, nameHash: string): Promise<void> {
    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      await tx.request().input("key", sql.Char(64), nameHash).query(`
        UPDATE core.LoginThrottle WITH (UPDLOCK,HOLDLOCK)
          SET FailedCount=CASE
              WHEN WindowStartedUtc < DATEADD(MINUTE,-15,SYSUTCDATETIME()) THEN 1
              ELSE FailedCount + 1 END,
            WindowStartedUtc=CASE
              WHEN WindowStartedUtc < DATEADD(MINUTE,-15,SYSUTCDATETIME())
                THEN SYSUTCDATETIME() ELSE WindowStartedUtc END
        WHERE ThrottleKey=@key;
        IF @@ROWCOUNT=0
          INSERT INTO core.LoginThrottle(ThrottleKey,WindowStartedUtc,FailedCount)
          VALUES(@key,SYSUTCDATETIME(),1);
      `);
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }

  async login(username: unknown, password: unknown):
    Promise<{ token: string; actor: Actor }> {
    const pool = this.pool();
    if (typeof username !== "string" || !USERNAME_PATTERN.test(username) ||
        typeof password !== "string" || password.length > 256) {
      await dummyPasswordCheck(password);
      invalidCredential();
    }
    const normalized = username.toLowerCase();
    const key = hash("k5-login-name:" + normalized);
    if (await this.isUsernameThrottled(pool, key)) {
      await dummyPasswordCheck(password);
      throw new HttpException("Please try again later", 429);
    }

    const r = await pool.request()
      .input("username", sql.NVarChar(80), normalized)
      .query(`
        SELECT TOP(1)
          CONVERT(VARCHAR(36),a.TenantId) AS tenantId,
          CONVERT(VARCHAR(36),a.AccountId) AS accountId,
          a.Username AS username, a.SessionVersion AS sessionVersion,
          c.Salt AS salt, c.PasswordHash AS passwordHash,
          c.PasswordAlgorithm AS algorithm,
          c.MustChangePassword AS mustChangePassword
        FROM core.Account a
        INNER JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
        INNER JOIN core.AccountCredential c
          ON c.TenantId=a.TenantId AND c.AccountId=a.AccountId
        WHERE a.Username=@username AND a.IsActive=1
      `);
    const row = r.recordset[0] as Record<string, unknown> | undefined;
    const valid = row ? await verifyPassword(password,
      row.salt as Buffer, row.passwordHash as Buffer, String(row.algorithm))
      : (await dummyPasswordCheck(password), false);
    if (!valid) {
      await this.recordFailedLogin(pool, key);
      invalidCredential();
    }
    const actor: Actor = {
      tenantId: String(row!.tenantId),
      accountId: String(row!.accountId),
      username: String(row!.username),
      sessionVersion: Number(row!.sessionVersion),
      mustChangePassword: Boolean(row!.mustChangePassword),
    };
    const token = randomBytes(32).toString("base64url");
    await pool.request()
      .input("sessionId", sql.UniqueIdentifier, randomUUID())
      .input("tenantId", sql.UniqueIdentifier, actor.tenantId)
      .input("accountId", sql.UniqueIdentifier, actor.accountId)
      .input("version", sql.Int, actor.sessionVersion)
      .input("tokenHash", sql.Char(64), hash(token))
      .input("expiresHours", sql.Int, SESSION_TTL_HOURS)
      .query(`
        INSERT INTO core.AuthSession(SessionId,TenantId,AccountId,SessionVersion,TokenHash,ExpiresAtUtc)
        VALUES(@sessionId,@tenantId,@accountId,@version,@tokenHash,
          DATEADD(HOUR,@expiresHours,SYSUTCDATETIME()))
      `);
    await this.audit(pool, "session.login", actor);
    return { token, actor };
  }

  async actorFromToken(token: string | null): Promise<Actor> {
    const pool = this.pool();
    if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) {
      throw new UnauthorizedException();
    }
    const result = await pool.request()
      .input("tokenHash", sql.Char(64), hash(token))
      .query(`
        SELECT TOP(1) CONVERT(VARCHAR(36),a.TenantId) AS tenantId,
          CONVERT(VARCHAR(36),a.AccountId) AS accountId,
          a.Username AS username, a.SessionVersion AS sessionVersion,
          c.MustChangePassword AS mustChangePassword
        FROM core.AuthSession s
        INNER JOIN core.Account a
          ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
          AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
        INNER JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
        INNER JOIN core.AccountCredential c
          ON c.TenantId=a.TenantId AND c.AccountId=a.AccountId
        WHERE s.TokenHash=@tokenHash
          AND s.ExpiresAtUtc>SYSUTCDATETIME() AND s.RevokedAtUtc IS NULL
      `);
    const row = result.recordset[0];
    if (!row) throw new UnauthorizedException();
    return {
      tenantId: row.tenantId as string,
      accountId: row.accountId as string,
      username: row.username as string,
      sessionVersion: Number(row.sessionVersion),
      mustChangePassword: Boolean(row.mustChangePassword),
    };
  }

  async logout(token: string | null): Promise<void> {
    const pool = this.pool();
    if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return;
    await pool.request().input("hash", sql.Char(64), hash(token)).query(`
      UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()
      WHERE TokenHash=@hash AND RevokedAtUtc IS NULL
    `);
  }

  async changePassword(token: string | null, oldPassword: unknown, newPassword: unknown): Promise<void> {
    const actor = await this.actorFromToken(token);
    const pool = this.pool();
    const credential = await pool.request()
      .input("t", sql.UniqueIdentifier, actor.tenantId)
      .input("a", sql.UniqueIdentifier, actor.accountId)
      .query(`SELECT Salt,PasswordHash,PasswordAlgorithm FROM core.AccountCredential
        WHERE TenantId=@t AND AccountId=@a`);
    const row = credential.recordset[0];
    if (!row || !await verifyPassword(oldPassword,row.Salt,row.PasswordHash,row.PasswordAlgorithm)) {
      throw new UnauthorizedException("Invalid current password");
    }
    const next = await hashNewPassword(newPassword as string);
    if (oldPassword === newPassword) throw new UnauthorizedException("Choose a different password");

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await tx.request()
        .input("t", sql.UniqueIdentifier, actor.tenantId)
        .input("a", sql.UniqueIdentifier, actor.accountId)
        .input("sv", sql.Int, actor.sessionVersion)
        .input("salt", sql.VarBinary(32), next.salt)
        .input("hash", sql.VarBinary(64), next.passwordHash)
        .query(`
          UPDATE a SET SessionVersion=SessionVersion+1
          FROM core.Account a WHERE a.TenantId=@t AND a.AccountId=@a AND a.SessionVersion=@sv;
          IF @@ROWCOUNT <> 1 THROW 51050,'Session changed during password reset',1;
          UPDATE core.AccountCredential
          SET Salt=@salt,PasswordHash=@hash,PasswordAlgorithm='scrypt-v1',
            MustChangePassword=0,PasswordChangedAtUtc=SYSUTCDATETIME()
          WHERE TenantId=@t AND AccountId=@a;
          UPDATE core.AuthSession SET RevokedAtUtc=SYSUTCDATETIME()
          WHERE TenantId=@t AND AccountId=@a AND RevokedAtUtc IS NULL;
          INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
          VALUES(@t,@a,'account.password_changed');
        `);
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }

  /**
   * Navigation is derived entirely from the currently active SQL memberships,
   * BranchRole and RolePermission. Client-supplied tenant/workspace IDs are
   * never trusted to discover the user's available workspaces.
   */
  async listAuthorizedWorkspaces(actor: Actor): Promise<Array<{
    tenantId: string;
    businessId: string;
    businessName: string;
    branchId: string;
    branchName: string;
  }>> {
    if (actor.mustChangePassword) throw new UnauthorizedException("Password change required");
    const pool = this.pool();
    const r = await pool.request()
      .input("t", sql.UniqueIdentifier, actor.tenantId)
      .input("a", sql.UniqueIdentifier, actor.accountId)
      .input("version", sql.Int, actor.sessionVersion)
      .query(`
        SELECT CONVERT(VARCHAR(36),b.TenantId) AS tenantId,
          CONVERT(VARCHAR(36),b.BusinessId) AS businessId,
          b.DisplayName AS businessName,
          CONVERT(VARCHAR(36),br.BranchId) AS branchId,
          br.DisplayName AS branchName
        FROM core.Account a
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
          AND p.ActionCode='branch.read'
        WHERE a.TenantId=@t AND a.AccountId=@a
          AND a.SessionVersion=@version AND a.IsActive=1
        ORDER BY b.DisplayName,br.DisplayName
      `);
    return r.recordset;
  }

  async readAuthorizedBranch(
    actor: Actor, businessId: string, branchId: string, action: string,
  ): Promise<AuthorizedBranch> {
    if (actor.mustChangePassword) throw new UnauthorizedException("Password change required");
    if (!GUID_PATTERN.test(businessId) || !GUID_PATTERN.test(branchId) ||
        !ACTION_PATTERN.test(action)) throw new NotFoundException();
    const pool = this.pool();
    const r = await pool.request()
      .input("tenantId", sql.UniqueIdentifier, actor.tenantId)
      .input("accountId", sql.UniqueIdentifier, actor.accountId)
      .input("sessionVersion", sql.Int, actor.sessionVersion)
      .input("businessId", sql.UniqueIdentifier, businessId)
      .input("branchId", sql.UniqueIdentifier, branchId)
      .input("action", sql.VarChar(90), action)
      .query(`
        SELECT TOP(1) CONVERT(VARCHAR(36),b.TenantId) AS tenantId,
          CONVERT(VARCHAR(36),b.BusinessId) AS businessId,
          CONVERT(VARCHAR(36),br.BranchId) AS branchId,
          br.DisplayName AS branchName
        FROM core.Account a
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
        JOIN core.RolePermission perm ON perm.TenantId=ro.TenantId
          AND perm.BusinessId=ro.BusinessId AND perm.RoleId=ro.RoleId AND perm.ActionCode=@action
        WHERE a.TenantId=@tenantId AND a.AccountId=@accountId
          AND a.SessionVersion=@sessionVersion AND a.IsActive=1
          AND b.BusinessId=@businessId AND br.BranchId=@branchId
      `);
    if (r.recordset.length === 0) throw new NotFoundException();
    return r.recordset[0] as AuthorizedBranch;
  }
}

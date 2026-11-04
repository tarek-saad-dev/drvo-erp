import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { IncomingMessage } from "node:http";
import { HttpException, ServiceUnavailableException } from "@nestjs/common";
import * as sql from "mssql";
import { loadVerificationSecret } from "./verification-crypto";

const WINDOW_MINUTES = 15;
// Bounded shared counters in SQL, not per-process memory (works across workers).
const MAX_PER_IP = 24;
const MAX_PER_EMAIL = 6;

function isLoopback(address: string): boolean {
  return address === "127.0.0.1" || address === "::1" ||
    address === "::ffff:127.0.0.1";
}

export function trustedClientAddress(
  req: Pick<IncomingMessage, "socket" | "headers">,
  env: NodeJS.ProcessEnv,
): string | null {
  const remote = req.socket.remoteAddress;
  if (!remote || isIP(remote) === 0) return null;

  if (env.DRVO_K5_TRUST_NGINX_REAL_IP === "YES") {
    // No spoofed forwarded addresses from a direct remote client: Nginx
    // MUST replace X-Real-IP and connect from loopback to the API.
    if (!isLoopback(remote)) return null;
    const forwarded = req.headers["x-real-ip"];
    if (typeof forwarded !== "string" || forwarded !== forwarded.trim() ||
        isIP(forwarded) === 0) return null;
    return forwarded;
  }
  return remote;
}

export function verificationThrottleKeys(
  address: string, email: string | null, secret: Buffer,
): Array<{ key: string; max: number }> {
  if (isIP(address) === 0) throw new Error("Invalid caller IP");
  if (!Buffer.isBuffer(secret) || secret.length !== 32) {
    throw new Error("Verification key invalid");
  }
  const digest = (domain: string, raw: string) => createHmac("sha256", secret)
    .update("drvo-erp:k5d:throttle:" + domain + "\0" + raw)
    .digest("hex");
  const entries = [{ key: digest("ip", address), max: MAX_PER_IP }];
  if (email) entries.push({ key: digest("email", email), max: MAX_PER_EMAIL });
  return entries.sort((a,b) => a.key.localeCompare(b.key));
}

export async function consumeVerificationAttempt(
  pool: sql.ConnectionPool,
  address: string | null, normalizedEmail: string | null,
  keySource: string | undefined,
): Promise<void> {
  if (!address) throw new ServiceUnavailableException("Verification unavailable");
  let counters: Array<{ key: string; max: number }>;
  try {
    const secret = loadVerificationSecret(keySource);
    counters = verificationThrottleKeys(address, normalizedEmail, secret);
  } catch {
    throw new ServiceUnavailableException("Verification unavailable");
  }
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    let blocked = false;
    for (const counter of counters) {
      const result = await tx.request()
        .input("key", sql.Char(64), counter.key)
        .query(`
          UPDATE core.LoginThrottle WITH (UPDLOCK,HOLDLOCK)
            SET FailedCount=CASE WHEN WindowStartedUtc<
                  DATEADD(MINUTE,-15,SYSUTCDATETIME()) THEN 1
                  ELSE FailedCount+1 END,
                WindowStartedUtc=CASE WHEN WindowStartedUtc<
                  DATEADD(MINUTE,-15,SYSUTCDATETIME()) THEN SYSUTCDATETIME()
                  ELSE WindowStartedUtc END
            WHERE ThrottleKey=@key;
          IF @@ROWCOUNT=0
            INSERT INTO core.LoginThrottle(ThrottleKey,WindowStartedUtc,FailedCount)
              VALUES(@key,SYSUTCDATETIME(),1);
          SELECT FailedCount AS attempts FROM core.LoginThrottle
            WHERE ThrottleKey=@key;
        `);
      if (Number(result.recordset[0]?.attempts ?? 999) > counter.max) blocked = true;
    }
    await tx.commit();
    if (blocked) throw new HttpException("Please try again later", 429);
  } catch (err) {
    await tx.rollback().catch(() => {});
    if (err instanceof HttpException && err.getStatus() === 429) throw err;
    throw new ServiceUnavailableException("Verification unavailable");
  }
}

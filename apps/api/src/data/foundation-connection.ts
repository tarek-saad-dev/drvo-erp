import * as sql from "mssql";

/**
 * K4 internal SQL Server connection builder (not registered in AppModule yet).
 * NEVER use Casher / legacy service database credentials; only exact
 * DRVO_ERP_STAGING on local VPS or the disposable CI database.
 */
export function foundationSqlConfig(env: NodeJS.ProcessEnv): sql.config {
  if (env.DRVO_SQL_ENABLED !== "YES" ||
      env.DRVO_SQL_HOST !== "127.0.0.1" ||
      env.DRVO_SQL_DATABASE !== "DRVO_ERP_STAGING" ||
      env.DRVO_SQL_PORT !== "1433" ||
      !env.DRVO_SQL_USER ||
      env.DRVO_SQL_USER === "sa" ||
      !env.DRVO_SQL_PASSWORD ||
      env.DRVO_SQL_PASSWORD.length < 12) {
    throw new Error("DRVO ERP SQL connection not explicitly configured");
  }
  return {
    server: "127.0.0.1",
    port: 1433,
    database: "DRVO_ERP_STAGING",
    user: env.DRVO_SQL_USER,
    password: env.DRVO_SQL_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true },
    pool: { min: 0, max: 4, idleTimeoutMillis: 30000 },
    connectionTimeout: 5000,
    requestTimeout: 10000,
  };
}

/**
 * Must be called explicitly by a trusted server-side service after role
 * authorization is integrated in K5. Do not call at module import time.
 */
export async function connectFoundationDatabase(env: NodeJS.ProcessEnv): Promise<sql.ConnectionPool> {
  const pool = new sql.ConnectionPool(foundationSqlConfig(env));
  try {
    await pool.connect();
    return pool;
  } catch (error) {
    await pool.close().catch(() => {});
    throw error;
  }
}
